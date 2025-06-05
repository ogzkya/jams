const { encrypt, decrypt } = require('../utils/encryption');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

/**
 * Şifre Yönetimi Controller'ı
 * Hassas şifreleri güvenli bir şekilde saklamak ve yönetmek için
 */

// Bellek içi şifre deposu (geçici, production'da veritabanı kullanılmalı)
let passwordStore = [];

/**
 * Tüm saklanan şifreleri listele
 */
const getPasswords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category;

    // Filtreleme
    let filteredPasswords = passwordStore.filter(item => {
      let matches = true;
      
      if (search) {
        matches = matches && (
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase()) ||
          item.url.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (category) {
        matches = matches && item.category === category;
      }
      
      return matches && item.isActive;
    });

    // Departman yöneticisi sadece kendi departmanının şifrelerini görebilir
    if (req.user.roles.some(r => r.name === 'DEPARTMENT_MANAGER') && 
        !req.user.roles.some(r => ['ADMIN', 'SYSTEM_ADMIN'].includes(r.name))) {
      
      filteredPasswords = filteredPasswords.filter(item => 
        item.department === req.user.department || 
        item.sharedWith.includes(req.user._id.toString())
      );
    }

    // Sayfalama
    const total = filteredPasswords.length;
    const paginatedPasswords = filteredPasswords.slice(skip, skip + limit);

    // Şifreleri çıktıdan gizle (sadece başlık, açıklama vs. gönder)
    const securePasswords = paginatedPasswords.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      url: item.url,
      username: item.username,
      category: item.category,
      department: item.department,
      tags: item.tags,
      lastModified: item.lastModified,
      lastAccessed: item.lastAccessed,
      accessCount: item.accessCount,
      sharedWith: item.sharedWith,
      createdBy: item.createdBy,
      createdAt: item.createdAt
    }));

    res.json({
      success: true,
      data: {
        passwords: securePasswords,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalPasswords: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifreler listelenirken hata oluştu'
    });
  }
};

/**
 * Belirli bir şifreyi getir (şifrelenmiş)
 */
const getPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const passwordItem = passwordStore.find(item => item.id === id && item.isActive);

    if (!passwordItem) {
      return res.status(404).json({
        success: false,
        message: 'Şifre bulunamadı'
      });
    }

    // Erişim yetkisi kontrolü
    const hasAccess = 
      passwordItem.createdBy === req.user._id.toString() ||
      passwordItem.sharedWith.includes(req.user._id.toString()) ||
      (passwordItem.department === req.user.department) ||
      req.user.roles.some(r => ['ADMIN', 'SYSTEM_ADMIN'].includes(r.name));

    if (!hasAccess) {
      await AuditLog.logFailure({
        action: 'PASSWORD_ACCESS_DENIED',
        user: req.user._id,
        username: req.user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'PASSWORD', id: passwordItem.id, name: passwordItem.title },
        details: { description: 'Şifre erişim yetkisi yok' },
        category: 'SECURITY',
        severity: 'MEDIUM'
      });

      return res.status(403).json({
        success: false,
        message: 'Bu şifreye erişim yetkiniz yok'
      });
    }

    // Erişim sayısını artır
    passwordItem.accessCount += 1;
    passwordItem.lastAccessed = new Date();

    // Audit log
    await AuditLog.logSuccess({
      action: 'PASSWORD_ACCESSED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'PASSWORD', id: passwordItem.id, name: passwordItem.title },
      details: { 
        description: 'Şifre erişildi',
        metadata: { accessCount: passwordItem.accessCount }
      },
      category: 'SECURITY',
      severity: 'LOW'
    });

    // Şifreyi çöz ve gönder
    const decryptedPassword = decrypt(passwordItem.encryptedPassword);

    res.json({
      success: true,
      data: {
        password: {
          ...passwordItem,
          password: decryptedPassword,
          encryptedPassword: undefined // Şifrelenmiş halini gönderme
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre alınırken hata oluştu'
    });
  }
};

/**
 * Yeni şifre kaydet
 */
const createPassword = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      password, 
      username, 
      url, 
      category, 
      department, 
      tags, 
      sharedWith 
    } = req.body;

    // Şifreyi şifrele
    const encryptedPassword = encrypt(password);

    const passwordItem = {
      id: crypto.randomUUID(),
      title,
      description,
      username,
      url,
      category,
      department: department || req.user.department,
      tags: tags || [],
      encryptedPassword,
      sharedWith: sharedWith || [],
      createdBy: req.user._id.toString(),
      createdAt: new Date(),
      lastModified: new Date(),
      lastAccessed: null,
      accessCount: 0,
      isActive: true
    };

    passwordStore.push(passwordItem);

    // Audit log
    await AuditLog.logSuccess({
      action: 'PASSWORD_CREATED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'PASSWORD', id: passwordItem.id, name: passwordItem.title },
      details: { 
        description: 'Yeni şifre kaydedildi',
        metadata: { 
          category: passwordItem.category,
          department: passwordItem.department,
          sharedCount: sharedWith?.length || 0
        }
      },
      category: 'SECURITY',
      severity: 'LOW'
    });

    // Şifreyi response'dan çıkar
    const secureResponse = { ...passwordItem };
    delete secureResponse.encryptedPassword;

    res.status(201).json({
      success: true,
      message: 'Şifre başarıyla kaydedildi',
      data: { password: secureResponse }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre kaydedilirken hata oluştu'
    });
  }
};

/**
 * Şifre güncelle
 */
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const passwordIndex = passwordStore.findIndex(item => item.id === id && item.isActive);

    if (passwordIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Şifre bulunamadı'
      });
    }

    const passwordItem = passwordStore[passwordIndex];

    // Güncelleme yetkisi kontrolü
    const canUpdate = 
      passwordItem.createdBy === req.user._id.toString() ||
      req.user.roles.some(r => ['ADMIN', 'SYSTEM_ADMIN'].includes(r.name));

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Bu şifreyi güncelleme yetkiniz yok'
      });
    }

    const oldData = { ...passwordItem };

    // Güvenli alanları güncelle
    const allowedUpdates = ['title', 'description', 'username', 'url', 'category', 'department', 'tags', 'sharedWith'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        passwordItem[field] = updates[field];
      }
    });

    // Şifre değişikliği varsa şifrele
    if (updates.password) {
      passwordItem.encryptedPassword = encrypt(updates.password);
    }

    passwordItem.lastModified = new Date();

    // Audit log
    await AuditLog.logSuccess({
      action: 'PASSWORD_UPDATED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'PASSWORD', id: passwordItem.id, name: passwordItem.title },
      details: { 
        description: 'Şifre güncellendi',
        changes: {
          before: { ...oldData, encryptedPassword: undefined },
          after: updates
        }
      },
      category: 'SECURITY',
      severity: 'LOW'
    });

    // Şifreyi response'dan çıkar
    const secureResponse = { ...passwordItem };
    delete secureResponse.encryptedPassword;

    res.json({
      success: true,
      message: 'Şifre başarıyla güncellendi',
      data: { password: secureResponse }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre güncellenirken hata oluştu'
    });
  }
};

/**
 * Şifre sil
 */
const deletePassword = async (req, res) => {
  try {
    const { id } = req.params;

    const passwordIndex = passwordStore.findIndex(item => item.id === id && item.isActive);

    if (passwordIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Şifre bulunamadı'
      });
    }

    const passwordItem = passwordStore[passwordIndex];

    // Silme yetkisi kontrolü
    const canDelete = 
      passwordItem.createdBy === req.user._id.toString() ||
      req.user.roles.some(r => ['ADMIN', 'SYSTEM_ADMIN'].includes(r.name));

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Bu şifreyi silme yetkiniz yok'
      });
    }

    // Soft delete
    passwordItem.isActive = false;
    passwordItem.deletedAt = new Date();
    passwordItem.deletedBy = req.user._id.toString();

    // Audit log
    await AuditLog.logSuccess({
      action: 'PASSWORD_DELETED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'PASSWORD', id: passwordItem.id, name: passwordItem.title },
      details: { 
        description: 'Şifre silindi',
        metadata: { category: passwordItem.category }
      },
      category: 'SECURITY',
      severity: 'MEDIUM'
    });

    res.json({
      success: true,
      message: 'Şifre başarıyla silindi'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre silinirken hata oluştu'
    });
  }
};

/**
 * Şifre paylaş
 */
const sharePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds, action } = req.body; // action: 'add' veya 'remove'

    const passwordIndex = passwordStore.findIndex(item => item.id === id && item.isActive);

    if (passwordIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Şifre bulunamadı'
      });
    }

    const passwordItem = passwordStore[passwordIndex];

    // Paylaşma yetkisi kontrolü
    const canShare = 
      passwordItem.createdBy === req.user._id.toString() ||
      req.user.roles.some(r => ['ADMIN', 'SYSTEM_ADMIN'].includes(r.name));

    if (!canShare) {
      return res.status(403).json({
        success: false,
        message: 'Bu şifreyi paylaşma yetkiniz yok'
      });
    }

    // Kullanıcıları kontrol et
    const users = await User.find({ _id: { $in: userIds }, isActive: true });
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz kullanıcı ID\'leri'
      });
    }

    const oldSharedWith = [...passwordItem.sharedWith];

    if (action === 'add') {
      // Yeni kullanıcıları ekle
      userIds.forEach(userId => {
        if (!passwordItem.sharedWith.includes(userId)) {
          passwordItem.sharedWith.push(userId);
        }
      });
    } else if (action === 'remove') {
      // Kullanıcıları kaldır
      passwordItem.sharedWith = passwordItem.sharedWith.filter(
        userId => !userIds.includes(userId)
      );
    }

    passwordItem.lastModified = new Date();

    // Audit log
    await AuditLog.logSuccess({
      action: 'PASSWORD_SHARED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'PASSWORD', id: passwordItem.id, name: passwordItem.title },
      details: { 
        description: `Şifre paylaşımı ${action === 'add' ? 'eklendi' : 'kaldırıldı'}`,
        changes: {
          before: oldSharedWith,
          after: passwordItem.sharedWith,
          action,
          affectedUsers: userIds
        }
      },
      category: 'SECURITY',
      severity: 'LOW'
    });

    res.json({
      success: true,
      message: `Şifre paylaşımı başarıyla ${action === 'add' ? 'eklendi' : 'kaldırıldı'}`,
      data: { 
        sharedWith: passwordItem.sharedWith 
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre paylaşımı sırasında hata oluştu'
    });
  }
};

/**
 * Şifre istatistikleri
 */
const getPasswordStats = async (req, res) => {
  try {
    const activePasswords = passwordStore.filter(item => item.isActive);

    // Kategori bazında dağılım
    const categoryStats = {};
    activePasswords.forEach(item => {
      categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
    });

    // Departman bazında dağılım
    const departmentStats = {};
    activePasswords.forEach(item => {
      departmentStats[item.department] = (departmentStats[item.department] || 0) + 1;
    });

    // Erişim istatistikleri
    const totalAccess = activePasswords.reduce((sum, item) => sum + item.accessCount, 0);
    const recentlyAccessed = activePasswords.filter(item => 
      item.lastAccessed && 
      new Date(item.lastAccessed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Yakın zamanda oluşturulan
    const recentlyCreated = activePasswords.filter(item =>
      new Date(item.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    res.json({
      success: true,
      data: {
        overview: {
          totalPasswords: activePasswords.length,
          totalAccess,
          recentlyAccessed,
          recentlyCreated,
          mostAccessedPassword: activePasswords.reduce((max, item) => 
            item.accessCount > max.accessCount ? item : max, 
            { accessCount: 0, title: 'N/A' }
          )
        },
        categoryDistribution: Object.entries(categoryStats).map(([category, count]) => ({
          category,
          count
        })),
        departmentDistribution: Object.entries(departmentStats).map(([department, count]) => ({
          department,
          count
        }))
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre istatistikleri alınırken hata oluştu'
    });
  }
};

module.exports = {
  getPasswords,
  getPassword,
  createPassword,
  updatePassword,
  deletePassword,
  sharePassword,
  getPasswordStats
};
