import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,  Tooltip,
  Paper,
  Divider,
  Avatar,
  Snackbar,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,  Tab,
  Tabs,
} from '@mui/material';
import {
  Add,
  Computer,
  NetworkPing,
  Terminal,
  CheckCircle,
  Cancel,
  Warning,
  Edit,
  Delete,
  Search,
  Storage,
  Memory,
  Speed,
  Security,
  Cloud,
  Router,
  MonitorHeart,
} from '@mui/icons-material';
import api from '../services/api';
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

const serverTypes = [
  { value: 'WEB', label: 'Web Sunucu', icon: <Computer />, color: '#1976d2' },
  { value: 'DATABASE', label: 'Veritabanı', icon: <Storage />, color: '#388e3c' },
  { value: 'APPLICATION', label: 'Uygulama', icon: <Terminal />, color: '#f57c00' },
  { value: 'PROXY', label: 'Proxy/Load Balancer', icon: <Router />, color: '#7b1fa2' },
  { value: 'CLOUD', label: 'Cloud Instance', icon: <Cloud />, color: '#d32f2f' },
  { value: 'OTHER', label: 'Diğer', icon: <Computer />, color: '#455a64' },
];

const ServerStatusChip = ({ status }) => {
  const getStatusProps = (status) => {
    switch (status?.toLowerCase()) {
      case 'up':
      case 'online':
      case 'running':
        return { color: 'success', icon: <CheckCircle />, label: 'Çevrimiçi', bgColor: '#4caf50' };
      case 'down':
      case 'offline':
      case 'stopped':
        return { color: 'error', icon: <Cancel />, label: 'Çevrimdışı', bgColor: '#f44336' };
      case 'maintenance':
        return { color: 'warning', icon: <Warning />, label: 'Bakım', bgColor: '#ff9800' };
      default:
        return { color: 'default', icon: <Warning />, label: 'Bilinmiyor', bgColor: '#9e9e9e' };
    }
  };

  const statusProps = getStatusProps(status);
  
  return (
    <Chip
      icon={statusProps.icon}
      label={statusProps.label}
      size="small"
      sx={{
        bgcolor: statusProps.bgColor,
        color: 'white',
        '& .MuiChip-icon': { color: 'white' }
      }}
    />
  );
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`server-tabpanel-${index}`}
      aria-labelledby={`server-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Servers() {
  const [servers, setServers] = useState([]);
  const [filteredServers, setFilteredServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [serverMetrics, setServerMetrics] = useState({});
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    ipAddress: '',
    port: '',
    type: 'WEB',
    status: 'online',
    description: '',
    specifications: {
      cpu: '',
      memory: '',
      storage: '',
      os: '',
    },
    monitoring: {
      enabled: true,
      pingInterval: 300,
      alertThreshold: 5000,
    },
    credentials: {
      username: '',
      password: '',
      sshKey: '',
    },
    tags: [],
  });

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/servers');
      if (response.data.success) {
        setServers(response.data.data.servers || []);
        setFilteredServers(response.data.data.servers || []);
      } else {
        setServers(response.data || []);
      }
    } catch (error) {
      logError('Servers fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServerMetrics = useCallback(async (serverId) => {
    try {
      const response = await api.get(`/api/servers/${serverId}/metrics`);
      if (response.data.success) {
        setServerMetrics(prev => ({
          ...prev,
          [serverId]: response.data.data
        }));
      }
    } catch (error) {
      console.error('Server metrics fetch error:', error);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    let filtered = servers;

    if (searchTerm) {
      filtered = filtered.filter(server => 
        server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(server => server.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(server => server.type === typeFilter);
    }

    setFilteredServers(filtered);
  }, [servers, searchTerm, statusFilter, typeFilter]);

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (selectedServer) {
        const response = await api.put(`/api/servers/${selectedServer.id}`, formData);
        if (response.data.success) {
          showSnackbar('Sunucu güncellendi', 'success');
        }
      } else {
        const response = await api.post('/api/servers', formData);
        if (response.data.success) {
          showSnackbar('Sunucu eklendi', 'success');
        }
      }
      
      await fetchServers();
      handleCloseForm();
    } catch (error) {
      console.error('Form submit error:', error);
      showSnackbar('İşlem sırasında hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu sunucuyu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/api/servers/${id}`);
      if (response.data.success) {
        showSnackbar('Sunucu silindi', 'success');
        await fetchServers();
      }
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar('Silme işlemi başarısız', 'error');
    } finally {
      setLoading(false);
    }  };

  const handlePingServer = async (serverId) => {
    try {
      setLoading(true);
      const response = await api.post(`/api/servers/${serverId}/ping`);
      if (response.data.success) {
        showSnackbar(`Ping: ${response.data.data.responseTime}ms`, 'success');
      }
    } catch (error) {
      console.error('Ping error:', error);
      showSnackbar('Ping işlemi başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (server = null) => {
    if (server) {
      setSelectedServer(server);
      setFormData({ ...server });
    } else {
      setSelectedServer(null);
      setFormData({
        name: '',
        hostname: '',
        ipAddress: '',
        port: '',
        type: 'WEB',
        status: 'online',
        description: '',
        specifications: {
          cpu: '',
          memory: '',
          storage: '',
          os: '',
        },
        monitoring: {
          enabled: true,
          pingInterval: 300,
          alertThreshold: 5000,
        },
        credentials: {
          username: '',
          password: '',
          sshKey: '',
        },
        tags: [],
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedServer(null);
    setTabValue(0);
  };

  const getTypeConfig = (type) => {
    return serverTypes.find(t => t.value === type) || serverTypes[0];
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Computer color="primary" />
          Server Yönetimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenForm()}
          disabled={loading}
        >
          Yeni Sunucu
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Arama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Durum Filtresi</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Durum Filtresi"
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="online">Çevrimiçi</MenuItem>
                <MenuItem value="offline">Çevrimdışı</MenuItem>
                <MenuItem value="maintenance">Bakım</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tür Filtresi</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Tür Filtresi"
              >
                <MenuItem value="">Tümü</MenuItem>
                {serverTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              Toplam: {filteredServers.length} sunucu
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Servers Grid */}
      <Grid container spacing={3}>
        {filteredServers.map((server) => {
          const typeConfig = getTypeConfig(server.type);
          const metrics = serverMetrics[server.id];
          
          return (
            <Grid item xs={12} md={6} lg={4} key={server.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar sx={{ bgcolor: typeConfig.color, width: 40, height: 40 }}>
                      {typeConfig.icon}
                    </Avatar>
                    <ServerStatusChip status={server.status} />
                  </Box>
                  
                  <Typography variant="h6" component="h3" gutterBottom>
                    {server.name}
                  </Typography>
                  
                  <Chip 
                    label={typeConfig.label}
                    size="small"
                    sx={{ mb: 2, bgcolor: typeConfig.color, color: 'white' }}
                  />
                  
                  <List dense>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Computer fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Hostname" 
                        secondary={server.hostname || 'Belirtilmemiş'}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <NetworkPing fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="IP Adresi" 
                        secondary={server.ipAddress || 'Belirtilmemiş'}
                      />
                    </ListItem>
                    {server.port && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Security fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Port" 
                          secondary={server.port}
                        />
                      </ListItem>
                    )}
                  </List>

                  {/* Metrics */}
                  {metrics && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 1 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Sistem Metrikleri
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<Speed />}
                          label={`CPU: ${metrics.cpu || 0}%`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<Memory />}
                          label={`RAM: ${metrics.memory || 0}%`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<Storage />}
                          label={`Disk: ${metrics.disk || 0}%`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  )}
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Tooltip title="Ping Testi">
                    <IconButton
                      size="small"
                      onClick={() => handlePingServer(server.id)}
                      disabled={loading}
                    >
                      <NetworkPing />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Metrikleri Yükle">
                    <IconButton
                      size="small"
                      onClick={() => fetchServerMetrics(server.id)}
                      disabled={loading}
                    >
                      <MonitorHeart />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleOpenForm(server)}
                    disabled={loading}
                  >
                    Düzenle
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDelete(server.id)}
                    disabled={loading}
                  >
                    Sil
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Empty State */}
      {filteredServers.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Computer sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || statusFilter || typeFilter
              ? 'Arama kriterlerine uygun sunucu bulunamadı'
              : 'Henüz sunucu eklenmemiş'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenForm()}
            sx={{ mt: 2 }}
          >
            İlk Sunucuyu Ekle
          </Button>
        </Paper>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedServer ? 'Sunucuyu Düzenle' : 'Yeni Sunucu'}
          </DialogTitle>
          <DialogContent>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Genel Bilgiler" />
              <Tab label="Teknik Özellikler" />
              <Tab label="İzleme" />
              <Tab label="Kimlik Bilgileri" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Sunucu Adı"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Tür</InputLabel>
                    <Select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      label="Tür"
                    >
                      {serverTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {type.icon}
                            {type.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Hostname"
                    value={formData.hostname}
                    onChange={(e) => setFormData(prev => ({ ...prev, hostname: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="IP Adresi"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Port"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Durum</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      label="Durum"
                    >
                      <MenuItem value="online">Çevrimiçi</MenuItem>
                      <MenuItem value="offline">Çevrimdışı</MenuItem>
                      <MenuItem value="maintenance">Bakım</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Açıklama"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="CPU"
                    value={formData.specifications?.cpu || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, cpu: e.target.value }
                    }))}
                    placeholder="Örn: Intel Xeon E5-2680 v4"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bellek (RAM)"
                    value={formData.specifications?.memory || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, memory: e.target.value }
                    }))}
                    placeholder="Örn: 32GB DDR4"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Depolama"
                    value={formData.specifications?.storage || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, storage: e.target.value }
                    }))}
                    placeholder="Örn: 1TB SSD"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="İşletim Sistemi"
                    value={formData.specifications?.os || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, os: e.target.value }
                    }))}
                    placeholder="Örn: Ubuntu 22.04 LTS"
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ping Aralığı (saniye)"
                    type="number"
                    value={formData.monitoring?.pingInterval || 300}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      monitoring: { ...prev.monitoring, pingInterval: parseInt(e.target.value) }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Uyarı Eşiği (ms)"
                    type="number"
                    value={formData.monitoring?.alertThreshold || 5000}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      monitoring: { ...prev.monitoring, alertThreshold: parseInt(e.target.value) }
                    }))}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Kullanıcı Adı"
                    value={formData.credentials?.username || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      credentials: { ...prev.credentials, username: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Şifre"
                    type="password"
                    value={formData.credentials?.password || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      credentials: { ...prev.credentials, password: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="SSH Anahtarı"
                    multiline
                    rows={4}
                    value={formData.credentials?.sshKey || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      credentials: { ...prev.credentials, sshKey: e.target.value }
                    }))}
                    placeholder="SSH private key..."
                  />
                </Grid>
              </Grid>
            </TabPanel>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {selectedServer ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>      </Snackbar>
    </Box>
  );
}

export default Servers;
