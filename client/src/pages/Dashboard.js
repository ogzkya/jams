import React, { useState, useEffect, useContext } from 'react';
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
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const StatCard = ({ title, value, icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="h2">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: '50%',
            p: 1,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    servers: 0,
    credentials: 0,
    devices: 0,
    users: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemStatus, setSystemStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes, statusRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/activity'),
        api.get('/api/dashboard/status'),
      ]);

      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
      setSystemStatus(statusRes.data);
    } catch (err) {
      setError('Dashboard verileri yüklenirken hata oluştu');
      // Fallback data for demo
      setStats({
        servers: 12,
        credentials: 45,
        devices: 78,
        users: 8,
      });
      setRecentActivity([
        { id: 1, action: 'Yeni sunucu eklendi', user: 'Admin', timestamp: '2 dakika önce' },
        { id: 2, action: 'Kimlik bilgisi güncellendi', user: 'User1', timestamp: '15 dakika önce' },
        { id: 3, action: 'Cihaz durumu değişti', user: 'System', timestamp: '1 saat önce' },
      ]);
      setSystemStatus([
        { name: 'Web Server', status: 'online', uptime: '99.9%' },
        { name: 'Database', status: 'online', uptime: '99.8%' },
        { name: 'Mail Service', status: 'warning', uptime: '95.2%' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
        <Typography sx={{ mt: 2 }}>Dashboard yükleniyor...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Hoşgeldin, {user?.username || user?.name}!
        </Typography>
        <IconButton onClick={fetchDashboardData} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* İstatistik Kartları */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Sunucular"
            value={stats.servers}
            icon={<Computer sx={{ color: 'primary.main' }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Kimlik Bilgileri"
            value={stats.credentials}
            icon={<Security sx={{ color: 'secondary.main' }} />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cihazlar"
            value={stats.devices}
            icon={<Inventory sx={{ color: 'success.main' }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Kullanıcılar"
            value={stats.users}
            icon={<People sx={{ color: 'info.main' }} />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Son Aktiviteler */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Son Aktiviteler
            </Typography>
            <List>
              {recentActivity.map((activity) => (
                <ListItem key={activity.id} divider>
                  <ListItemText
                    primary={activity.action}
                    secondary={`${activity.user} - ${activity.timestamp}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Sistem Durumu */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Sistem Durumu
            </Typography>
            <List>
              {systemStatus.map((service, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    {getStatusIcon(service.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={service.name}
                    secondary={`Uptime: ${service.uptime}`}
                  />
                  <Chip
                    label={service.status}
                    color={getStatusColor(service.status)}
                    size="small"
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
