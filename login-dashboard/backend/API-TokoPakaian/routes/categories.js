const express = require('express');
const pool = require('../database/pool');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories ORDER BY name'
    );

    res.json({
      status: 'success',
      message: 'Categories retrieved successfully',
      data: result.rows
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve categories',
      code: 'FETCH_CATEGORIES_ERROR'
    });
  }
});

// Validation helper for category input
function validateCategoryInput(name, description) {
  const errors = [];
  
  if (!name || !name.trim()) {
    errors.push('Category name is required');
  } else if (name.trim().length < 2) {
    errors.push('Category name must be at least 2 characters long');
  }
  
  if (description && description.length > 500) {
    errors.push('Description must not exceed 500 characters');
  }
  
  return errors;
}

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      message: 'Category retrieved successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve category',
      code: 'FETCH_CATEGORY_ERROR'
    });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate input
    const validationErrors = validateCategoryInput(name, description);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }

    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description ? description.trim() : null]
    );

    res.status(201).json({
      status: 'success',
      message: 'Category created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create category error:', error);
    
    // Handle duplicate name error
    if (error.code === '23505' && error.constraint === 'categories_name_key') {
      return res.status(400).json({
        status: 'error',
        message: 'Category with this name already exists',
        code: 'DUPLICATE_CATEGORY_NAME'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create category',
      code: 'CREATE_CATEGORY_ERROR'
    });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    // Validate input
    const validationErrors = validateCategoryInput(name, description);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }

    const result = await pool.query(
      'UPDATE categories SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name.trim(), description ? description.trim() : null, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      message: 'Category updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update category error:', error);
    
    // Handle duplicate name error
    if (error.code === '23505' && error.constraint === 'categories_name_key') {
      return res.status(400).json({
        status: 'error',
        message: 'Category with this name already exists',
        code: 'DUPLICATE_CATEGORY_NAME'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update category',
      code: 'UPDATE_CATEGORY_ERROR'
    });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    // Check if category exists
    const existsResult = await pool.query(
      'SELECT id, name FROM categories WHERE id = $1',
      [parseInt(id)]
    );

    if (existsResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    const categoryName = existsResult.rows[0].name;

    // Check if category has products
    const productCheck = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1',
      [parseInt(id)]
    );

    if (parseInt(productCheck.rows[0].count) > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete category that has products. Please reassign products first.',
        code: 'CATEGORY_HAS_PRODUCTS'
      });
    }

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    res.json({
      status: 'success',
      message: `Category '${categoryName}' deleted successfully`,
      data: {
        deletedCategory: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Delete category error:', error);
    
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete category. It is referenced by products.',
        code: 'FOREIGN_KEY_CONSTRAINT'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete category',
      code: 'DELETE_CATEGORY_ERROR'
    });
  }
});

module.exports = router;