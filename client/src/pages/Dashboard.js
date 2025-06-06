import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  Grow,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Computer,
  Security,
  Inventory,
  People,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  TrendingUp,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

const StatCard = ({ title, value, icon, color = 'primary', trend, trendValue }) => (
  <Grow in timeout={600}>
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${color === 'primary' ? '#667eea 0%, #764ba2 100%' : 
                                              color === 'secondary' ? '#ff416c 0%, #ff4b2b 100%' :
                                              color === 'success' ? '#56ab2f 0%, #a8e6cf 100%' :
                                              color === 'info' ? '#36d1dc 0%, #5b86e5 100%' :
                                              '#f7971e 0%, #ffd200 100%'})`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          transform: 'translate(30px, -30px)',
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="inherit" gutterBottom variant="overline" sx={{ opacity: 0.8 }}>
              {title}
            </Typography>
            <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUp fontSize="small" />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  +{trendValue}% bu ay
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              p: 2,
              zIndex: 1,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  </Grow>
);

const SystemMetricCard = ({ title, value, max, unit, icon, color = 'primary' }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <Grow in timeout={800}>
      <Card 
        sx={{ 
          height: '100%',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="overline" color="text.secondary">
              {title}
            </Typography>
            <Box sx={{ color: `${color}.main` }}>
              {icon}
            </Box>
          </Box>
          <Typography variant="h4" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
            {value}{unit}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {max}{unit} maksimum
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={percentage} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: `linear-gradient(90deg, ${color === 'primary' ? '#667eea, #764ba2' : 
                                                   color === 'secondary' ? '#ff416c, #ff4b2b' :
                                                   color === 'warning' ? '#f7971e, #ffd200' :
                                                   '#56ab2f, #a8e6cf'})`
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            %{percentage.toFixed(1)} kullanım
          </Typography>
        </CardContent>
      </Card>
    </Grow>
  );
};

const ActivityItem = ({ activity }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH': case 'CRITICAL': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  return (
    <ListItem divider sx={{ py: 1.5 }}>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {activity.action.replace(/_/g, ' ')}
            </Typography>
            <Chip 
              label={activity.severity} 
              color={getSeverityColor(activity.severity)} 
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary">
              {activity.user} • {activity.timestamp}
            </Typography>
            {activity.details && (
              <Typography variant="caption" color="text.secondary">
                {activity.details}
              </Typography>
            )}
          </Box>
        }
      />
    </ListItem>
  );
};

export default function Dashboard() {
  const { user } = useAuth(); // useContext(AuthContext) yerine useAuth() hook'unu kullanıyoruz
  const [stats, setStats] = useState({
    servers: 0,
    credentials: 0,
    devices: 0,
    users: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemStatus, setSystemStatus] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // API yolları ve sözdizimi düzeltildi
      const [statsRes, activityRes, statusRes, metricsRes] = await Promise.all([
        api.get('/api/dashboard/stats').catch(() => ({ data: { success: false }})),
        api.get('/api/dashboard/activity').catch(() => ({ data: { success: false }})),
        api.get('/api/dashboard/status').catch(() => ({ data: { success: false }})),
        api.get('/api/dashboard/metrics').catch(() => ({ data: { success: false }}))
      ]);

      // Veri alım sürecindeki hataları yönet
      if (statsRes.data && statsRes.data.success) {
        setStats(statsRes.data.data || {});
      }
      
      if (activityRes.data && activityRes.data.success) {
        setRecentActivity(activityRes.data.data || []);
      }
      
      if (statusRes.data && statusRes.data.success) {
        setSystemStatus(statusRes.data.data || []);
      }
      
      if (metricsRes.data && metricsRes.data.success) {
        setSystemMetrics(metricsRes.data.data || {});
      }
      
      // En az bir API çağrısı başarılı olup olmadığını kontrol et
      const anyDataFetched = [statsRes, activityRes, statusRes, metricsRes]
        .some(res => res.data && res.data.success);
      
      if (!anyDataFetched) {
        throw new Error('Veri getirilemedi');
      }
    } catch (err) {
      logError('Dashboard fetch error:', err);
      setError('Dashboard verileri yüklenirken hata oluştu');
      
      // Fallback verileri burada yükleniyor (değişiklik yok)
      setStats({
        servers: 12,
        credentials: 45,
        devices: 78,
        users: 8,
      });
      setRecentActivity([
        { 
          id: 1, 
          action: 'USER_LOGIN', 
          user: 'Admin User', 
          timestamp: '2 dakika önce',
          severity: 'LOW',
          details: 'Başarılı giriş'
        },
        { 
          id: 2, 
          action: 'PASSWORD_UPDATE', 
          user: 'Test User', 
          timestamp: '15 dakika önce',
          severity: 'MEDIUM',
          details: 'Kimlik bilgisi güncellendi'
        },
        { 
          id: 3, 
          action: 'SERVER_STATUS_CHECK', 
          user: 'System', 
          timestamp: '1 saat önce',
          severity: 'LOW',
          details: 'Otomatik sistem kontrolü'
        },
      ]);
      setSystemStatus([
        { name: 'Web Server', status: 'online', uptime: '99.9%', description: 'Uygulama sunucusu aktif' },
        { name: 'Database', status: 'online', uptime: '99.8%', description: 'Veritabanı bağlantısı aktif' },
        { name: 'Mail Service', status: 'warning', uptime: '95.2%', description: 'E-posta servisi uyarıda' },
      ]);
      setSystemMetrics({
        cpu: { usage: 45, cores: 8, temperature: 52 },
        memory: { used: 8.2, total: 16, percentage: 51 },
        disk: { used: 245, total: 500, percentage: 49 },
        network: { upload: 2.8, download: 8.5, latency: 23 }
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes instead of 30 seconds
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'warning': return 'warning';
      case 'offline': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'offline': return <Error />;
      default: return <CheckCircle />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Dashboard yükleniyor...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Hoşgeldin, {user?.firstName || user?.username}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sistem durumunuza göz atın ve yönetim işlemlerinizi gerçekleştirin
          </Typography>
        </Box>
        <Tooltip title="Verileri Yenile">
          <IconButton onClick={fetchDashboardData} color="primary" size="large">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* İstatistik Kartları */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Sunucular"
            value={stats.servers}
            icon={<Computer sx={{ fontSize: 40 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Kimlik Bilgileri"
            value={stats.credentials}
            icon={<Security sx={{ fontSize: 40 }} />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cihazlar"
            value={stats.devices}
            icon={<Inventory sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Kullanıcılar"
            value={stats.users}
            icon={<People sx={{ fontSize: 40 }} />}
            color="info"
          />        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Sistem Metrikleri */}
        <Grid item xs={12} sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
            Sistem Metrikleri
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <SystemMetricCard
                title="CPU Kullanımı"
                value={systemMetrics?.cpu?.usage || 45}
                max={100}
                unit="%"
                icon={<Speed />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SystemMetricCard
                title="Bellek Kullanımı"
                value={systemMetrics?.memory?.used || 8.2}
                max={systemMetrics?.memory?.total || 16}
                unit="GB"
                icon={<Memory />}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SystemMetricCard
                title="Disk Kullanımı"
                value={systemMetrics?.disk?.used || 245}
                max={systemMetrics?.disk?.total || 500}
                unit="GB"
                icon={<Storage />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SystemMetricCard
                title="Network I/O"
                value={systemMetrics?.network?.download || 2.8}
                max={10}
                unit="Mbps"
                icon={<NetworkCheck />}
                color="info"
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Son Aktiviteler */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '500px', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Son Aktiviteler
              </Typography>
              <Schedule color="action" />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: '400px', overflow: 'auto' }}>
              <List sx={{ p: 0 }}>
                {recentActivity.map((activity, index) => (
                  <ActivityItem key={activity.id || index} activity={activity} />
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Sistem Durumu */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '500px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Sistem Durumu
              </Typography>
              <Computer color="action" />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List>
              {systemStatus.map((service, index) => (
                <ListItem key={index} divider sx={{ py: 2 }}>
                  <ListItemIcon>
                    {getStatusIcon(service.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {service.name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Uptime: {service.uptime}
                        </Typography>
                        {service.description && (
                          <Typography variant="caption" color="text.secondary">
                            {service.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Chip
                    label={service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    color={getStatusColor(service.status)}
                    size="small"
                    variant="outlined"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
