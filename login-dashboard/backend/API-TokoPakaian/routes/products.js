const express = require('express');
const pool = require('../database/pool');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category_id } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND p.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (category_id) {
      query += ` AND p.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }
    
    query += ` ORDER BY p.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM products p WHERE 1=1`;
    let countParams = [];
    paramIndex = 1;
    
    if (search) {
      countQuery += ` AND p.name ILIKE $${paramIndex}`;
      countParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (category_id) {
      countQuery += ` AND p.category_id = $${paramIndex}`;
      countParams.push(category_id);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: 'success',
      message: 'Products retrieved successfully',
      data: {
        products: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve products',
      code: 'FETCH_PRODUCTS_ERROR'
    });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID',
        code: 'INVALID_ID'
      });
    }

    const result = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      message: 'Product retrieved successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve product',
      code: 'FETCH_PRODUCT_ERROR'
    });
  }
});

// Validation helper for product input
function validateProductInput(name, description, price, stock, category_id) {
  const errors = [];
  
  if (!name || !name.trim()) {
    errors.push('Product name is required');
  } else if (name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long');
  }
  
  if (!description || !description.trim()) {
    errors.push('Product description is required');
  }
  
  if (price === undefined || price === null || price === '') {
    errors.push('Price is required');
  } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    errors.push('Price must be a valid positive number');
  }
  
  if (stock === undefined || stock === null || stock === '') {
    errors.push('Stock is required');
  } else if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
    errors.push('Stock must be a valid non-negative number');
  }
  
  if (!category_id) {
    errors.push('Category ID is required');
  } else if (isNaN(parseInt(category_id))) {
    errors.push('Category ID must be a valid number');
  }
  
  return errors;
}

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, stock, category_id, image } = req.body;

    // Validate input
    const validationErrors = validateProductInput(name, description, price, stock, category_id);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if category exists
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    const result = await pool.query(
      'INSERT INTO products (name, description, price, stock, category_id, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name.trim(), description.trim(), parseFloat(price), parseInt(stock), parseInt(category_id), image || null]
    );

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle duplicate name error
    if (error.code === '23505' && error.constraint === 'products_name_key') {
      return res.status(400).json({
        status: 'error',
        message: 'Product with this name already exists',
        code: 'DUPLICATE_PRODUCT_NAME'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create product',
      code: 'CREATE_PRODUCT_ERROR'
    });
  }
});

// Update product (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category_id, image } = req.body;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID',
        code: 'INVALID_ID'
      });
    }

    // Validate input
    const validationErrors = validateProductInput(name, description, price, stock, category_id);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if category exists
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    const result = await pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, category_id = $5, image = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [name.trim(), description.trim(), parseFloat(price), parseInt(stock), parseInt(category_id), image || null, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      message: 'Product updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update product error:', error);
    
    // Handle duplicate name error
    if (error.code === '23505' && error.constraint === 'products_name_key') {
      return res.status(400).json({
        status: 'error',
        message: 'Product with this name already exists',
        code: 'DUPLICATE_PRODUCT_NAME'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update product',
      code: 'UPDATE_PRODUCT_ERROR'
    });
  }
});

// Delete product (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID',
        code: 'INVALID_ID'
      });
    }

    // Check if product exists before deletion
    const existsResult = await pool.query(
      'SELECT id, name FROM products WHERE id = $1',
      [parseInt(id)]
    );

    if (existsResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    const productName = existsResult.rows[0].name;

    // Check if product is referenced in any transaction items
    const transactionCheck = await pool.query(
      'SELECT COUNT(*) FROM transaction_items WHERE product_id = $1',
      [parseInt(id)]
    );

    if (parseInt(transactionCheck.rows[0].count) > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete product that has been sold. Product exists in transaction history.',
        code: 'PRODUCT_IN_TRANSACTIONS'
      });
    }

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    res.json({
      status: 'success',
      message: `Product '${productName}' deleted successfully`,
      data: {
        deletedProduct: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Delete product error:', error);
    
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete product. It is referenced by other records.',
        code: 'FOREIGN_KEY_CONSTRAINT'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete product',
      code: 'DELETE_PRODUCT_ERROR'
    });
  }
});

module.exports = router;