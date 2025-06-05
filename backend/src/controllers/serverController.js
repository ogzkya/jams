const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const Server = require('../models/Server');
const AuditLog = require('../models/AuditLog');
const Device = require('../models/Device');
const { logAuditEvent } = require('../utils/auditHelper');
const { encrypt, decrypt } = require('../utils/encryption');

const execAsync = promisify(exec);

/**
 * Sunucu Yönetimi Controller'ı
 * Güvenli script çalıştırma ve sistem yönetimi araçları
 */

// İzin verilen komutlar listesi (güvenlik için)
const ALLOWED_COMMANDS = {
  'ping': {
    command: 'ping',
    description: 'Ping test',
    requiresElevation: false,
    maxExecutionTime: 30000
  },
  'ipconfig': {
    command: 'ipconfig',
    description: 'IP yapılandırması',
    requiresElevation: false,
    maxExecutionTime: 10000
  },
  'nslookup': {
    command: 'nslookup',
    description: 'DNS sorgusu',
    requiresElevation: false,
    maxExecutionTime: 15000
  },
  'netstat': {
    command: 'netstat',
    description: 'Ağ bağlantıları',
    requiresElevation: false,
    maxExecutionTime: 10000
  },
  'systeminfo': {
    command: 'systeminfo',
    description: 'Sistem bilgileri',
    requiresElevation: false,
    maxExecutionTime: 30000
  },
  'tasklist': {
    command: 'tasklist',
    description: 'Çalışan işlemler',
    requiresElevation: false,
    maxExecutionTime: 15000
  },
  'get-service': {
    command: 'Get-Service',
    description: 'Windows servisleri',
    requiresElevation: false,
    maxExecutionTime: 20000,
    shell: 'powershell'
  },
  'get-process': {
    command: 'Get-Process',
    description: 'Çalışan işlemler (PowerShell)',
    requiresElevation: false,
    maxExecutionTime: 15000,
    shell: 'powershell'
  },
  'get-disk-space': {
    command: 'Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}',
    description: 'Disk alanı bilgileri',
    requiresElevation: false,
    maxExecutionTime: 10000,
    shell: 'powershell'
  }
};

/**
 * İzin verilen komutları listele
 */
const getAvailableCommands = async (req, res) => {
  try {
    const commands = Object.entries(ALLOWED_COMMANDS).map(([key, config]) => ({
      key,
      description: config.description,
      requiresElevation: config.requiresElevation,
      shell: config.shell || 'cmd'
    }));

    res.json({
      success: true,
      data: { commands }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Komutlar listelenirken hata oluştu'
    });
  }
};

/**
 * Güvenli komut çalıştırma
 */
const executeCommand = async (req, res) => {
  try {
    const { commandKey, parameters = [] } = req.body;

    // Komut kontrolü
    const commandConfig = ALLOWED_COMMANDS[commandKey];
    if (!commandConfig) {
      await AuditLog.logFailure({
        action: 'COMMAND_EXECUTION_DENIED',
        user: req.user._id,
        username: req.user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: 'command_execution' },
        details: { 
          description: 'İzin verilmeyen komut çalıştırma denemesi',
          metadata: { attemptedCommand: commandKey }
        },
        category: 'SECURITY',
        severity: 'HIGH'
      });

      return res.status(403).json({
        success: false,
        message: 'Bu komutun çalıştırılması izin verilmiyor'
      });
    }

    // Parametreleri temizle ve güvenlik kontrolü yap
    const sanitizedParams = parameters
      .filter(param => typeof param === 'string')
      .map(param => param.replace(/[;&|`$()]/g, '')) // Tehlikeli karakterleri kaldır
      .slice(0, 10); // Maksimum 10 parametre

    // Komutu oluştur
    let fullCommand = commandConfig.command;
    if (sanitizedParams.length > 0) {
      fullCommand += ' ' + sanitizedParams.join(' ');
    }

    const executionStartTime = Date.now();

    // Audit log - başlangıç
    await AuditLog.logSuccess({
      action: 'COMMAND_EXECUTION_STARTED',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'SYSTEM', name: 'command_execution' },
      details: { 
        description: 'Komut çalıştırma başlatıldı',
        metadata: { 
          command: commandKey,
          parameters: sanitizedParams,
          fullCommand: fullCommand
        }
      },
      category: 'SYSTEM',
      severity: 'LOW'
    });

    // Komutu çalıştır
    const execOptions = {
      timeout: commandConfig.maxExecutionTime,
      maxBuffer: 1024 * 1024, // 1MB
      shell: commandConfig.shell === 'powershell' ? 'powershell.exe' : 'cmd.exe'
    };

    try {
      const { stdout, stderr } = await execAsync(fullCommand, execOptions);
      const executionTime = Date.now() - executionStartTime;

      // Başarılı çalıştırma audit log
      await AuditLog.logSuccess({
        action: 'COMMAND_EXECUTION_COMPLETED',
        user: req.user._id,
        username: req.user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: 'command_execution' },
        details: { 
          description: 'Komut başarıyla çalıştırıldı',
          metadata: { 
            command: commandKey,
            executionTime: `${executionTime}ms`,
            outputLength: stdout.length
          }
        },
        category: 'SYSTEM',
        severity: 'LOW'
      });

      res.json({
        success: true,
        data: {
          command: commandKey,
          description: commandConfig.description,
          output: stdout,
          error: stderr,
          executionTime: `${executionTime}ms`,
          timestamp: new Date().toISOString()
        }
      });

    } catch (execError) {
      const executionTime = Date.now() - executionStartTime;

      // Hatalı çalıştırma audit log
      await AuditLog.logError({
        action: 'COMMAND_EXECUTION_FAILED',
        user: req.user._id,
        username: req.user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: 'command_execution' },
        details: { 
          description: 'Komut çalıştırma hatası',
          metadata: { 
            command: commandKey,
            executionTime: `${executionTime}ms`,
            errorMessage: execError.message
          }
        },
        category: 'SYSTEM',
        severity: 'MEDIUM'
      });

      res.status(400).json({
        success: false,
        message: 'Komut çalıştırma hatası',
        error: execError.message,
        executionTime: `${executionTime}ms`
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Komut çalıştırılırken sistem hatası oluştu'
    });
  }
};

/**
 * Sistem durumu kontrolü
 */
const getSystemStatus = async (req, res) => {
  try {
    const statusChecks = [];

    // Disk alanı kontrolü
    try {
      const { stdout } = await execAsync(
        'Get-WmiObject -Class Win32_LogicalDisk | ConvertTo-Json',
        { shell: 'powershell.exe', timeout: 10000 }
      );
      
      const disks = JSON.parse(stdout);
      const diskInfo = (Array.isArray(disks) ? disks : [disks]).map(disk => ({
        drive: disk.DeviceID,
        totalSize: Math.round(disk.Size / (1024 * 1024 * 1024)),
        freeSpace: Math.round(disk.FreeSpace / (1024 * 1024 * 1024)),
        usagePercent: Math.round(((disk.Size - disk.FreeSpace) / disk.Size) * 100)
      }));

      statusChecks.push({
        name: 'Disk Alanı',
        status: diskInfo.every(d => d.usagePercent < 90) ? 'OK' : 'WARNING',
        details: diskInfo
      });
    } catch (error) {
      statusChecks.push({
        name: 'Disk Alanı',
        status: 'ERROR',
        error: error.message
      });
    }

    // Bellek kullanımı
    try {
      const { stdout } = await execAsync(
        'Get-WmiObject -Class Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertTo-Json',
        { shell: 'powershell.exe', timeout: 10000 }
      );
      
      const memory = JSON.parse(stdout);
      const totalMemoryGB = Math.round(memory.TotalVisibleMemorySize / (1024 * 1024));
      const freeMemoryGB = Math.round(memory.FreePhysicalMemory / (1024 * 1024));
      const usagePercent = Math.round(((totalMemoryGB - freeMemoryGB) / totalMemoryGB) * 100);

      statusChecks.push({
        name: 'Bellek Kullanımı',
        status: usagePercent < 85 ? 'OK' : 'WARNING',
        details: {
          totalMemoryGB,
          freeMemoryGB,
          usagePercent
        }
      });
    } catch (error) {
      statusChecks.push({
        name: 'Bellek Kullanımı',
        status: 'ERROR',
        error: error.message
      });
    }

    // CPU kullanımı
    try {
      const { stdout } = await execAsync(
        'Get-WmiObject win32_processor | Measure-Object -property LoadPercentage -Average | Select-Object Average | ConvertTo-Json',
        { shell: 'powershell.exe', timeout: 10000 }
      );
      
      const cpu = JSON.parse(stdout);
      const cpuUsage = Math.round(cpu.Average);

      statusChecks.push({
        name: 'CPU Kullanımı',
        status: cpuUsage < 80 ? 'OK' : 'WARNING',
        details: {
          cpuUsagePercent: cpuUsage
        }
      });
    } catch (error) {
      statusChecks.push({
        name: 'CPU Kullanımı',
        status: 'ERROR',
        error: error.message
      });
    }

    // Genel sistem durumu
    const overallStatus = statusChecks.every(check => check.status === 'OK') ? 'HEALTHY' :
                         statusChecks.some(check => check.status === 'ERROR') ? 'CRITICAL' : 'WARNING';

    res.json({
      success: true,
      data: {
        overallStatus,
        checks: statusChecks,
        timestamp: new Date().toISOString(),
        hostname: process.env.COMPUTERNAME || 'Unknown'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sistem durumu alınırken hata oluştu'
    });
  }
};

/**
 * Ağ cihazlarına ping testi
 */
const pingDevices = async (req, res) => {
  try {
    const { deviceIds, ipAddresses } = req.body;
    const results = [];

    // Cihaz ID'lerinden IP adreslerini al
    let targetIPs = ipAddresses || [];
    
    if (deviceIds && deviceIds.length > 0) {
      const devices = await Device.find({ 
        _id: { $in: deviceIds }, 
        isActive: true,
        'networkInfo.ipAddress': { $exists: true, $ne: '' }
      }).select('name networkInfo.ipAddress');

      targetIPs = targetIPs.concat(
        devices.map(device => ({
          ip: device.networkInfo.ipAddress,
          name: device.name,
          deviceId: device._id
        }))
      );
    }

    // Her IP adresine ping at
    for (const target of targetIPs) {
      const ip = typeof target === 'string' ? target : target.ip;
      const name = typeof target === 'string' ? ip : target.name;
      
      try {
        const { stdout } = await execAsync(`ping -n 4 ${ip}`, { 
          timeout: 10000,
          shell: 'cmd.exe'
        });

        // Ping sonucunu analiz et
        const success = stdout.includes('TTL=');
        const packetLoss = stdout.match(/\((\d+)% loss\)/);
        const avgTime = stdout.match(/Average = (\d+)ms/);

        results.push({
          ip,
          name,
          deviceId: typeof target === 'object' ? target.deviceId : null,
          success,
          packetLoss: packetLoss ? parseInt(packetLoss[1]) : null,
          averageTime: avgTime ? parseInt(avgTime[1]) : null,
          output: stdout
        });

      } catch (error) {
        results.push({
          ip,
          name,
          deviceId: typeof target === 'object' ? target.deviceId : null,
          success: false,
          error: error.message
        });
      }
    }

    // Audit log
    await AuditLog.logSuccess({
      action: 'NETWORK_PING_TEST',
      user: req.user._id,
      username: req.user.username,
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'NETWORK', name: 'ping_test' },
      details: { 
        description: 'Ağ ping testi yapıldı',
        metadata: { 
          targetCount: targetIPs.length,
          successCount: results.filter(r => r.success).length
        }
      },
      category: 'NETWORK',
      severity: 'LOW'
    });

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ping testi sırasında hata oluştu'
    });
  }
};

/**
 * Komut geçmişi
 */
const getCommandHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Audit log'dan komut geçmişini al
    const commandLogs = await AuditLog.find({
      action: { $in: ['COMMAND_EXECUTION_STARTED', 'COMMAND_EXECUTION_COMPLETED', 'COMMAND_EXECUTION_FAILED'] },
      user: req.user._id
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'firstName lastName username');

    const total = await AuditLog.countDocuments({
      action: { $in: ['COMMAND_EXECUTION_STARTED', 'COMMAND_EXECUTION_COMPLETED', 'COMMAND_EXECUTION_FAILED'] },
      user: req.user._id
    });

    res.json({
      success: true,
      data: {
        history: commandLogs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCommands: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Komut geçmişi alınırken hata oluştu'
    });
  }
};

/**
 * Tüm sunucuları listele
 */
const getAllServers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      category, 
      location, 
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Filtreleme koşulları
    const filter = { isActive: true };
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (location) filter.location = location;
    
    // Arama
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { hostname: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const servers = await Server.find(filter)
      .populate('location', 'name building floor section')
      .populate('createdBy', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Server.countDocuments(filter);

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_LIST',
      'Server',
      null,
      { filter, pagination: { page, limit } },
      req
    );

    res.json({
      success: true,
      data: {
        servers,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Sunucu listesi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucular getirilemedi'
    });
  }
};

/**
 * Belirli bir sunucuyu getir
 */
const getServerById = async (req, res) => {
  try {
    const { id } = req.params;

    const server = await Server.findById(id)
      .populate('location', 'name building floor section')
      .populate('createdBy updatedBy', 'username email');

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Sunucu bulunamadı'
      });
    }

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_VIEW',
      'Server',
      id,
      null,
      req
    );

    res.json({
      success: true,
      data: server
    });
  } catch (error) {
    console.error('Sunucu getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu getirilemedi'
    });
  }
};

/**
 * Yeni sunucu oluştur
 */
const createServer = async (req, res) => {
  try {
    const serverData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Şifre şifreleme
    if (serverData.authentication && serverData.authentication.password) {
      serverData.authentication.encryptedPassword = encrypt(serverData.authentication.password);
      delete serverData.authentication.password;
    }

    // Private key şifreleme
    if (serverData.authentication && serverData.authentication.privateKey) {
      serverData.authentication.encryptedPrivateKey = encrypt(serverData.authentication.privateKey);
      delete serverData.authentication.privateKey;
    }

    const server = new Server(serverData);
    await server.save();

    // Sunucu oluşturulduktan sonra populate et
    await server.populate('location createdBy', 'name building floor section username email');

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_CREATE',
      'Server',
      server._id,
      { serverName: server.name, ipAddress: server.ipAddress },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Sunucu başarıyla oluşturuldu',
      data: server
    });
  } catch (error) {
    console.error('Sunucu oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu oluşturulamadı'
    });
  }
};

/**
 * Sunucu güncelle
 */
const updateServer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    // Şifre güncelleme
    if (updateData.authentication && updateData.authentication.password) {
      updateData.authentication.encryptedPassword = encrypt(updateData.authentication.password);
      delete updateData.authentication.password;
    }

    // Private key güncelleme
    if (updateData.authentication && updateData.authentication.privateKey) {
      updateData.authentication.encryptedPrivateKey = encrypt(updateData.authentication.privateKey);
      delete updateData.authentication.privateKey;
    }

    const server = await Server.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('location createdBy updatedBy', 'name building floor section username email');

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Sunucu bulunamadı'
      });
    }

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_UPDATE',
      'Server',
      id,
      { updates: Object.keys(updateData) },
      req
    );

    res.json({
      success: true,
      message: 'Sunucu başarıyla güncellendi',
      data: server
    });
  } catch (error) {
    console.error('Sunucu güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu güncellenemedi'
    });
  }
};

/**
 * Sunucu sil
 */
const deleteServer = async (req, res) => {
  try {
    const { id } = req.params;

    const server = await Server.findById(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Sunucu bulunamadı'
      });
    }

    // Soft delete
    server.isActive = false;
    server.updatedBy = req.user.id;
    await server.save();

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_DELETE',
      'Server',
      id,
      { serverName: server.name, ipAddress: server.ipAddress },
      req
    );

    res.json({
      success: true,
      message: 'Sunucu başarıyla silindi'
    });
  } catch (error) {
    console.error('Sunucu silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu silinemedi'
    });
  }
};

/**
 * Sunucu durumunu kontrol et
 */
const checkServerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const server = await Server.findById(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Sunucu bulunamadı'
      });
    }

    // Ping testi yap
    const startTime = Date.now();
    try {
      await execAsync(`ping -n 1 ${server.ipAddress}`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      // Sunucu durumunu güncelle
      await server.updateStatus('online', {
        networkLatency: responseTime,
        lastUpdated: new Date()
      });

      res.json({
        success: true,
        data: {
          status: 'online',
          responseTime,
          lastChecked: new Date()
        }
      });
    } catch (pingError) {
      await server.updateStatus('offline');
      
      res.json({
        success: true,
        data: {
          status: 'offline',
          lastChecked: new Date(),
          error: 'Ping başarısız'
        }
      });
    }

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_STATUS_CHECK',
      'Server',
      id,
      null,
      req
    );
  } catch (error) {
    console.error('Sunucu durum kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu durum kontrolü yapılamadı'
    });
  }
};

/**
 * Sunucu performans bilgilerini getir
 */
const getServerPerformance = async (req, res) => {
  try {
    const { id } = req.params;

    const server = await Server.findById(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Sunucu bulunamadı'
      });
    }

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_PERFORMANCE_VIEW',
      'Server',
      id,
      null,
      req
    );

    res.json({
      success: true,
      data: {
        server: {
          id: server._id,
          name: server.name,
          ipAddress: server.ipAddress
        },
        performance: server.performance,
        systemInfo: server.systemInfo,
        healthScore: server.healthScore,
        uptime: server.uptime,
        uptimeFormatted: server.uptimeFormatted
      }
    });
  } catch (error) {
    console.error('Sunucu performans getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu performans bilgileri getirilemedi'
    });
  }
};

/**
 * Sunucu bağlantısını test et
 */
const testConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const server = await Server.findById(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Sunucu bulunamadı'
      });
    }

    const connectionTests = {
      ping: false,
      port: false,
      ssh: false
    };

    // Ping testi
    try {
      await execAsync(`ping -n 1 ${server.ipAddress}`, { timeout: 5000 });
      connectionTests.ping = true;
    } catch (error) {
      connectionTests.ping = false;
    }

    // Port testi (telnet benzeri)
    try {
      await execAsync(`powershell "Test-NetConnection -ComputerName ${server.ipAddress} -Port ${server.port}"`, { timeout: 10000 });
      connectionTests.port = true;
    } catch (error) {
      connectionTests.port = false;
    }

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_CONNECTION_TEST',
      'Server',
      id,
      { connectionTests },
      req
    );

    res.json({
      success: true,
      data: {
        server: {
          id: server._id,
          name: server.name,
          ipAddress: server.ipAddress,
          port: server.port
        },
        tests: connectionTests,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Sunucu bağlantı testi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu bağlantı testi yapılamadı'
    });
  }
};

/**
 * Sunucu loglarını getir
 */
const getServerLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { lines = 100 } = req.query;

    const server = await Server.findById(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Sunucu bulunamadı'
      });
    }

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_LOGS_VIEW',
      'Server',
      id,
      { requestedLines: lines },
      req
    );

    res.json({
      success: true,
      message: 'Log getirme özelliği henüz implementasyonda',
      data: {
        server: {
          id: server._id,
          name: server.name
        },
        logs: [],
        requestedLines: lines
      }
    });
  } catch (error) {
    console.error('Sunucu log getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu logları getirilemedi'
    });
  }
};

/**
 * Sunucu servisini yeniden başlat
 */
const restartService = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceName } = req.body;

    const server = await Server.findById(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Sunucu bulunamadı'
      });
    }

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_SERVICE_RESTART',
      'Server',
      id,
      { serviceName },
      req
    );

    res.json({
      success: true,
      message: 'Servis yeniden başlatma özelliği henüz implementasyonda',
      data: {
        server: {
          id: server._id,
          name: server.name
        },
        serviceName,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Servis yeniden başlatma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Servis yeniden başlatılamadı'
    });
  }
};

/**
 * Sunucu istatistiklerini getir
 */
const getServerStatistics = async (req, res) => {
  try {
    const stats = await Server.getStatistics();

    // Kategori bazında istatistikler
    const categoryStats = await Server.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Durum bazında istatistikler
    const statusStats = await Server.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Konum bazında istatistikler
    const locationStats = await Server.aggregate([
      { $match: { isActive: true, location: { $ne: null } } },
      { 
        $lookup: {
          from: 'locations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationInfo'
        }
      },
      { $unwind: '$locationInfo' },
      { 
        $group: { 
          _id: '$location', 
          count: { $sum: 1 },
          locationName: { $first: '$locationInfo.name' }
        } 
      }
    ]);

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_STATISTICS_VIEW',
      'Server',
      null,
      null,
      req
    );

    res.json({
      success: true,
      data: {
        general: stats,
        byCategory: categoryStats,
        byStatus: statusStats,
        byLocation: locationStats
      }
    });
  } catch (error) {
    console.error('Sunucu istatistikleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu istatistikleri getirilemedi'
    });
  }
};

/**
 * Birden fazla sunucuda komut çalıştır
 */
const bulkExecuteCommand = async (req, res) => {
  try {
    const { serverIds, commandKey, parameters = [] } = req.body;

    if (!serverIds || !Array.isArray(serverIds) || serverIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sunucu ID listesi gerekli'
      });
    }

    const results = [];

    for (const serverId of serverIds) {
      try {
        const server = await Server.findById(serverId);
        if (!server) {
          results.push({
            serverId,
            success: false,
            error: 'Sunucu bulunamadı'
          });
          continue;
        }

        // Bu noktada gerçek SSH bağlantısı kurulup komut çalıştırılacak
        // Şimdilik placeholder
        results.push({
          serverId,
          serverName: server.name,
          success: true,
          output: 'Komut başarıyla çalıştırıldı (placeholder)'
        });
      } catch (error) {
        results.push({
          serverId,
          success: false,
          error: error.message
        });
      }
    }

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_BULK_EXECUTE',
      'Server',
      null,
      { serverIds, commandKey, parameters, resultCount: results.length },
      req
    );

    res.json({
      success: true,
      data: {
        totalServers: serverIds.length,
        results
      }
    });
  } catch (error) {
    console.error('Toplu komut çalıştırma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu komut çalıştırılamadı'
    });
  }
};

/**
 * Tüm sunucuların sağlık durumunu kontrol et
 */
const healthCheck = async (req, res) => {
  try {
    const servers = await Server.find({ isActive: true }).select('name ipAddress status lastChecked');
    
    const healthResults = [];

    for (const server of servers) {
      try {
        const startTime = Date.now();
        await execAsync(`ping -n 1 ${server.ipAddress}`, { timeout: 3000 });
        const responseTime = Date.now() - startTime;
        
        healthResults.push({
          serverId: server._id,
          name: server.name,
          ipAddress: server.ipAddress,
          status: 'online',
          responseTime,
          lastChecked: new Date()
        });

        // Sunucu durumunu güncelle
        await server.updateStatus('online', { networkLatency: responseTime });
      } catch (error) {
        healthResults.push({
          serverId: server._id,
          name: server.name,
          ipAddress: server.ipAddress,
          status: 'offline',
          error: 'Ping başarısız',
          lastChecked: new Date()
        });

        // Sunucu durumunu güncelle
        await server.updateStatus('offline');
      }
    }

    // Özet istatistikler
    const summary = {
      total: healthResults.length,
      online: healthResults.filter(r => r.status === 'online').length,
      offline: healthResults.filter(r => r.status === 'offline').length,
      avgResponseTime: healthResults
        .filter(r => r.responseTime)
        .reduce((sum, r) => sum + r.responseTime, 0) / 
        healthResults.filter(r => r.responseTime).length || 0
    };

    // Audit log
    await logAuditEvent(
      req.user.id,
      'SERVER_HEALTH_CHECK',
      'Server',
      null,
      { summary },
      req
    );

    res.json({
      success: true,
      data: {
        summary,
        results: healthResults,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Sağlık kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sağlık kontrolü yapılamadı'
    });
  }
};

module.exports = {
  getAvailableCommands,
  executeCommand,
  getSystemStatus,
  pingDevices,
  getCommandHistory,
  getAllServers,
  getServerById,
  createServer,
  updateServer,
  deleteServer,
  checkServerStatus,
  getServerPerformance,
  testConnection,
  getServerLogs,
  restartService,
  getServerStatistics,
  bulkExecuteCommand,
  healthCheck
};
