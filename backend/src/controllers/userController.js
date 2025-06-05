const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');

/**
 * Tüm kullanıcıları listele
 */
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const department = req.query.department;
    const role = req.query.role;
    const isActive = req.query.isActive;

    // Filtreleme koşulları
    const filter = {};

    // Arama
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    // Departman filtresi
    if (department) {
      filter.department = { $regex: department, $options: 'i' };
    }

    // Aktiflik durumu
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Rol filtresi için pipeline kullan
    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'roles',
          localField: 'roles',
          foreignField: '_id',
          as: 'roles'
        }
      }
    ];

    // Rol filtresi ekle
    if (role) {
      pipeline.push({
        $match: {
          'roles.name': role
        }
      });
    }

    // Sayfalama ve sıralama
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          password: 0,
          loginAttempts: 0,
          lockUntil: 0
        }
      }
    );

    const users = await User.aggregate(pipeline);
    const total = await User.countDocuments(filter);

    // Departman yöneticisi sadece kendi departmanını görebilir
    if (req.user.roles.some(r => r.name === 'DEPARTMENT_MANAGER') && 
        !req.user.roles.some(r => ['ADMIN', 'SYSTEM_ADMIN'].includes(r.name))) {
      
      const filteredUsers = users.filter(user => 
        user.department === req.user.department
      );

      return res.json({
        success: true,
        data: {
          users: filteredUsers,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(filteredUsers.length / limit),
            totalUsers: filteredUsers.length,
            hasNext: page < Math.ceil(filteredUsers.length / limit),
            hasPrev: page > 1
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar listelenirken hata oluştu'
    });
  }
};

/**
 * Tek kullanıcı getir
 */
const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate('roles')
      .select('-password -loginAttempts -lockUntil');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Departman yöneticisi kontrolü
    if (req.user.roles.some(r => r.name === 'DEPARTMENT_MANAGER') && 
        !req.user.roles.some(r => ['ADMIN', 'SYSTEM_ADMIN'].includes(r.name))) {
      
      if (user.department !== req.user.department && user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bu kullanıcıyı görüntüleme yetkiniz yok'
        });
      }
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınırken hata oluştu'
    });
  }
};

/**
 * Kullanıcı güncelle
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Kendi profilini güncelleyebilir veya admin olmalı
    if (user._id.toString() !== req.user._id.toString() && 
        !req.user.roles.some(r => ['ADMIN', 'SYSTEM_ADMIN'].includes(r.name))) {
      return res.status(403).json({
        success: false,
        message: 'Bu kullanıcıyı güncelleme yetkiniz yok'
      });
    }

    // Güvenlik: Normal kullanıcılar rol değiştiremez
    if (updates.roles && !req.user.roles.some(r => r.name === 'ADMIN')) {
      delete updates.roles;
    }

    // Güvenlik: isActive durumunu sadece admin değiştirebilir
    if (updates.isActive !== undefined && !req.user.roles.some(r => r.name === 'ADMIN')) {
      delete updates.isActive;
    }

    const oldUserData = { ...user.toJSON() };
    const updatedUser = await User.findByIdAndUpdate(
      id,
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
      resource: { type: 'USER', id: updatedUser._id, name: updatedUser.username },
      details: { 
        description: 'Kullanıcı güncellendi',
        changes: {
          before: oldUserData,
          after: updates
        }
      },
      category: 'DATA_CHANGE',
      severity: req.user._id.toString() === id ? 'LOW' : 'MEDIUM'
    });

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      data: { user: updatedUser }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı güncellenirken hata oluştu'
    });
  }
};

/**
 * Kullanıcı sil
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Kendi hesabını silemez
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz'
      });
    }

    // Soft delete - isActive = false
    await User.findByIdAndUpdate(id, { isActive: false });

    // Audit log
    await AuditLog.logSuccess({
      action: 'USER_DELETED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: user._id, name: user.username },
      details: { 
        description: 'Kullanıcı silindi (soft delete)',
        metadata: { deletedUser: user.username }
      },
      category: 'DATA_CHANGE',
      severity: 'HIGH'
    });

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinirken hata oluştu'
    });
  }
};

/**
 * Kullanıcı kilitle
 */
const lockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration = 2 } = req.body; // Saat cinsinden

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Kendi hesabını kilitleyemez
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı kilitleyemezsiniz'
      });
    }

    const lockUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
    
    await User.findByIdAndUpdate(id, {
      lockUntil,
      loginAttempts: 5
    });

    // Audit log
    await AuditLog.logSuccess({
      action: 'USER_LOCKED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: user._id, name: user.username },
      details: { 
        description: `Kullanıcı ${duration} saat için kilitlendi`,
        metadata: { lockDuration: duration, lockUntil }
      },
      category: 'SECURITY',
      severity: 'HIGH'
    });

    res.json({
      success: true,
      message: `Kullanıcı ${duration} saat için kilitlendi`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı kilitlenirken hata oluştu'
    });
  }
};

/**
 * Kullanıcı kilidini aç
 */
const unlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    await User.findByIdAndUpdate(id, {
      $unset: { lockUntil: 1, loginAttempts: 1 }
    });

    // Audit log
    await AuditLog.logSuccess({
      action: 'USER_UNLOCKED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: user._id, name: user.username },
      details: { 
        description: 'Kullanıcı kilidi açıldı',
        metadata: { unlockedUser: user.username }
      },
      category: 'SECURITY',
      severity: 'MEDIUM'
    });

    res.json({
      success: true,
      message: 'Kullanıcı kilidi başarıyla açıldı'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı kilidi açılırken hata oluştu'
    });
  }
};

/**
 * Kullanıcı rollerini güncelle
 */
const updateUserRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleIds } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Rollerin varlığını kontrol et
    const roles = await Role.find({ _id: { $in: roleIds }, isActive: true });
    if (roles.length !== roleIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz rol ID\'leri'
      });
    }

    const oldRoles = user.roles;
    user.roles = roleIds;
    await user.save();

    // Audit log
    await AuditLog.logSuccess({
      action: 'USER_ROLES_UPDATED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'USER', id: user._id, name: user.username },
      details: { 
        description: 'Kullanıcı rolleri güncellendi',
        changes: {
          before: oldRoles,
          after: roleIds
        }
      },
      category: 'AUTHORIZATION',
      severity: 'HIGH'
    });

    const updatedUser = await User.findById(id)
      .populate('roles')
      .select('-password');

    res.json({
      success: true,
      message: 'Kullanıcı rolleri başarıyla güncellendi',
      data: { user: updatedUser }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı rolleri güncellenirken hata oluştu'
    });
  }
};

/**
 * Kullanıcı istatistikleri
 */
const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveUsers: { $sum: { $cond: ['$isActive', 0, 1] } },
          lockedUsers: { 
            $sum: { 
              $cond: [
                { $gt: ['$lockUntil', new Date()] }, 
                1, 
                0
              ] 
            } 
          }
        }
      }
    ]);

    const departmentStats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const recentLogins = await User.find({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).countDocuments();

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          lockedUsers: 0
        },
        departmentDistribution: departmentStats,
        recentLogins
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı istatistikleri alınırken hata oluştu'
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  lockUser,
  unlockUser,
  updateUserRoles,
  getUserStats
};
