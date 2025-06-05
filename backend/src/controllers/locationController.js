const Location = require('../models/Location');
const Device = require('../models/Device');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * Tüm lokasyonları listele (hiyerarşik yapı)
 */
const getLocations = async (req, res) => {
  try {
    const { type, parent, flat } = req.query;
    
    // Filtreleme koşulları
    const filter = { isActive: true };
    
    if (type) {
      filter.type = type;
    }
    
    if (parent) {
      filter.parent = parent === 'null' ? null : parent;
    }

    if (flat === 'true') {
      // Düz liste formatında
      const locations = await Location.find(filter)
        .populate('parent', 'name code type')
        .populate('organizationInfo.manager', 'firstName lastName')
        .sort({ code: 1 });

      return res.json({
        success: true,
        data: { locations }
      });
    }

    // Hiyerarşik yapı
    const locations = await Location.find(filter)
      .populate('parent', 'name code type')
      .populate('children')
      .populate('organizationInfo.manager', 'firstName lastName')
      .sort({ code: 1 });

    // Ana düğümleri (parent'ı olmayan) bul
    const rootLocations = locations.filter(loc => !loc.parent);

    // Her ana düğüm için alt ağacı oluştur
    const buildLocationTree = async (parentId) => {
      return await Location.find({ parent: parentId, isActive: true })
        .populate('organizationInfo.manager', 'firstName lastName')
        .sort({ code: 1 });
    };

    // Ana lokasyonlara çocuklarını ekle
    for (let location of rootLocations) {
      location.children = await buildLocationTree(location._id);
      
      // Alt lokasyonların da çocuklarını ekle (recursive)
      for (let child of location.children) {
        child.children = await buildLocationTree(child._id);
      }
    }

    res.json({
      success: true,
      data: { locations: rootLocations }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lokasyonlar listelenirken hata oluştu'
    });
  }
};

/**
 * Belirli bir lokasyonu getir
 */
const getLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id)
      .populate('parent', 'name code type')
      .populate('children')
      .populate('organizationInfo.manager', 'firstName lastName email');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Lokasyon bulunamadı'
      });
    }

    // Bu lokasyondaki cihaz sayısını al
    const deviceCount = await Device.countDocuments({ 
      'location.current': id, 
      isActive: true 
    });

    // Bu lokasyondaki aktif kullanıcı sayısını al (eğer departman/birim ise)
    let userCount = 0;
    if (['DEPARTMENT', 'UNIT'].includes(location.type)) {
      userCount = await User.countDocuments({ 
        department: location.name, 
        isActive: true 
      });
    }

    res.json({
      success: true,
      data: { 
        location: {
          ...location.toJSON(),
          deviceCount,
          userCount
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lokasyon bilgileri alınırken hata oluştu'
    });
  }
};

/**
 * Yeni lokasyon oluştur
 */
const createLocation = async (req, res) => {
  try {
    const locationData = req.body;

    // Parent lokasyon kontrolü
    if (locationData.parent) {
      const parentLocation = await Location.findById(locationData.parent);
      if (!parentLocation) {
        return res.status(404).json({
          success: false,
          message: 'Üst lokasyon bulunamadı'
        });
      }

      // Tip uyumluluğu kontrolü
      const validChildTypes = {
        'MAIN_BUILDING': ['FLOOR', 'DEPARTMENT'],
        'REMOTE_SITE': ['DEPARTMENT', 'UNIT'],
        'FLOOR': ['SECTION', 'ROOM'],
        'SECTION': ['ROOM'],
        'DEPARTMENT': ['UNIT', 'ROOM'],
        'UNIT': ['ROOM']
      };

      if (validChildTypes[parentLocation.type] && 
          !validChildTypes[parentLocation.type].includes(locationData.type)) {
        return res.status(400).json({
          success: false,
          message: `${parentLocation.type} tipindeki lokasyona ${locationData.type} tipi eklenemez`
        });
      }
    }

    const location = new Location(locationData);
    await location.save();

    // Audit log
    await AuditLog.logSuccess({
      action: 'LOCATION_CREATED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'LOCATION', id: location._id, name: location.name },
      details: { 
        description: 'Yeni lokasyon oluşturuldu',
        metadata: { 
          locationType: location.type,
          locationCode: location.code,
          parent: locationData.parent
        }
      },
      category: 'LOCATION',
      severity: 'LOW'
    });

    const populatedLocation = await Location.findById(location._id)
      .populate('parent', 'name code type');

    res.status(201).json({
      success: true,
      message: 'Lokasyon başarıyla oluşturuldu',
      data: { location: populatedLocation }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Lokasyon kodu zaten kullanımda'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lokasyon oluşturulurken hata oluştu'
    });
  }
};

/**
 * Lokasyon güncelle
 */
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Lokasyon bulunamadı'
      });
    }

    // Parent değişikliği kontrolü
    if (updates.parent && updates.parent !== location.parent?.toString()) {
      const newParent = await Location.findById(updates.parent);
      if (!newParent) {
        return res.status(404).json({
          success: false,
          message: 'Yeni üst lokasyon bulunamadı'
        });
      }

      // Döngüsel referans kontrolü
      const checkCircularReference = async (locationId, targetParentId) => {
        let current = await Location.findById(targetParentId);
        while (current) {
          if (current._id.toString() === locationId) {
            return true; // Döngüsel referans bulundu
          }
          current = await Location.findById(current.parent);
        }
        return false;
      };

      if (await checkCircularReference(id, updates.parent)) {
        return res.status(400).json({
          success: false,
          message: 'Döngüsel referans oluşturulamaz'
        });
      }
    }

    const oldLocationData = { ...location.toJSON() };

    const updatedLocation = await Location.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('parent', 'name code type')
     .populate('organizationInfo.manager', 'firstName lastName');

    // Audit log
    await AuditLog.logSuccess({
      action: 'LOCATION_UPDATED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'LOCATION', id: location._id, name: location.name },
      details: { 
        description: 'Lokasyon güncellendi',
        changes: {
          before: oldLocationData,
          after: updates
        }
      },
      category: 'LOCATION',
      severity: 'LOW'
    });

    res.json({
      success: true,
      message: 'Lokasyon başarıyla güncellendi',
      data: { location: updatedLocation }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Lokasyon kodu zaten kullanımda'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lokasyon güncellenirken hata oluştu'
    });
  }
};

/**
 * Lokasyon sil (soft delete)
 */
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Lokasyon bulunamadı'
      });
    }

    // Alt lokasyon kontrolü
    const childCount = await Location.countDocuments({ parent: id, isActive: true });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Alt lokasyonları olan lokasyon silinemez'
      });
    }

    // Bu lokasyondaki cihaz kontrolü
    const deviceCount = await Device.countDocuments({ 
      'location.current': id, 
      isActive: true 
    });
    if (deviceCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'İçinde cihaz bulunan lokasyon silinemez'
      });
    }

    // Soft delete
    await Location.findByIdAndUpdate(id, { isActive: false });

    // Audit log
    await AuditLog.logSuccess({
      action: 'LOCATION_DELETED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'LOCATION', id: location._id, name: location.name },
      details: { 
        description: 'Lokasyon silindi (soft delete)',
        metadata: { 
          locationType: location.type,
          locationCode: location.code
        }
      },
      category: 'LOCATION',
      severity: 'MEDIUM'
    });

    res.json({
      success: true,
      message: 'Lokasyon başarıyla silindi'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lokasyon silinirken hata oluştu'
    });
  }
};

/**
 * Lokasyon kat planı yükle/güncelle
 */
const uploadFloorPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { svgData, coordinates } = req.body;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Lokasyon bulunamadı'
      });
    }

    if (location.type !== 'FLOOR') {
      return res.status(400).json({
        success: false,
        message: 'Kat planı sadece FLOOR tipindeki lokasyonlara yüklenebilir'
      });
    }

    // Kat planı bilgilerini güncelle
    location.floorInfo.floorPlan = {
      svgData,
      coordinates: coordinates || [],
      uploadedDate: new Date()
    };

    await location.save();

    // Audit log
    await AuditLog.logSuccess({
      action: 'FLOOR_PLAN_UPLOADED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'LOCATION', id: location._id, name: location.name },
      details: { 
        description: 'Kat planı yüklendi/güncellendi',
        metadata: { 
          coordinateCount: coordinates?.length || 0
        }
      },
      category: 'LOCATION',
      severity: 'LOW'
    });

    res.json({
      success: true,
      message: 'Kat planı başarıyla yüklendi',
      data: { location }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kat planı yüklenirken hata oluştu'
    });
  }
};

/**
 * Belirli bir lokasyondaki cihazları listele
 */
const getLocationDevices = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Lokasyon bulunamadı'
      });
    }

    const devices = await Device.find({ 
      'location.current': id, 
      isActive: true 
    })
    .populate('assignment.assignedTo', 'firstName lastName email')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

    const total = await Device.countDocuments({ 
      'location.current': id, 
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        location: {
          _id: location._id,
          name: location.name,
          code: location.code,
          type: location.type
        },
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
      message: 'Lokasyon cihazları alınırken hata oluştu'
    });
  }
};

/**
 * Lokasyon istatistikleri
 */
const getLocationStats = async (req, res) => {
  try {
    // Tip bazında dağılım
    const typeDistribution = await Location.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Ana binalar ve kat sayıları
    const buildingStats = await Location.aggregate([
      { 
        $match: { 
          type: 'MAIN_BUILDING',
          isActive: true 
        } 
      },
      {
        $lookup: {
          from: 'locations',
          localField: '_id',
          foreignField: 'parent',
          as: 'floors'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          floorCount: { $size: '$floors' }
        }
      }
    ]);

    // Toplam oda sayısı
    const totalRooms = await Location.countDocuments({ 
      type: 'ROOM', 
      isActive: true 
    });

    // Uzak lokasyon sayısı
    const remoteSites = await Location.countDocuments({ 
      type: 'REMOTE_SITE', 
      isActive: true 
    });

    // Lokasyonlardaki cihaz dağılımı
    const deviceDistribution = await Location.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'devices',
          localField: '_id',
          foreignField: 'location.current',
          as: 'devices'
        }
      },
      {
        $project: {
          name: 1,
          type: 1,
          deviceCount: { 
            $size: {
              $filter: {
                input: '$devices',
                cond: { $eq: ['$$this.isActive', true] }
              }
            }
          }
        }
      },
      { $match: { deviceCount: { $gt: 0 } } },
      { $sort: { deviceCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalLocations: await Location.countDocuments({ isActive: true }),
          totalRooms,
          remoteSites,
          buildingCount: buildingStats.length
        },
        typeDistribution,
        buildingStats,
        deviceDistribution
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lokasyon istatistikleri alınırken hata oluştu'
    });
  }
};

module.exports = {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  uploadFloorPlan,
  getLocationDevices,
  getLocationStats
};
