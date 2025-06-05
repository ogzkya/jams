const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const { checkPasswordStrength } = require('../utils/encryption');

/**
 * Kullanıcı kaydı
 */
const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, department, position, phone, roles } = req.body;

    // Kullanıcı adı ve e-posta kontrolü
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      await AuditLog.logFailure({
        action: 'USER_REGISTRATION_FAILED',
        username: username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'USER', name: username },
        details: { 
          description: 'Kullanıcı adı veya e-posta zaten kullanımda',
          metadata: { attempted_username: username, attempted_email: email }
        },
        category: 'AUTHENTICATION',
        severity: 'MEDIUM'
      });

      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı veya e-posta zaten kullanımda'
      });
    }

    // Şifre gücü kontrolü
    const passwordCheck = checkPasswordStrength(password);
    if (passwordCheck.score < 4) {
      return res.status(400).json({
        success: false,
        message: 'Şifre yeterince güçlü değil',
        passwordStrength: passwordCheck
      });
    }

    // Roller kontrolü ve atama
    let userRoles = [];
    if (roles && roles.length > 0) {
      // Sadece admin yeni kullanıcıya rol atayabilir
      if (!req.user || !req.user.roles.some(role => role.name === 'ADMIN')) {
        // Varsayılan rol ata
        const observerRole = await Role.findOne({ name: 'OBSERVER' });
        userRoles = [observerRole._id];
      } else {
        // Belirtilen rolleri kontrol et
        const validRoles = await Role.find({ _id: { $in: roles }, isActive: true });
        userRoles = validRoles.map(role => role._id);
      }
    } else {
      // Varsayılan rol ata
      const observerRole = await Role.findOne({ name: 'OBSERVER' });
      userRoles = [observerRole._id];
    }

    // Yeni kullanıcı oluştur
    const newUser = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      department,
      position,
      phone,
      roles: userRoles
    });

    await newUser.save();

    // Audit log
    await AuditLog.logSuccess({
      action: 'USER_CREATED',
      user: req.user ? req.user._id : null,
      username: req.user ? req.user.username : 'System',
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: newUser._id, name: newUser.username },
      details: { 
        description: 'Yeni kullanıcı oluşturuldu',
        metadata: { 
          createdUser: newUser.username,
          department: department,
          roles: userRoles.length 
        }
      },
      category: 'AUTHENTICATION',
      severity: 'LOW'
    });

    // Şifreyi response'dan çıkar
    const userResponse = newUser.toJSON();

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    await AuditLog.logError({
      action: 'USER_REGISTRATION_ERROR',
      username: req.body.username || 'Unknown',
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', name: req.body.username },
      details: { 
        description: 'Kullanıcı kaydı sırasında hata',
        metadata: { errorMessage: error.message }
      },
      category: 'AUTHENTICATION',
      severity: 'HIGH'
    });

    res.status(500).json({
      success: false,
      message: 'Kullanıcı kaydı sırasında hata oluştu'
    });
  }
};

/**
 * Kullanıcı girişi
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Kullanıcıyı bul
    const user = await User.findOne({ username }).populate('roles');

    if (!user) {
      await AuditLog.logFailure({
        action: 'USER_LOGIN_FAILED',
        username: username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'USER', name: username },
        details: { description: 'Kullanıcı bulunamadı' },
        category: 'AUTHENTICATION',
        severity: 'MEDIUM'
      });

      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }

    // Hesap aktif mi kontrol et
    if (!user.isActive) {
      await AuditLog.logFailure({
        action: 'USER_LOGIN_FAILED',
        user: user._id,
        username: user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'USER', id: user._id, name: user.username },
        details: { description: 'Pasif hesap giriş denemesi' },
        category: 'AUTHENTICATION',
        severity: 'MEDIUM'
      });

      return res.status(401).json({
        success: false,
        message: 'Hesap aktif değil'
      });
    }

    // Hesap kilitli mi kontrol et
    if (user.isLocked) {
      await AuditLog.logFailure({
        action: 'USER_LOGIN_FAILED',
        user: user._id,
        username: user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'USER', id: user._id, name: user.username },
        details: { description: 'Kilitli hesap giriş denemesi' },
        category: 'AUTHENTICATION',
        severity: 'HIGH'
      });

      return res.status(401).json({
        success: false,
        message: 'Hesap kilitli - yönetici ile iletişime geçin'
      });
    }

    // Şifre kontrolü
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Başarısız giriş denemesini kaydet
      await user.incLoginAttempts();

      await AuditLog.logFailure({
        action: 'USER_LOGIN_FAILED',
        user: user._id,
        username: user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'USER', id: user._id, name: user.username },
        details: { 
          description: 'Yanlış şifre',
          metadata: { loginAttempts: user.loginAttempts + 1 }
        },
        category: 'AUTHENTICATION',
        severity: 'MEDIUM'
      });

      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }

    // Başarılı giriş - login attempts'i sıfırla
    await user.resetLoginAttempts();

    // JWT token oluştur
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    // Audit log
    await AuditLog.logSuccess({
      action: 'USER_LOGIN',
      user: user._id,
      username: user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: user._id, name: user.username },
      details: { description: 'Başarılı giriş' },
      category: 'AUTHENTICATION',
      severity: 'LOW'
    });

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        token,
        user: user.toJSON(),
        expiresIn: process.env.JWT_EXPIRE || '24h'
      }
    });

  } catch (error) {
    await AuditLog.logError({
      action: 'USER_LOGIN_ERROR',
      username: req.body.username || 'Unknown',
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'SYSTEM', name: 'login' },
      details: { 
        description: 'Giriş sırasında hata',
        metadata: { errorMessage: error.message }
      },
      category: 'AUTHENTICATION',
      severity: 'HIGH'
    });

    res.status(500).json({
      success: false,
      message: 'Giriş sırasında hata oluştu'
    });
  }
};

/**
 * Kullanıcı çıkışı
 */
const logout = async (req, res) => {
  try {
    // Audit log
    await AuditLog.logSuccess({
      action: 'USER_LOGOUT',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: req.user._id, name: req.user.username },
      details: { description: 'Kullanıcı çıkışı' },
      category: 'AUTHENTICATION',
      severity: 'LOW'
    });

    res.json({
      success: true,
      message: 'Çıkış başarılı'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çıkış sırasında hata oluştu'
    });
  }
};

/**
 * Mevcut kullanıcı profili
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('roles')
      .select('-password');

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profil bilgileri alınırken hata oluştu'
    });
  }
};

/**
 * Profil güncelleme
 */
const updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'email', 'phone', 'department', 'position', 'preferences'];
    const updates = {};

    // Sadece izin verilen alanları güncelle
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const oldUser = await User.findById(req.user._id);
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).populate('roles').select('-password');

    // Audit log
    await AuditLog.logSuccess({
      action: 'USER_UPDATED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: req.user._id, name: req.user.username },
      details: { 
        description: 'Profil güncellendi',
        changes: {
          before: oldUser.toJSON(),
          after: updates
        }
      },
      category: 'DATA_CHANGE',
      severity: 'LOW'
    });

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: {
        user: updatedUser.toJSON()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profil güncellenirken hata oluştu'
    });
  }
};

/**
 * Şifre değiştirme
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    // Mevcut şifre kontrolü
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      await AuditLog.logFailure({
        action: 'PASSWORD_CHANGE_FAILED',
        user: req.user._id,
        username: req.user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'USER', id: req.user._id, name: req.user.username },
        details: { description: 'Mevcut şifre yanlış' },
        category: 'AUTHENTICATION',
        severity: 'MEDIUM'
      });

      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre yanlış'
      });
    }

    // Yeni şifre gücü kontrolü
    const passwordCheck = checkPasswordStrength(newPassword);
    if (passwordCheck.score < 4) {
      return res.status(400).json({
        success: false,
        message: 'Yeni şifre yeterince güçlü değil',
        passwordStrength: passwordCheck
      });
    }

    // Şifre güncelle
    user.password = newPassword;
    await user.save();

    // Audit log
    await AuditLog.logSuccess({
      action: 'PASSWORD_CHANGED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: req.user._id, name: req.user.username },
      details: { description: 'Şifre değiştirildi' },
      category: 'AUTHENTICATION',
      severity: 'MEDIUM'
    });

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre değiştirilirken hata oluştu'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
