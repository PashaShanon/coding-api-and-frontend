const jwt = require('jsonwebtoken');
require('dotenv').config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Validasi environment variables
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('JWT secrets not configured properly. Using default values for development.');
}

/**
 * Generate access token untuk authentication
 * @param {Object} payload - Data yang akan dimasukkan ke token
 * @returns {String} JWT access token
 */
function signAccessToken(payload) {
  try {
    // Hapus field sensitive dari payload
    const { password, ...safePayload } = payload || {};
    
    return jwt.sign(
      {
        ...safePayload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      }, 
      ACCESS_SECRET, 
      { 
        expiresIn: ACCESS_EXPIRES_IN,
        issuer: 'toko-pakaian-api',
        audience: 'toko-pakaian-client'
      }
    );
  } catch (error) {
    console.error('Error signing access token:', error);
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate refresh token untuk mendapatkan access token baru
 * @param {Object} payload - Data yang akan dimasukkan ke token
 * @returns {String} JWT refresh token
 */
function signRefreshToken(payload) {
  try {
    const { password, id, email } = payload || {};
    
    return jwt.sign(
      {
        id,
        email,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      }, 
      REFRESH_SECRET, 
      { 
        expiresIn: REFRESH_EXPIRES_IN,
        issuer: 'toko-pakaian-api',
        audience: 'toko-pakaian-client'
      }
    );
  } catch (error) {
    console.error('Error signing refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify access token
 * @param {String} token - JWT access token
 * @returns {Object} Decoded token payload
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET, {
      issuer: 'toko-pakaian-api',
      audience: 'toko-pakaian-client'
    });
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Access token not active');
    }
    throw error;
  }
}

/**
 * Verify refresh token
 * @param {String} token - JWT refresh token
 * @returns {Object} Decoded token payload
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      issuer: 'toko-pakaian-api',
      audience: 'toko-pakaian-client'
    });
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Refresh token not active');
    }
    throw error;
  }
}

/**
 * Extract token dari Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Token atau null jika tidak ada
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - Data user untuk token
 * @returns {Object} Object berisi access dan refresh token
 */
function generateTokenPair(payload) {
  try {
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_EXPIRES_IN
    };
  } catch (error) {
    console.error('Error generating token pair:', error);
    throw new Error('Failed to generate authentication tokens');
  }
}

/**
 * Decode token tanpa verifikasi (untuk debugging)
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generateTokenPair,
  decodeToken
};
