const Device = require('../models/Device');
const Location = require('../models/Location');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Tüm cihazları listele
 */
const getDevices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type;
    const category = req.query.category;
    const status = req.query.status;
    const location = req.query.location;
    const assignedTo = req.query.assignedTo;
    const warrantyStatus = req.query.warrantyStatus;

    // Filtreleme koşulları
    const filter = { isActive: true };

    // Arama
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { assetTag: { $regex: search, $options: 'i' } },
        { 'networkInfo.ipAddress': { $regex: search, $options: 'i' } },
        { 'networkInfo.hostname': { $regex: search, $options: 'i' } }
      ];
    }

    // Tip filtresi
    if (type) {
      filter.type = type;
    }

    // Kategori filtresi
    if (category) {
      filter.category = category;
    }

    // Durum filtresi
    if (status) {
      filter['status.operational'] = status;
    }

    // Lokasyon filtresi
    if (location) {
      filter['location.current'] = location;
    }

    // Atama filtresi
    if (assignedTo) {
      filter['assignment.assignedTo'] = assignedTo;
    }

    // Garanti durumu filtresi
    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'locations',
          localField: 'location.current',
          foreignField: '_id',
          as: 'currentLocation'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignment.assignedTo',
          foreignField: '_id',
          as: 'assignedUser'
        }
      }
    ];

    // Garanti durumu hesaplama ve filtreleme
    if (warrantyStatus) {
      pipeline.push({
        $addFields: {
          warrantyStatus: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$procurement.warrantyEndDate', null] },
                  then: 'NO_WARRANTY'
                },
                {
                  case: { $lt: ['$procurement.warrantyEndDate', new Date()] },
                  then: 'EXPIRED'
                },
                {
                  case: { 
                    $lte: [
                      { $subtract: ['$procurement.warrantyEndDate', new Date()] },
                      30 * 24 * 60 * 60 * 1000 // 30 gün
                    ]
                  },
                  then: 'EXPIRING_SOON'
                }
              ],
              default: 'ACTIVE'
            }
          }
        }
      });

      pipeline.push({
        $match: { warrantyStatus: warrantyStatus }
      });
    }

    // Sayfalama ve sıralama
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          name: 1,
          type: 1,
          category: 1,
          brand: 1,
          model: 1,
          serialNumber: 1,
          assetTag: 1,
          networkInfo: 1,
          'location.current': 1,
          currentLocation: { $arrayElemAt: ['$currentLocation', 0] },
          'assignment.assignedTo': 1,
          assignedUser: { $arrayElemAt: ['$assignedUser', 0] },
          status: 1,
          procurement: 1,
          qrCode: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
          warrantyStatus: 1
        }
      }
    );

    const devices = await Device.aggregate(pipeline);
    const total = await Device.countDocuments(filter);

    res.json({
      success: true,
      data: {
        devices,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalDevices: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cihazlar listelenirken hata oluştu'
    });
  }
};

/**
 * Belirli bir cihazı getir
 */
const getDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id)
      .populate('location.current')
      .populate('assignment.assignedTo', 'firstName lastName email department')
      .populate('assignment.assignedBy', 'firstName lastName')
      .populate('location.history.location')
      .populate('location.history.movedBy', 'firstName lastName');

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Cihaz bulunamadı'
      });
    }

    res.json({
      success: true,
      data: { device }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cihaz bilgileri alınırken hata oluştu'
    });
  }
};

/**
 * Yeni cihaz oluştur
 */
const createDevice = async (req, res) => {
  try {
    const deviceData = req.body;

    // QR kod oluştur
    const qrCodeData = crypto.randomUUID();
    const qrCodeUrl = await QRCode.toDataURL(qrCodeData);

    deviceData.qrCode = {
      code: qrCodeData,
      generatedDate: new Date(),
      scanCount: 0
    };

    const device = new Device(deviceData);
    await device.save();

    // Audit log
    await AuditLog.logSuccess({
      action: 'DEVICE_CREATED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'DEVICE', id: device._id, name: device.name },
      details: { 
        description: 'Yeni cihaz oluşturuldu',
        metadata: { 
          deviceType: device.type,
          serialNumber: device.serialNumber,
          location: device.location.current
        }
      },
      category: 'INVENTORY',
      severity: 'LOW'
    });

    const populatedDevice = await Device.findById(device._id)
      .populate('location.current')
      .populate('assignment.assignedTo', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Cihaz başarıyla oluşturuldu',
      data: { 
        device: populatedDevice,
        qrCodeUrl
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'serialNumber' ? 'Seri numarası' : 'Asset Tag'} zaten kullanımda`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Cihaz oluşturulurken hata oluştu'
    });
  }
};

/**
 * Cihaz güncelle
 */
const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Cihaz bulunamadı'
      });
    }

    const oldDeviceData = { ...device.toJSON() };

    // Lokasyon değişikliği takibi
    if (updates.location && updates.location.current && 
        updates.location.current !== device.location.current.toString()) {
      
      // Lokasyon geçmişine ekle
      if (!updates.location.history) {
        updates.location.history = device.location.history || [];
      }
      
      updates.location.history.push({
        location: device.location.current,
        movedDate: new Date(),
        movedBy: req.user._id,
        reason: updates.locationChangeReason || 'Manuel güncelleme'
      });
    }

    const updatedDevice = await Device.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('location.current')
     .populate('assignment.assignedTo', 'firstName lastName email');

    // Audit log
    await AuditLog.logSuccess({
      action: 'DEVICE_UPDATED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'DEVICE', id: device._id, name: device.name },
      details: { 
        description: 'Cihaz güncellendi',
        changes: {
          before: oldDeviceData,
          after: updates
        }
      },
      category: 'INVENTORY',
      severity: 'LOW'
    });

    res.json({
      success: true,
      message: 'Cihaz başarıyla güncellendi',
      data: { device: updatedDevice }
    });

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'serialNumber' ? 'Seri numarası' : 'Asset Tag'} zaten kullanımda`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Cihaz güncellenirken hata oluştu'
    });
  }
};

/**
 * Cihaz sil (soft delete)
 */
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Cihaz bulunamadı'
      });
    }

    // Soft delete
    await Device.findByIdAndUpdate(id, { isActive: false });

    // Audit log
    await AuditLog.logSuccess({
      action: 'DEVICE_DELETED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'DEVICE', id: device._id, name: device.name },
      details: { 
        description: 'Cihaz silindi (soft delete)',
        metadata: { 
          deviceType: device.type,
          serialNumber: device.serialNumber
        }
      },
      category: 'INVENTORY',
      severity: 'MEDIUM'
    });

    res.json({
      success: true,
      message: 'Cihaz başarıyla silindi'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cihaz silinirken hata oluştu'
    });
  }
};

/**
 * Cihaz ata/atamasını kaldır
 */
const assignDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, department, unit } = req.body;

    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Cihaz bulunamadı'
      });
    }

    const oldAssignment = device.assignment;

    if (assignedTo) {
      // Kullanıcıyı kontrol et
      const user = await User.findById(assignedTo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Atanacak kullanıcı bulunamadı'
        });
      }

      device.assignment = {
        assignedTo,
        department: department || user.department,
        unit,
        assignedDate: new Date(),
        assignedBy: req.user._id
      };
    } else {
      // Atamasını kaldır
      device.assignment = {
        assignedTo: null,
        department: null,
        unit: null,
        assignedDate: null,
        assignedBy: null
      };
    }

    await device.save();

    // Audit log
    await AuditLog.logSuccess({
      action: assignedTo ? 'DEVICE_ASSIGNED' : 'DEVICE_UNASSIGNED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'DEVICE', id: device._id, name: device.name },
      details: { 
        description: assignedTo ? 'Cihaz atandı' : 'Cihaz ataması kaldırıldı',
        changes: {
          before: oldAssignment,
          after: device.assignment
        }
      },
      category: 'INVENTORY',
      severity: 'LOW'
    });

    const updatedDevice = await Device.findById(id)
      .populate('assignment.assignedTo', 'firstName lastName email department');

    res.json({
      success: true,
      message: assignedTo ? 'Cihaz başarıyla atandı' : 'Cihaz ataması kaldırıldı',
      data: { device: updatedDevice }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cihaz atama işlemi sırasında hata oluştu'
    });
  }
};

/**
 * Cihaz lokasyonunu değiştir
 */
const moveDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { newLocationId, reason } = req.body;

    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Cihaz bulunamadı'
      });
    }

    // Yeni lokasyonu kontrol et
    const newLocation = await Location.findById(newLocationId);
    if (!newLocation) {
      return res.status(404).json({
        success: false,
        message: 'Yeni lokasyon bulunamadı'
      });
    }

    const oldLocation = device.location.current;

    // Lokasyon geçmişine ekle
    device.location.history.push({
      location: oldLocation,
      movedDate: new Date(),
      movedBy: req.user._id,
      reason: reason || 'Manuel taşıma'
    });

    device.location.current = newLocationId;
    await device.save();

    // Audit log
    await AuditLog.logSuccess({
      action: 'DEVICE_MOVED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'DEVICE', id: device._id, name: device.name },
      details: { 
        description: 'Cihaz taşındı',
        metadata: {
          fromLocation: oldLocation,
          toLocation: newLocationId,
          reason: reason
        }
      },
      category: 'INVENTORY',
      severity: 'LOW'
    });

    const updatedDevice = await Device.findById(id)
      .populate('location.current')
      .populate('location.history.location')
      .populate('location.history.movedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Cihaz başarıyla taşındı',
      data: { device: updatedDevice }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cihaz taşıma işlemi sırasında hata oluştu'
    });
  }
};

/**
 * QR kod tarama
 */
const scanQRCode = async (req, res) => {
  try {
    const { qrCode } = req.body;

    const device = await Device.findOne({ 'qrCode.code': qrCode })
      .populate('location.current')
      .populate('assignment.assignedTo', 'firstName lastName email department');

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'QR kod ile eşleşen cihaz bulunamadı'
      });
    }

    // Tarama sayısını artır ve son tarama tarihini güncelle
    device.qrCode.scanCount += 1;
    device.qrCode.lastScanned = new Date();
    await device.save();

    // Audit log
    await AuditLog.logSuccess({
      action: 'DEVICE_QR_SCANNED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'DEVICE', id: device._id, name: device.name },
      details: { 
        description: 'Cihaz QR kodu tarandı',
        metadata: { scanCount: device.qrCode.scanCount }
      },
      category: 'INVENTORY',
      severity: 'LOW'
    });

    res.json({
      success: true,
      message: 'Cihaz bulundu',
      data: { device }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'QR kod tarama sırasında hata oluştu'
    });
  }
};

/**
 * Cihaz istatistikleri
 */
const getDeviceStats = async (req, res) => {
  try {
    // Genel istatistikler
    const totalDevices = await Device.countDocuments({ isActive: true });
    const activeDevices = await Device.countDocuments({ 
      isActive: true, 
      'status.operational': 'ACTIVE' 
    });

    // Tip bazında dağılım
    const typeDistribution = await Device.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Durum bazında dağılım
    const statusDistribution = await Device.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status.operational', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Lokasyon bazında dağılım
    const locationStats = await Device.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'locations',
          localField: 'location.current',
          foreignField: '_id',
          as: 'currentLocation'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$currentLocation.name', 0] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Garanti durumu
    const warrantyStats = await Device.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          warrantyStatus: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$procurement.warrantyEndDate', null] },
                  then: 'NO_WARRANTY'
                },
                {
                  case: { $lt: ['$procurement.warrantyEndDate', new Date()] },
                  then: 'EXPIRED'
                },
                {
                  case: { 
                    $lte: [
                      { $subtract: ['$procurement.warrantyEndDate', new Date()] },
                      30 * 24 * 60 * 60 * 1000
                    ]
                  },
                  then: 'EXPIRING_SOON'
                }
              ],
              default: 'ACTIVE'
            }
          }
        }
      },
      {
        $group: {
          _id: '$warrantyStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Yakın zamanda eklenen cihazlar
    const recentDevices = await Device.countDocuments({
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalDevices,
          activeDevices,
          inactiveDevices: totalDevices - activeDevices,
          recentDevices
        },
        typeDistribution,
        statusDistribution,
        locationDistribution: locationStats,
        warrantyStats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cihaz istatistikleri alınırken hata oluştu'
    });
  }
};

module.exports = {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,  
  deleteDevice,
  assignDevice,
  moveDevice,
  scanQRCode,
  getDeviceStats
};
