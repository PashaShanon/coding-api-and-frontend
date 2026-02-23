/**
 * Middleware untuk otorisasi berdasarkan role user
 * @param {...string} allowedRoles - Daftar role yang diizinkan mengakses endpoint
 * @returns {Function} Express middleware function
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Authentication required' });
    if (!allowedRoles || allowedRoles.length === 0) return res.status(500).json({ message: 'Server config error' });
    if (!allowedRoles.includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
    console.log(`Access granted - User: ${user.email} (${user.role}) - Endpoint: ${req.method} ${req.path}`);
    next();
  };
}

const requireAdmin = authorizeRoles('admin');
const requireAdminOrKasir = authorizeRoles('admin', 'kasir');
const requireKasir = authorizeRoles('kasir');

function requireOwnerOrAdmin(userIdField = 'id') {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Authentication required' });
    if (user.role === 'admin') return next();
    const targetUserId = req.params[userIdField] || req.body[userIdField];
    if (!targetUserId) return res.status(400).json({ message: `${userIdField} is required` });
    if (parseInt(targetUserId) !== user.id) return res.status(403).json({ message: 'Access denied' });
    next();
  };
}

function hasRole(user, requiredRoles) {
  if (!user || !user.role) return false;
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(user.role);
}

function isAdmin(user) { return hasRole(user, 'admin'); }
function isKasir(user) { return hasRole(user, 'kasir'); }

module.exports = { 
  authorizeRoles, 
  requireAdmin, 
  requireAdminOrKasir, 
  requireKasir, 
  requireOwnerOrAdmin, 
  hasRole, 
  isAdmin, 
  isKasir 
};

