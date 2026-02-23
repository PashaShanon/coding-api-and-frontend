const requireKasir = (req, res, next) => {
  if (req.user.role !== 'kasir' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Kasir or Admin access required'
    });
  }
  next();
};

module.exports = requireKasir;