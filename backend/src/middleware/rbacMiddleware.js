/**
 * Rol bazlı erişim kontrolü middleware'i
 */

/**
 * Belirli rollere sahip kullanıcıların erişimini sağlar
 * @param {Array} allowedRoles - İzin verilen roller
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bu işlem için giriş yapmalısınız'
      });
    }

    const userRoles = req.user.roles?.map(r => r.name) || [];
    
    if (userRoles.some(role => allowedRoles.includes(role))) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmuyor'
      });
    }
  };
};

/**
 * Belirli yetkilere ve rollere sahip kullanıcıların erişimini sağlar
 * @param {Array} permissions - İzin verilen yetkiler
 * @param {Array} roles - İzin verilen roller
 */
const rbacMiddleware = (permissions, roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bu işlem için giriş yapmalısınız'
      });
    }

    const userRoles = req.user.roles?.map(r => r.name) || [];
    
    // Rol kontrolü
    const hasRequiredRole = userRoles.some(role => roles.includes(role));
    
    // Yetki kontrolü
    const userPermissions = req.user.permissions || [];
    const hasRequiredPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (hasRequiredRole || hasRequiredPermission) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmuyor'
      });
    }
  };
};

module.exports = {
  checkRole,
  rbacMiddleware
};
