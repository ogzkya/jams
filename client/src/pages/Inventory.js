import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  IconButton,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Avatar,
  LinearProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Computer,
  Smartphone,
  Router,
  Print,
  Tv,
  CheckCircle,
  Error,
  Warning,
  Assignment,
  LocationOn,
} from '@mui/icons-material';
import api from '../services/api';
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

const deviceTypes = [
  { value: 'DESKTOP', label: 'Masaüstü Bilgisayar', icon: <Computer /> },
  { value: 'LAPTOP', label: 'Dizüstü Bilgisayar', icon: <Computer /> },
  { value: 'SERVER', label: 'Sunucu', icon: <Computer /> },
  { value: 'NETWORK', label: 'Ağ Cihazı', icon: <Router /> },
  { value: 'PRINTER', label: 'Yazıcı', icon: <Print /> },
  { value: 'MONITOR', label: 'Monitör', icon: <Tv /> },
  { value: 'MOBILE', label: 'Mobil Cihaz', icon: <Smartphone /> },
  { value: 'OTHER', label: 'Diğer', icon: <Computer /> },
];

const deviceStatuses = [
  { value: 'ACTIVE', label: 'Aktif', color: 'success' },
  { value: 'INACTIVE', label: 'Pasif', color: 'default' },
  { value: 'MAINTENANCE', label: 'Bakımda', color: 'warning' },
  { value: 'BROKEN', label: 'Arızalı', color: 'error' },
  { value: 'RETIRED', label: 'Kullanım Dışı', color: 'error' },
];

export default function Inventory() {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [open, setOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    category: '',
    status: '',
    location: '',
  });
  const [form, setForm] = useState({
    name: '',
    type: '',
    category: 'COMPUTER',
    brand: '',
    model: '',
    serialNumber: '',
    assetTag: '',
    networkInfo: {
      ipAddress: '',
      macAddress: '',
      hostname: '',
    },
    status: {
      operational: 'ACTIVE',
      condition: 'GOOD',
    },
    location: {
      current: '',
    },
    assignment: {
      assignedTo: '',
      assignmentType: 'PERSONAL',
    },
    procurement: {
      purchaseDate: '',
      purchasePrice: '',
      vendor: '',
      warrantyEndDate: '',
    },
    specifications: {
      cpu: '',
      memory: '',
      storage: '',
      os: '',
    },
    tags: [],
    notes: '',
  });
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 25,
    total: 0,
  });

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/inventory');
      
      // Yanıt yapısını kontrol eden düzeltme
      if (response.data) {
        const deviceData = response.data.data?.devices || response.data.devices || response.data || [];
        setDevices(deviceData);
        setFilteredDevices(deviceData);
      } else {
        setError('Cihazlar getirilemedi');
      }
    } catch (err) {
      logError('Devices fetch error:', err);
      setError('Cihazlar getirilemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/inventory/stats');
      if (response.data && (response.data.success || response.data.data)) {
        setStats(response.data.data || {});
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      // Yanıt yapısını kontrol eden düzeltme
      if (response.data) {
        const userData = response.data.data?.users || response.data.users || response.data || [];
        setUsers(userData);
      }
    } catch (err) {
      console.error('Users fetch error:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/api/locations');
      // Yanıt yapısını kontrol eden düzeltme
      if (response.data) {
        const locationData = response.data.data?.locations || response.data.locations || response.data || [];
        setLocations(locationData);
      }
    } catch (err) {
      console.error('Locations fetch error:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchStats();
    fetchUsers();
    fetchLocations();
  }, [fetchDevices]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Form verilerini API'ye uygun formata dönüştür
      const formData = { ...form };
      
      // Boş değerleri temizle
      Object.keys(formData).forEach(key => {
        if (formData[key] === '') {
          if (typeof formData[key] === 'object') {
            Object.keys(formData[key]).forEach(subKey => {
              if (formData[key][subKey] === '') {
                delete formData[key][subKey];
              }
            });
          } else {
            delete formData[key];
          }
        }
      });
      
      if (editingDevice) {
        const response = await api.put(`/api/inventory/${editingDevice._id}`, formData);
        if (response.data && (response.data.success || response.status === 200)) {
          await fetchDevices();
          await fetchStats();
          handleClose();
        }
      } else {
        const response = await api.post('/api/inventory', formData);
        if (response.data && (response.data.success || response.status === 201)) {
          await fetchDevices();
          await fetchStats();
          handleClose();
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Cihaz kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setForm({
      name: device.name || '',
      type: device.type || '',
      category: device.category || 'COMPUTER',
      brand: device.brand || '',
      model: device.model || '',
      serialNumber: device.serialNumber || '',
      assetTag: device.assetTag || '',
      networkInfo: {
        ipAddress: device.networkInfo?.ipAddress || '',
        macAddress: device.networkInfo?.macAddress || '',
        hostname: device.networkInfo?.hostname || '',
      },
      status: {
        operational: device.status?.operational || 'ACTIVE',
        condition: device.status?.condition || 'GOOD',
      },
      location: {
        current: device.location?.current || '',
      },
      assignment: {
        assignedTo: device.assignment?.assignedTo || '',
        assignmentType: device.assignment?.assignmentType || 'PERSONAL',
      },
      procurement: {
        purchaseDate: device.procurement?.purchaseDate?.split('T')[0] || '',
        purchasePrice: device.procurement?.purchasePrice || '',
        vendor: device.procurement?.vendor || '',
        warrantyEndDate: device.procurement?.warrantyEndDate?.split('T')[0] || '',
      },
      specifications: {
        cpu: device.specifications?.cpu || '',
        memory: device.specifications?.memory || '',
        storage: device.specifications?.storage || '',
        os: device.specifications?.os || '',
      },
      tags: device.tags || [],
      notes: device.notes || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu cihazı silmek istediğinizden emin misiniz?')) {
      try {
        setLoading(true);
        await api.delete(`/api/inventory/${id}`);
        await fetchDevices();
        await fetchStats();
      } catch (err) {
        setError('Cihaz silinirken hata oluştu');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingDevice(null);
    setForm({
      name: '',
      type: '',
      category: 'COMPUTER',
      brand: '',
      model: '',
      serialNumber: '',
      assetTag: '',
      networkInfo: {
        ipAddress: '',
        macAddress: '',
        hostname: '',
      },
      status: {
        operational: 'ACTIVE',
        condition: 'GOOD',
      },
      location: {
        current: '',
      },
      assignment: {
        assignedTo: '',
        assignmentType: 'PERSONAL',
      },
      procurement: {
        purchaseDate: '',
        purchasePrice: '',
        vendor: '',
        warrantyEndDate: '',
      },
      specifications: {
        cpu: '',
        memory: '',
        storage: '',
        os: '',
      },
      tags: [],
      notes: '',
    });
  };

  const getStatusChip = (status) => {
    const statusConfig = deviceStatuses.find(s => s.value === status) || deviceStatuses[0];
    return (
      <Chip 
        label={statusConfig.label} 
        color={statusConfig.color} 
        size="small"
        variant="outlined"
      />
    );
  };

  const getTypeIcon = (type) => {
    const typeConfig = deviceTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : <Computer />;
  };

  const columns = [
    {
      field: 'type',
      headerName: 'Tip',
      width: 60,
      renderCell: (params) => (
        <Tooltip title={params.row.type}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
            {getTypeIcon(params.row.type)}
          </Avatar>
        </Tooltip>
      ),
    },
    {
      field: 'name',
      headerName: 'Cihaz Adı',
      width: 200,
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {params.row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.brand} {params.row.model}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'serialNumber',
      headerName: 'Seri No',
      width: 130,
    },
    {
      field: 'assetTag',
      headerName: 'Asset Tag',
      width: 120,
    },
    {
      field: 'networkInfo',
      headerName: 'IP Adresi',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.row.networkInfo?.ipAddress || '-'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Durum',
      width: 100,
      renderCell: (params) => getStatusChip(params.row.status?.operational),
    },
    {
      field: 'assignment',
      headerName: 'Atanan',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.row.assignedUser ? (
            <>
              <Assignment fontSize="small" color="action" />
              <Typography variant="body2">
                {params.row.assignedUser.firstName} {params.row.assignedUser.lastName}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Atanmamış
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'location',
      headerName: 'Lokasyon',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOn fontSize="small" color="action" />
          <Typography variant="body2">
            {params.row.currentLocation?.name || 'Belirlenmemiş'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Düzenle">
            <IconButton
              size="small"
              onClick={() => handleEdit(params.row)}
              color="primary"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sil">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row._id)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 600 }}>
              {value || 0}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Envanter Yönetimi
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Yenile">
            <IconButton onClick={fetchDevices} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            Yeni Cihaz
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Cihaz"
            value={stats.totalDevices}
            icon={<Computer />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Aktif Cihazlar"
            value={stats.activeDevices}
            icon={<CheckCircle />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Bakımda"
            value={stats.maintenanceDevices}
            icon={<Warning />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Arızalı"
            value={stats.brokenDevices}
            icon={<Error />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Arama"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Cihaz adı, marka, model..."
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tip</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                label="Tip"
              >
                <MenuItem value="">Tümü</MenuItem>
                {deviceTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Durum</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                label="Durum"
              >
                <MenuItem value="">Tümü</MenuItem>
                {deviceStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Lokasyon</InputLabel>
              <Select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                label="Lokasyon"
              >
                <MenuItem value="">Tümü</MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setFilters({ search: '', type: '', category: '', status: '', location: '' })}
            >
              Temizle
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={devices}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          paginationMode="server"
          rowCount={pagination.total}
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
          onPageSizeChange={(newPageSize) => setPagination(prev => ({ ...prev, pageSize: newPageSize }))}
          pageSizeOptions={[25, 50, 100]}
          disableSelectionOnClick
          disableColumnMenu
          localeText={{
            noRowsLabel: 'Cihaz bulunamadı',
            footerRowSelected: (count) => `${count} satır seçildi`,
          }}
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          {editingDevice ? 'Cihaz Düzenle' : 'Yeni Cihaz Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Temel Bilgiler
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cihaz Adı"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tip</InputLabel>
                  <Select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    label="Tip"
                  >
                    {deviceTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Marka"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Seri Numarası"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Asset Tag"
                  value={form.assetTag}
                  onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
                />
              </Grid>

              {/* Network Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Ağ Bilgileri
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="IP Adresi"
                  value={form.networkInfo.ipAddress}
                  onChange={(e) => setForm({ 
                    ...form, 
                    networkInfo: { ...form.networkInfo, ipAddress: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="MAC Adresi"
                  value={form.networkInfo.macAddress}
                  onChange={(e) => setForm({ 
                    ...form, 
                    networkInfo: { ...form.networkInfo, macAddress: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Hostname"
                  value={form.networkInfo.hostname}
                  onChange={(e) => setForm({ 
                    ...form, 
                    networkInfo: { ...form.networkInfo, hostname: e.target.value }
                  })}
                />
              </Grid>

              {/* Status and Assignment */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Durum ve Atama
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Operasyonel Durum</InputLabel>
                  <Select
                    value={form.status.operational}
                    onChange={(e) => setForm({ 
                      ...form, 
                      status: { ...form.status, operational: e.target.value }
                    })}
                    label="Operasyonel Durum"
                  >
                    {deviceStatuses.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Atanan Kullanıcı</InputLabel>
                  <Select
                    value={form.assignment.assignedTo}
                    onChange={(e) => setForm({ 
                      ...form, 
                      assignment: { ...form.assignment, assignedTo: e.target.value }
                    })}
                    label="Atanan Kullanıcı"
                  >
                    <MenuItem value="">Atanmamış</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Lokasyon</InputLabel>
                  <Select
                    value={form.location.current}
                    onChange={(e) => setForm({ 
                      ...form, 
                      location: { ...form.location, current: e.target.value }
                    })}
                    label="Lokasyon"
                  >
                    <MenuItem value="">Belirlenmemiş</MenuItem>
                    {locations.map((location) => (
                      <MenuItem key={location._id} value={location._id}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Procurement */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Satın Alma Bilgileri
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Satın Alma Tarihi"
                  type="date"
                  value={form.procurement.purchaseDate}
                  onChange={(e) => setForm({ 
                    ...form, 
                    procurement: { ...form.procurement, purchaseDate: e.target.value }
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Garanti Bitiş Tarihi"
                  type="date"
                  value={form.procurement.warrantyEndDate}
                  onChange={(e) => setForm({ 
                    ...form, 
                    procurement: { ...form.procurement, warrantyEndDate: e.target.value }
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Satın Alma Fiyatı"
                  type="number"
                  value={form.procurement.purchasePrice}
                  onChange={(e) => setForm({ 
                    ...form, 
                    procurement: { ...form.procurement, purchasePrice: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tedarikçi"
                  value={form.procurement.vendor}
                  onChange={(e) => setForm({ 
                    ...form, 
                    procurement: { ...form.procurement, vendor: e.target.value }
                  })}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notlar"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <LinearProgress /> : (editingDevice ? 'Güncelle' : 'Ekle')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
