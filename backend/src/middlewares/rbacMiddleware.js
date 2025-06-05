module.exports = function rbacMiddleware(requiredRole) {
  return (req, res, next) => {
    // Örnek kullanıcı rolünü req.user.role üzerinden alıyoruz
    const userRole = req.user?.role;
    if (userRole === requiredRole) {
      return next();
    }
    return res.status(403).json({ message: 'Yetkisiz erişim' });
  };
};