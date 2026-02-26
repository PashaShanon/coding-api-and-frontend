const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database/pool');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const router = express.Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve users' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'USER_NOT_FOUND' });
    }
    res.json({ status: 'success', message: 'User profile retrieved successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve user profile', code: 'PROFILE_ERROR' });
  }
});

// Validation helper for user registration
function validateUserRegistration(name, email, password, role) {
  const errors = [];
  if (!name || !name.trim()) {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (!email || !email.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('Please provide a valid email address');
  }
  if (!password || !password.trim()) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (role && !['admin', 'kasir'].includes(role)) {
    errors.push('Role must be either "admin" or "kasir"');
  }
  return errors;
}

router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const validationErrors = validateUserRegistration(name, email, password, role);
    if (validationErrors.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors: validationErrors, code: 'VALIDATION_ERROR' });
    }

    const existingResult = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Email already exists', code: 'EMAIL_EXISTS' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, is_active, created_at',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, role || 'kasir', true]
    );

    res.status(201).json({ status: 'success', message: 'User registered successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Register user error:', error);
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(400).json({ status: 'error', message: 'Email already exists', code: 'EMAIL_EXISTS' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to register user', code: 'REGISTER_ERROR' });
  }
});

// Update user (name, email, password, role, is_active)
router.put('/update/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, is_active } = req.body;

    // Validate ID
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID', code: 'INVALID_USER_ID' });
    }

    // Validate required fields
    const errors = [];
    if (!name || !name.trim()) errors.push('Name is required');
    else if (name.trim().length < 2) errors.push('Name must be at least 2 characters long');

    if (!email || !email.trim()) errors.push('Email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('Please provide a valid email address');

    if (password && password.length < 6) errors.push('Password must be at least 6 characters long');

    if (role && !['admin', 'kasir'].includes(role)) errors.push('Role must be either "admin" or "kasir"');

    if (errors.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors, code: 'VALIDATION_ERROR' });
    }

    // Check user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [parseInt(id)]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    // Check email uniqueness (exclude current user)
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.trim().toLowerCase(), parseInt(id)]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Email already used by another user', code: 'EMAIL_EXISTS' });
    }

    // Build query dynamically — only hash & update password if provided
    let query, values;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      query = `
        UPDATE users
        SET name = $1, email = $2, password = $3, role = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, name, email, role, is_active, created_at
      `;
      values = [name.trim(), email.trim().toLowerCase(), hashedPassword, role || 'kasir', is_active ?? true, parseInt(id)];
    } else {
      query = `
        UPDATE users
        SET name = $1, email = $2, role = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, name, email, role, is_active, created_at
      `;
      values = [name.trim(), email.trim().toLowerCase(), role || 'kasir', is_active ?? true, parseInt(id)];
    }

    const result = await pool.query(query, values);

    res.json({
      status: 'success',
      message: `User '${result.rows[0].name}' updated successfully`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(400).json({ status: 'error', message: 'Email already exists', code: 'EMAIL_EXISTS' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to update user', code: 'UPDATE_USER_ERROR' });
  }
});

router.put('/deactivate-user', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'User ID is required', code: 'MISSING_USER_ID' });
    }
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID', code: 'INVALID_USER_ID' });
    }

    const result = await pool.query(
      'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND id != $2 RETURNING id, name, email, role, is_active',
      [parseInt(id), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found or cannot deactivate own account', code: 'USER_NOT_FOUND_OR_SELF_DEACTIVATION' });
    }

    res.json({
      status: 'success',
      message: `User '${result.rows[0].name}' deactivated successfully`,
      data: { deactivatedUser: result.rows[0] }
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to deactivate user', code: 'DEACTIVATE_USER_ERROR' });
  }
});

module.exports = router;