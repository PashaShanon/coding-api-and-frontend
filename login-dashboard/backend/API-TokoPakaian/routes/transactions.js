const express = require('express');
const pool = require('../database/pool');
const { authenticateToken } = require('../middleware/auth');
const { requireAdminOrKasir } = require('../middleware/admin');
const router = express.Router();

router.get('/reports/summary', authenticateToken, requireAdminOrKasir, async (req, res) => {
  try {
    // Total Sales Today
    const today = new Date().toISOString().split('T')[0];
    const salesToday = await pool.query(
      `SELECT SUM(total_amount) as total, COUNT(*) as count 
       FROM transactions 
       WHERE DATE(created_at) = $1 AND status = 'completed'`,
      [today]
    );

    // Total Sales This Month
    const salesMonth = await pool.query(
      `SELECT SUM(total_amount) as total, COUNT(*) as count 
       FROM transactions 
       WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND status = 'completed'`
    );

    // Recent Transactions
    const recent = await pool.query(
      `SELECT t.transaction_code, t.total_amount, u.name as cashier, t.created_at 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       ORDER BY t.created_at DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        today: {
          total: parseFloat(salesToday.rows[0].total || 0),
          count: parseInt(salesToday.rows[0].count || 0)
        },
        month: {
          total: parseFloat(salesMonth.rows[0].total || 0),
          count: parseInt(salesMonth.rows[0].count || 0)
        },
        recent: recent.rows
      }
    });
  } catch (error) {
    console.error('Report summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/', authenticateToken, requireAdminOrKasir, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.transaction_code, t.total_amount, t.payment_method, t.status, t.created_at, t.updated_at, u.name as user_name 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       ORDER BY t.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
router.get('/:id', authenticateToken, requireAdminOrKasir, async (req, res) => {
  try {
    const { id } = req.params;

    const transactionResult = await pool.query(
      `SELECT t.id, t.transaction_code, t.total_amount, t.payment_method, t.status, t.created_at, t.updated_at, u.name as user_name 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       WHERE t.id = $1`,
      [id]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = transactionResult.rows[0];

    // Get transaction items
    const itemsResult = await pool.query(
      `SELECT ti.*, p.name as product_name 
       FROM transaction_items ti 
       LEFT JOIN products p ON ti.product_id = p.id 
       WHERE ti.transaction_id = $1`,
      [id]
    );

    transaction.items = itemsResult.rows;

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/code/:transaction_code', authenticateToken, requireAdminOrKasir, async (req, res) => {
  try {
    const { transaction_code } = req.params;

    // Validate transaction code format
    if (!transaction_code || !transaction_code.startsWith('TRX-')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction code format. Must start with TRX-'
      });
    }

    const transactionResult = await pool.query(
      `SELECT t.id, t.transaction_code, t.total_amount, t.payment_method, t.status, t.created_at, t.updated_at, u.name as user_name 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       WHERE t.transaction_code = $1`,
      [transaction_code]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = transactionResult.rows[0];

    // Get transaction items
    const itemsResult = await pool.query(
      `SELECT ti.*, p.name as product_name 
       FROM transaction_items ti 
       LEFT JOIN products p ON ti.product_id = p.id 
       WHERE ti.transaction_id = $1`,
      [transaction.id]
    );

    transaction.items = itemsResult.rows;

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Get transaction by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/', authenticateToken, requireAdminOrKasir, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { items, payment_method } = req.body;
    const user_id = req.user.id;

    // Generate transaction code
    const transactionCode = `TRX-${Date.now()}`;

    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const productResult = await client.query(
        'SELECT price, stock FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      if (productResult.rows[0].stock < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.product_id}`);
      }

      totalAmount += productResult.rows[0].price * item.quantity;
    }

    // Create transaction
    const transactionResult = await client.query(
      'INSERT INTO transactions (transaction_code, user_id, total_amount, payment_method) VALUES ($1, $2, $3, $4) RETURNING *',
      [transactionCode, user_id, totalAmount, payment_method]
    );

    const transactionId = transactionResult.rows[0].id;

    // Create transaction items and update product stock
    for (const item of items) {
      const productResult = await client.query(
        'SELECT price FROM products WHERE id = $1',
        [item.product_id]
      );

      const price = productResult.rows[0].price;
      const subtotal = price * item.quantity;

      await client.query(
        'INSERT INTO transaction_items (transaction_id, product_id, quantity, price, subtotal) VALUES ($1, $2, $3, $4, $5)',
        [transactionId, item.product_id, item.quantity, price, subtotal]
      );

      // Update product stock
      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        id: transactionId,
        transaction_code: transactionCode,
        total_amount: totalAmount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  } finally {
    client.release();
  }
});

router.put('/:id', authenticateToken, requireAdminOrKasir, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_method } = req.body;

    const result = await pool.query(
      'UPDATE transactions SET status = $1, payment_method = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, payment_method, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;