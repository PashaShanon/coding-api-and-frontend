const jwtUtils = require('../utils/jwtUtils');
const pool = require('../database/pool');

/**
 * Middleware untuk autentikasi JWT token
 */

async function  authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = jwtUtils.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    let payload;
    try {
      payload = jwtUtils.verifyAccessToken(token);
    } catch (err) {
      console.error('Token verification error:', err.message);
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Validate payload structure
    if (!payload.id || !payload.email) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid token payload',
        code: 'INVALID_PAYLOAD'
      });
    }

    const result = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1', 
      [payload.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = jwtUtils.extractTokenFromHeader(authHeader);
    if (!token) return next();

    try {
      const payload = jwtUtils.verifyAccessToken(token);
      const result = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [payload.id]);
      if (result.rowCount > 0) req.user = result.rows[0];
    } catch (err) {
      // ignore invalid token
    }
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
}

function authenticateRefreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    
    if (!refreshToken) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    let payload;
    try {
      payload = jwtUtils.verifyRefreshToken(refreshToken);
    } catch (err) {
      console.error('Refresh token verification error:', err.message);
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Validate payload structure
    if (!payload.id || !payload.email) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid refresh token payload',
        code: 'INVALID_REFRESH_PAYLOAD'
      });
    }

    req.refreshPayload = payload;
    next();
  } catch (error) {
    console.error('Refresh token middleware error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Refresh token validation failed',
      code: 'REFRESH_TOKEN_ERROR'
    });
  }
}

module.exports = { authenticateToken, optionalAuth, authenticateRefreshToken };

