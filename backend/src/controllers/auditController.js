const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { logAuditEvent } = require('../utils/auditHelper');

const auditController = {
  /**
   * Audit loglarını listele (filtreleme ve sayfalama ile)
   */
  async getAuditLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        action, 
        resource, 
        userId, 
        startDate, 
        endDate,
        severity,
        ipAddress,
        userAgent
      } = req.query;

      // Filtreleme koşulları oluştur
      const filter = {};
      
      if (action) filter.action = action;
      if (resource) filter.resource = resource;
      if (userId) filter.userId = userId;
      if (severity) filter.severity = severity;
      if (ipAddress) filter.ipAddress = ipAddress;
      if (userAgent) filter.userAgent = { $regex: userAgent, $options: 'i' };
      
      // Tarih aralığı filtresi
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const auditLogs = await AuditLog.find(filter)
        .populate('userId', 'username email firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await AuditLog.countDocuments(filter);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW',
        'AuditLog',
        null,
        { filter, pagination: { page, limit } },
        req
      );

      res.json({
        success: true,
        data: {
          auditLogs,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Audit logları getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Audit logları getirilemedi'
      });
    }
  },

  /**
   * Belirli bir audit log kaydını getir
   */
  async getAuditLogById(req, res) {
    try {
      const { id } = req.params;

      const auditLog = await AuditLog.findById(id)
        .populate('userId', 'username email firstName lastName');

      if (!auditLog) {
        return res.status(404).json({
          success: false,
          message: 'Audit log kaydı bulunamadı'
        });
      }

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_DETAIL',
        'AuditLog',
        id,
        null,
        req
      );

      res.json({
        success: true,
        data: auditLog
      });
    } catch (error) {
      console.error('Audit log getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Audit log getirilemedi'
      });
    }
  },

  /**
   * Belirli bir kullanıcının audit loglarını getir
   */
  async getAuditLogsByUser(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50, startDate, endDate } = req.query;

      // Kullanıcının varlığını kontrol et
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      const filter = { userId };
      
      // Tarih aralığı filtresi
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const auditLogs = await AuditLog.find(filter)
        .populate('userId', 'username email firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await AuditLog.countDocuments(filter);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_USER',
        'AuditLog',
        null,
        { targetUserId: userId, pagination: { page, limit } },
        req
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          },
          auditLogs,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Kullanıcı audit logları getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Kullanıcı audit logları getirilemedi'
      });
    }
  },

  /**
   * Belirli bir aksiyon türüne ait audit logları getir
   */
  async getAuditLogsByAction(req, res) {
    try {
      const { action } = req.params;
      const { page = 1, limit = 50, startDate, endDate } = req.query;

      const filter = { action };
      
      // Tarih aralığı filtresi
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const auditLogs = await AuditLog.find(filter)
        .populate('userId', 'username email firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await AuditLog.countDocuments(filter);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_ACTION',
        'AuditLog',
        null,
        { action, pagination: { page, limit } },
        req
      );

      res.json({
        success: true,
        data: {
          action,
          auditLogs,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Aksiyon audit logları getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Aksiyon audit logları getirilemedi'
      });
    }
  },

  /**
   * Belirli bir kaynak türüne ait audit logları getir
   */
  async getAuditLogsByResource(req, res) {
    try {
      const { resource } = req.params;
      const { page = 1, limit = 50, startDate, endDate } = req.query;

      const filter = { resource };
      
      // Tarih aralığı filtresi
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const auditLogs = await AuditLog.find(filter)
        .populate('userId', 'username email firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await AuditLog.countDocuments(filter);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_RESOURCE',
        'AuditLog',
        null,
        { resource, pagination: { page, limit } },
        req
      );

      res.json({
        success: true,
        data: {
          resource,
          auditLogs,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Kaynak audit logları getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Kaynak audit logları getirilemedi'
      });
    }
  },

  /**
   * Belirli tarih aralığındaki audit logları getir
   */
  async getAuditLogsByDateRange(req, res) {
    try {
      const { startDate, endDate, page = 1, limit = 50 } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Başlangıç ve bitiş tarihleri gerekli'
        });
      }

      const filter = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const skip = (page - 1) * limit;
      
      const auditLogs = await AuditLog.find(filter)
        .populate('userId', 'username email firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await AuditLog.countDocuments(filter);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_DATE_RANGE',
        'AuditLog',
        null,
        { dateRange: { startDate, endDate }, pagination: { page, limit } },
        req
      );

      res.json({
        success: true,
        data: {
          dateRange: { startDate, endDate },
          auditLogs,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Tarih aralığı audit logları getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Tarih aralığı audit logları getirilemedi'
      });
    }
  },

  /**
   * Güvenlik olaylarını getir
   */
  async getSecurityEvents(req, res) {
    try {
      const { page = 1, limit = 50, startDate, endDate } = req.query;

      // Güvenlik olaylarını filtrele
      const securityActions = [
        'LOGIN_FAILED',
        'ACCOUNT_LOCKED',
        'ACCOUNT_UNLOCKED',
        'PASSWORD_CHANGE',
        'PERMISSION_DENIED',
        'SUSPICIOUS_ACTIVITY',
        'BRUTE_FORCE_ATTEMPT',
        'UNAUTHORIZED_ACCESS'
      ];

      const filter = { 
        $or: [
          { action: { $in: securityActions } },
          { severity: 'HIGH' },
          { severity: 'CRITICAL' }
        ]
      };
      
      // Tarih aralığı filtresi
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const securityEvents = await AuditLog.find(filter)
        .populate('userId', 'username email firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await AuditLog.countDocuments(filter);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_SECURITY',
        'AuditLog',
        null,
        { pagination: { page, limit } },
        req
      );

      res.json({
        success: true,
        data: {
          securityEvents,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Güvenlik olayları getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Güvenlik olayları getirilemedi'
      });
    }
  },

  /**
   * Audit log istatistiklerini getir
   */
  async getAuditStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Temel tarih filtresi
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
        if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
      }

      // Toplam log sayısı
      const totalLogs = await AuditLog.countDocuments(dateFilter);

      // Aksiyon türlerine göre dağılım
      const actionStats = await AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Kaynak türlerine göre dağılım
      const resourceStats = await AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Severity dağılımı
      const severityStats = await AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]);

      // En aktif kullanıcılar
      const userStats = await AuditLog.aggregate([
        { $match: { ...dateFilter, userId: { $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { 
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            count: 1,
            username: '$user.username',
            email: '$user.email'
          }
        }
      ]);

      // Son 7 günlük aktivite grafiği
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      
      const dailyActivity = await AuditLog.aggregate([
        { 
          $match: { 
            timestamp: { $gte: last7Days } 
          } 
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_STATISTICS',
        'AuditLog',
        null,
        { dateRange: { startDate, endDate } },
        req
      );

      res.json({
        success: true,
        data: {
          summary: {
            totalLogs,
            dateRange: { startDate, endDate }
          },
          actionStats,
          resourceStats,
          severityStats,
          userStats,
          dailyActivity
        }
      });
    } catch (error) {
      console.error('Audit istatistikleri getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Audit istatistikleri getirilemedi'
      });
    }
  },

  /**
   * Kullanıcı aktivite raporunu getir
   */
  async getUserActivityReport(req, res) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      // Kullanıcının varlığını kontrol et
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      const dateFilter = { userId };
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
        if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
      }

      // Toplam aktivite sayısı
      const totalActivities = await AuditLog.countDocuments(dateFilter);

      // Aksiyon türlerine göre dağılım
      const actionBreakdown = await AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Son aktiviteler
      const recentActivities = await AuditLog.find(dateFilter)
        .sort({ timestamp: -1 })
        .limit(20);

      // Günlük aktivite dağılımı
      const dailyActivity = await AuditLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Login aktiviteleri
      const loginStats = await AuditLog.aggregate([
        { 
          $match: { 
            ...dateFilter,
            action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'] }
          } 
        },
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_USER_REPORT',
        'AuditLog',
        null,
        { targetUserId: userId, dateRange: { startDate, endDate } },
        req
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          },
          summary: {
            totalActivities,
            dateRange: { startDate, endDate }
          },
          actionBreakdown,
          recentActivities,
          dailyActivity,
          loginStats
        }
      });
    } catch (error) {
      console.error('Kullanıcı aktivite raporu getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Kullanıcı aktivite raporu getirilemedi'
      });
    }
  },

  /**
   * Sistem aktivite raporunu getir
   */
  async getSystemActivityReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
        if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
      }

      // Genel istatistikler
      const totalEvents = await AuditLog.countDocuments(dateFilter);
      const uniqueUsers = await AuditLog.distinct('userId', dateFilter);
      const uniqueIPs = await AuditLog.distinct('ipAddress', dateFilter);

      // Sistem olayları
      const systemEvents = await AuditLog.aggregate([
        { 
          $match: { 
            ...dateFilter,
            $or: [
              { action: { $regex: /^SYSTEM_/ } },
              { resource: 'System' },
              { severity: { $in: ['HIGH', 'CRITICAL'] } }
            ]
          } 
        },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Hata olayları
      const errorEvents = await AuditLog.aggregate([
        { 
          $match: { 
            ...dateFilter,
            $or: [
              { action: { $regex: /FAILED|ERROR/ } },
              { severity: { $in: ['HIGH', 'CRITICAL'] } }
            ]
          } 
        },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // IP adresi aktiviteleri
      const ipActivity = await AuditLog.aggregate([
        { $match: { ...dateFilter, ipAddress: { $ne: null } } },
        { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Performans metrikleri
      const performanceMetrics = await AuditLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
            minResponseTime: { $min: '$responseTime' }
          }
        }
      ]);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_VIEW_SYSTEM_REPORT',
        'AuditLog',
        null,
        { dateRange: { startDate, endDate } },
        req
      );

      res.json({
        success: true,
        data: {
          summary: {
            totalEvents,
            uniqueUsers: uniqueUsers.length,
            uniqueIPs: uniqueIPs.length,
            dateRange: { startDate, endDate }
          },
          systemEvents,
          errorEvents,
          ipActivity,
          performanceMetrics: performanceMetrics[0] || {}
        }
      });
    } catch (error) {
      console.error('Sistem aktivite raporu getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Sistem aktivite raporu getirilemedi'
      });
    }
  },

  /**
   * Gelişmiş arama ile audit logları filtrele
   */
  async searchAuditLogs(req, res) {
    try {
      const { 
        searchText,
        actions,
        resources,
        userIds,
        severity,
        startDate,
        endDate,
        ipAddress,
        page = 1,
        limit = 50
      } = req.body;

      // Arama filtresi oluştur
      const filter = {};
      
      // Metin araması
      if (searchText) {
        filter.$or = [
          { description: { $regex: searchText, $options: 'i' } },
          { details: { $regex: searchText, $options: 'i' } },
          { userAgent: { $regex: searchText, $options: 'i' } }
        ];
      }

      // Çoklu filtreler
      if (actions && actions.length > 0) {
        filter.action = { $in: actions };
      }
      
      if (resources && resources.length > 0) {
        filter.resource = { $in: resources };
      }
      
      if (userIds && userIds.length > 0) {
        filter.userId = { $in: userIds };
      }
      
      if (severity && severity.length > 0) {
        filter.severity = { $in: severity };
      }
      
      if (ipAddress) {
        filter.ipAddress = ipAddress;
      }

      // Tarih aralığı
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const auditLogs = await AuditLog.find(filter)
        .populate('userId', 'username email firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await AuditLog.countDocuments(filter);

      // Audit log kaydı
      await logAuditEvent(
        req.user.id,
        'AUDIT_SEARCH',
        'AuditLog',
        null,
        { searchCriteria: req.body },
        req
      );

      res.json({
        success: true,
        data: {
          auditLogs,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          },
          searchCriteria: req.body
        }
      });
    } catch (error) {
      console.error('Audit log arama hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Audit log araması gerçekleştirilemedi'
      });
    }
  },

  /**
   * Audit logları dışa aktar
   */
  async exportAuditLogs(req, res) {
    try {
      const { format = 'csv', ...filters } = req.query;
      
      // Export işlemi için audit log
      await logAuditEvent(
        req.user.id,
        'AUDIT_EXPORT',
        'AuditLog',
        null,
        { format, filters },
        req
      );

      // Bu fonksiyon gerçek export işlemini yapar
      // Şimdilik placeholder olarak işaretleyeceğiz
      res.json({
        success: true,
        message: 'Export işlemi başlatıldı',
        data: {
          status: 'PROCESSING',
          format,
          filters
        }
      });
    } catch (error) {
      console.error('Audit log export hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Audit logları dışa aktarılamadı'
      });
    }
  },

  /**
   * Eski audit logları temizle
   */
  async cleanupOldLogs(req, res) {
    try {
      const { retentionDays = 365 } = req.body;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      // Cleanup işlemi için audit log
      await logAuditEvent(
        req.user.id,
        'AUDIT_CLEANUP',
        'AuditLog',
        null,
        { retentionDays, deletedCount: result.deletedCount },
        req
      );

      res.json({
        success: true,
        message: 'Eski audit logları başarıyla temizlendi',
        data: {
          deletedCount: result.deletedCount,
          retentionDays,
          cutoffDate
        }
      });
    } catch (error) {
      console.error('Audit log temizleme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Audit logları temizlenemedi'
      });
    }
  },

  /**
   * Dashboard verilerini getir
   */
  async getDashboardData(req, res) {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Son 24 saat aktivite
      const last24HoursActivity = await AuditLog.countDocuments({
        timestamp: { $gte: last24Hours }
      });

      // Son 7 gün aktivite
      const last7DaysActivity = await AuditLog.countDocuments({
        timestamp: { $gte: last7Days }
      });

      // Kritik olaylar
      const criticalEvents = await AuditLog.countDocuments({
        timestamp: { $gte: last24Hours },
        severity: { $in: ['HIGH', 'CRITICAL'] }
      });

      // Güvenlik olayları
      const securityEvents = await AuditLog.countDocuments({
        timestamp: { $gte: last24Hours },
        action: { 
          $in: ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PERMISSION_DENIED'] 
        }
      });

      // En son aktiviteler
      const recentActivities = await AuditLog.find({})
        .populate('userId', 'username email')
        .sort({ timestamp: -1 })
        .limit(10);

      // Saatlik aktivite dağılımı (son 24 saat)
      const hourlyActivity = await AuditLog.aggregate([
        { 
          $match: { 
            timestamp: { $gte: last24Hours } 
          } 
        },
        {
          $group: {
            _id: {
              $hour: '$timestamp'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            last24HoursActivity,
            last7DaysActivity,
            criticalEvents,
            securityEvents
          },
          recentActivities,
          hourlyActivity
        }
      });
    } catch (error) {
      console.error('Dashboard verisi getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Dashboard verileri getirilemedi'
      });
    }
  },

  /**
   * Gerçek zamanlı audit olayları
   */
  async getRealTimeEvents(req, res) {
    try {
      // WebSocket veya Server-Sent Events için placeholder
      // Gerçek zamanlı event stream implementasyonu
      res.json({
        success: true,
        message: 'Gerçek zamanlı audit olayları aktif',
        data: {
          status: 'CONNECTED',
          endpoint: '/api/audit/real-time'
        }
      });
    } catch (error) {
      console.error('Gerçek zamanlı olay hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Gerçek zamanlı olaylar başlatılamadı'
      });
    }
  }
};

module.exports = auditController;
