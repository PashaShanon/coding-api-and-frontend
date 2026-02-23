const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database/pool');
const jwtUtils = require('../utils/jwtUtils');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');
const router = express.Router();

// Validation helpers
function validateLoginInput(email, password) {
  const errors = [];
  
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
  
  return errors;
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    const validationErrors = validateLoginInput(email, password);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors,
        data: {}
      });
    }

    // Cari user berdasarkan email
    const result = await pool.query(
      'SELECT id, name, email, password, role, is_active, created_at FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        data: {}
      });
    }

    const user = result.rows[0];

    // Cek apakah user aktif
    if (!user.is_active) {
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED',
        data: {}
      });
    }

    // Verifikasi password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        data: {}
      });
    }

    // Generate token pair
    const tokenPair = jwtUtils.generateTokenPair({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Update last login time (optional)
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Response sukses (tanpa password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        tokenType: tokenPair.tokenType,
        expiresIn: tokenPair.expiresIn
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR',
      data: {}
    });
  }
});

router.post('/refresh', authenticateRefreshToken, async (req, res) => {
  try {
    const { id, email } = req.refreshPayload;

    // Cek apakah user masih ada dan aktif
    const result = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found or account deactivated',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    // Generate token pair baru
    const tokenPair = jwtUtils.generateTokenPair({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        tokenType: tokenPair.tokenType,
        expiresIn: tokenPair.expiresIn
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  try {
    // In a real app, you might want to:
    // 1. Add token to blacklist
    // 2. Clear refresh token from database
    // 3. Log the logout event
    
    console.log(`User ${req.user.email} logged out`);
    
    res.json({
      status: 'success',
      message: 'Logout successful',
      data: null
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  try {
    // User data sudah tersedia dari middleware authenticateToken
    const { password, ...userWithoutPassword } = req.user;
    
    res.json({
      status: 'success',
      message: 'User profile retrieved successfully',
      data: {
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user profile',
      code: 'PROFILE_ERROR'
    });
  }
});

module.exports = router;