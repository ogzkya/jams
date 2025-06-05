/**
 * Rol Tabanlı Erişim Kontrolü (RBAC) Middleware
 */

/**
 * Belirli rollere sahip kullanıcıların erişimine izin verir
 * @param {Array} allowedRoles - İzin verilen roller
 */
const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kimlik doğrulama gereklidir'
      });
    }

    const userRoles = req.user.roles.map(role => role.name);
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmamaktadır',
        requiredRoles: allowedRoles,
        userRoles: userRoles
      });
    }

    next();
  };
};

/**
 * Belirli izinleri kontrol eder
 * @param {String} module - Modül adı (users, inventory, locations, vb.)
 * @param {String} action - Eylem (create, read, update, delete)
 */
const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kimlik doğrulama gereklidir'
      });
    }

    // Kullanıcının rollerinden izinleri kontrol et
    let hasPermission = false;

    for (const role of req.user.roles) {
      if (role.permissions[module] && role.permissions[module][action]) {
        hasPermission = true;
        break;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `${module}.${action} işlemi için yetkiniz bulunmamaktadır`
      });
    }

    next();
  };
};

/**
 * Admin yetkisi gerektirir
 */
const requireAdmin = requireRoles(['ADMIN']);

/**
 * Sistem yöneticisi yetkisi gerektirir
 */
const requireSystemAdmin = requireRoles(['ADMIN', 'SYSTEM_ADMIN']);

/**
 * Kaynak sahibi veya admin kontrolü
 * @param {Function} getResourceOwnerId - Kaynak sahibinin ID'sini döndüren fonksiyon
 */
const requireOwnershipOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kimlik doğrulama gereklidir'
      });
    }

    // Admin ise direkt geçir
    const userRoles = req.user.roles.map(role => role.name);
    if (userRoles.includes('ADMIN') || userRoles.includes('SYSTEM_ADMIN')) {
      return next();
    }

    try {
      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (!resourceOwnerId || resourceOwnerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bu kaynağa sadece sahibi veya admin erişebilir'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Yetki kontrolü sırasında hata oluştu'
      });
    }
  };
};

/**
 * Departman yöneticisi kontrolü
 */
const requireDepartmentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Kimlik doğrulama gereklidir'
    });
  }

  const userRoles = req.user.roles.map(role => role.name);
  
  // Admin ve sistem yöneticileri her departmana erişebilir
  if (userRoles.includes('ADMIN') || userRoles.includes('SYSTEM_ADMIN')) {
    return next();
  }

  // Departman yöneticisi sadece kendi departmanına erişebilir
  if (userRoles.includes('DEPARTMENT_MANAGER')) {
    // Bu kontrolü route'larda daha spesifik olarak yapacağız
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Departman erişimi için yetkiniz bulunmamaktadır'
  });
};

module.exports = {
  requireRoles,
  requirePermission,
  requireAdmin,
  requireSystemAdmin,
  requireOwnershipOrAdmin,
  requireDepartmentAccess
};
