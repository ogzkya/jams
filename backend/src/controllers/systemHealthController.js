/**
 * Sistem Sağlığı ve Durum Kontrolü
 */
const mongoose = require('mongoose');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const { logError } = require('../../../utils/errorLogger');
const { testMongoDBConnection } = require('../../../utils/dbTester');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const execPromise = util.promisify(exec);

/**
 * Sistem durumu bilgisi
 */
const getSystemStatus = async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      uptime: 0,
      cpuUsage: 'N/A',
      memoryUsage: {
        total: 'N/A',
        free: 'N/A',
        usedPercent: 'N/A'
      },
      diskUsage: [],
      loadAverage: 'N/A',
      nodeVersion: process.version,
      platform: os.platform(),
      hostname: os.hostname()
    };

    try {
      status.uptime = os.uptime();
    } catch (error) {
      logError('Sistem durumu - Uptime alınamadı (systemHealthController):', error);
      status.uptime = 'Hata';
    }

    try {
      const cpus = os.cpus();
      // Basit CPU kullanımı (gerçek zamanlı doğru bir ölçüm için daha karmaşık bir yöntem gerekir)
      // Bu sadece anlık bir yük değildir, CPU model bilgisini verir.
      // Gerçek CPU yükü için os-utils gibi kütüphaneler veya platforma özel komutlar gerekebilir.
      status.cpuUsage = cpus.map(cpu => ({ model: cpu.model, speed: cpu.speed }));
    } catch (error) {
      logError('Sistem durumu - CPU bilgisi alınamadı (systemHealthController):', error);
      status.cpuUsage = 'Hata';
    }

    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      status.memoryUsage = {
        total: `${(totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        free: `${(freeMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        usedPercent: `${((usedMemory / totalMemory) * 100).toFixed(2)}%`
      };
    } catch (error) {
      logError('Sistem durumu - Bellek bilgisi alınamadı (systemHealthController):', error);
      status.memoryUsage = { total: 'Hata', free: 'Hata', usedPercent: 'Hata' };
    }

    try {
      // Disk kullanımı (Windows için farklı bir komut gerekir, örn: wmic logicaldisk get size,freespace,caption)
      // Bu 'df -h' komutu Linux/macOS için geçerlidir.
      if (os.platform() !== 'win32') {
        const { stdout } = await execPromise('df -h');
        status.diskUsage = stdout.split('\n').slice(1).map(line => {
          const parts = line.split(/\s+/);
          return {
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usage: parts[4],
            mounted: parts[5]
          };
        }).filter(d => d.filesystem);
      } else {
        // Windows için PowerShell komutu
         const { stdout } = await execPromise('powershell.exe "Get-Volume | Select-Object DriveLetter, FileSystemLabel, @{Name=\'Size(GB)\';Expression={[math]::Round($_.Size / 1GB, 2)}}, @{Name=\'FreeSpace(GB)\';Expression={[math]::Round($_.SizeRemaining / 1GB, 2)}} | ConvertTo-Json"');
        status.diskUsage = JSON.parse(stdout);
      }
    } catch (error) {
      logError('Sistem durumu - Disk bilgisi alınamadı (systemHealthController):', error);
      status.diskUsage = [{ error: 'Disk bilgisi alınamadı', details: error.message }];
    }
    
    try {
      status.loadAverage = os.loadavg().map(avg => avg.toFixed(2)).join(', ');
    } catch (error) {
      logError('Sistem durumu - Yük ortalaması alınamadı (systemHealthController):', error);
      status.loadAverage = 'Hata';
    }

    return successResponse(res, status, 'Sistem durumu başarıyla alındı.');
  } catch (error) {
    logError('ERROR', 'Sistem durumu kontrolü sırasında hata', error);
    return errorResponse(res, 'Sistem durumu bilgileri alınamadı', 500);
  }
};

/**
 * Detaylı veritabanı kontrolü
 */
const checkDatabaseHealth = async (req, res) => {
  try {
    // MongoDB detaylı test
    const dbTestResults = await testMongoDBConnection();
    
    if (!dbTestResults.success) {
      return errorResponse(res, 'Veritabanı bağlantısında sorun var', 500, {
        error: dbTestResults.error
      });
    }
    
    // Koleksiyon durumu
    const collectionStats = {};
    for (const collection of dbTestResults.collections) {
      try {
        const stats = await mongoose.connection.db.collection(collection).stats();
        collectionStats[collection] = {
          count: stats.count,
          size: stats.size,
          avgObjectSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          indexSize: stats.totalIndexSize,
          indexCount: Object.keys(dbTestResults.indexes[collection] || {}).length
        };
      } catch (collErr) {
        collectionStats[collection] = { error: collErr.message };
      }
    }
    
    return successResponse(res, 'Veritabanı sağlık kontrolü başarılı', {
      connection: {
        host: dbTestResults.host,
        database: dbTestResults.database,
        latency: dbTestResults.latency
      },
      collections: collectionStats,
      serverStatus: {
        version: dbTestResults.serverStatus?.version,
        uptime: dbTestResults.serverStatus?.uptime,
        connections: dbTestResults.serverStatus?.connections
      }
    });
    
  } catch (error) {
    logError('ERROR', 'Veritabanı sağlık kontrolü sırasında hata', error);
    return errorResponse(res, 'Veritabanı sağlık kontrolü başarısız', 500);
  }
};

/**
 * Servis erişilebilirlik kontrolü
 */
const checkServicesAvailability = async (req, res) => {
  // Bu özellik henüz implemente edilmemiştir.
  logError('Servis erişilebilirlik kontrolü özelliği henüz implemente edilmedi (systemHealthController).', null);
  return errorResponse(res, 'Servis erişilebilirlik kontrolü özelliği henüz implemente edilmemiştir.', 501);
};

module.exports = {
  getSystemStatus,
  checkDatabaseHealth,
  checkServicesAvailability
};
