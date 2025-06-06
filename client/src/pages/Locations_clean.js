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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  Avatar,
  Snackbar,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add,
  LocationOn,
  Business,
  Edit,
  Delete,
  Search,
  ExpandMore,
  Room,
  Apartment,
  Map,
  DeviceHub,
  Computer,
} from '@mui/icons-material';
import api from '../services/api';
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

const locationTypes = [
  { value: 'BUILDING', label: 'Bina', icon: <Business />, color: '#1976d2' },
  { value: 'FLOOR', label: 'Kat', icon: <Apartment />, color: '#388e3c' },
  { value: 'ROOM', label: 'Oda', icon: <Room />, color: '#f57c00' },
  { value: 'SECTION', label: 'Bölüm', icon: <Map />, color: '#7b1fa2' },
  { value: 'ZONE', label: 'Alan', icon: <LocationOn />, color: '#d32f2f' },
];

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [stats, setStats] = useState({
    totalLocations: 0,
    buildings: 0,
    floors: 0,
    rooms: 0,
    devices: 0
  });
  const [formData, setFormData] = useState({
    name: '',
    type: 'BUILDING',
    code: '',
    description: '',
    building: '',
    floor: '',
    section: '',
    capacity: '',
    isActive: true,
    parentLocation: '',
    coordinates: {
      latitude: '',
      longitude: ''
    },
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Türkiye'
    }
  });

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/locations');
      if (response.data.success) {
        setLocations(response.data.data.locations || []);
      } else {
        setLocations(response.data || []);
      }
    } catch (error) {
      logError('Locations fetch error (clean):', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/locations/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    fetchStats();
  }, [fetchLocations, fetchStats]);

  useEffect(() => {
    let filtered = locations;

    if (searchTerm) {
      filtered = filtered.filter(location => 
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter) {
      filtered = filtered.filter(location => location.type === typeFilter);
    }

    setFilteredLocations(filtered);
  }, [locations, searchTerm, typeFilter]);

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
      
      if (selectedLocation) {
        const response = await api.put(`/api/locations/${selectedLocation._id}`, formData);
        if (response.data.success) {
          showSnackbar('Lokasyon güncellendi', 'success');
        }
      } else {
        const response = await api.post('/api/locations', formData);
        if (response.data.success) {
          showSnackbar('Lokasyon eklendi', 'success');
        }
      }
      
      await fetchLocations();
      await fetchStats();
      handleCloseForm();
    } catch (error) {
      console.error('Form submit error:', error);
      showSnackbar('İşlem sırasında hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu lokasyonu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/api/locations/${id}`);
      if (response.data.success) {
        showSnackbar('Lokasyon silindi', 'success');
        await fetchLocations();
        await fetchStats();
      }
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar('Silme işlemi başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (location = null) => {
    if (location) {
      setSelectedLocation(location);
      setFormData({
        ...location,
        coordinates: location.coordinates || { latitude: '', longitude: '' },
        address: location.address || { street: '', city: '', postalCode: '', country: 'Türkiye' }
      });
    } else {
      setSelectedLocation(null);
      setFormData({
        name: '',
        type: 'BUILDING',
        code: '',
        description: '',
        building: '',
        floor: '',
        section: '',
        capacity: '',
        isActive: true,
        parentLocation: '',
        coordinates: { latitude: '', longitude: '' },
        address: { street: '', city: '', postalCode: '', country: 'Türkiye' }
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedLocation(null);
  };

  const getTypeConfig = (type) => {
    return locationTypes.find(t => t.value === type) || locationTypes[0];
  };

  const getLocationHierarchy = (location) => {
    const parts = [];
    if (location.building) parts.push(location.building);
    if (location.floor) parts.push(`${location.floor}. Kat`);
    if (location.section) parts.push(location.section);
    return parts.join(' > ');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOn color="primary" />
          Lokasyon Yönetimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenForm()}
          disabled={loading}
        >
          Yeni Lokasyon
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.totalLocations}</Typography>
              <Typography variant="body2">Toplam Lokasyon</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center', bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.buildings}</Typography>
              <Typography variant="body2">Bina</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.floors}</Typography>
              <Typography variant="body2">Kat</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center', bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.rooms}</Typography>
              <Typography variant="body2">Oda</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ textAlign: 'center', bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.devices}</Typography>
              <Typography variant="body2">Cihaz</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Lokasyon ara..."
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
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Tür Filtresi</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Tür Filtresi"
              >
                <MenuItem value="">Tümü</MenuItem>
                {locationTypes.map((type) => (
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
              Toplam: {filteredLocations.length} lokasyon
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Locations Grid */}
      <Grid container spacing={3}>
        {filteredLocations.map((location) => {
          const typeConfig = getTypeConfig(location.type);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={location._id}>
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
                    <Chip 
                      label={location.isActive ? 'Aktif' : 'Pasif'}
                      color={location.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" component="h3" gutterBottom>
                    {location.name}
                  </Typography>
                  
                  <Chip 
                    label={typeConfig.label}
                    size="small"
                    sx={{ mb: 2, bgcolor: typeConfig.color, color: 'white' }}
                  />
                  
                  {location.code && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Kod: {location.code}
                    </Typography>
                  )}
                  
                  {getLocationHierarchy(location) && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Hiyerarşi: {getLocationHierarchy(location)}
                    </Typography>
                  )}
                  
                  {location.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {location.description}
                    </Typography>
                  )}
                  
                  {location.capacity && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <DeviceHub fontSize="small" />
                      <Typography variant="body2">
                        Kapasite: {location.capacity}
                      </Typography>
                    </Box>
                  )}
                  
                  {location.deviceCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Computer fontSize="small" />
                      <Typography variant="body2">
                        Cihazlar: {location.deviceCount}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleOpenForm(location)}
                    disabled={loading}
                  >
                    Düzenle
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDelete(location._id)}
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
      {filteredLocations.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <LocationOn sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || typeFilter
              ? 'Arama kriterlerine uygun lokasyon bulunamadı'
              : 'Henüz lokasyon eklenmemiş'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenForm()}
            sx={{ mt: 2 }}
          >
            İlk Lokasyonu Ekle
          </Button>
        </Paper>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedLocation ? 'Lokasyonu Düzenle' : 'Yeni Lokasyon'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Temel Bilgiler */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Temel Bilgiler
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Lokasyon Adı"
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
                    {locationTypes.map((type) => (
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
                  label="Lokasyon Kodu"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Örn: B1-K2-O101"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Kapasite"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="Örn: 20 kişi"
                />
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

              {/* Hiyerarşi */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Hiyerarşi Bilgileri
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Bina"
                  value={formData.building}
                  onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Kat"
                  value={formData.floor}
                  onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Bölüm"
                  value={formData.section}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                />
              </Grid>

              {/* Adres Bilgileri */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Adres ve Konum Bilgileri</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Sokak Adresi"
                          value={formData.address.street}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, street: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Şehir"
                          value={formData.address.city}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, city: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Posta Kodu"
                          value={formData.address.postalCode}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, postalCode: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Enlem"
                          value={formData.coordinates.latitude}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            coordinates: { ...prev.coordinates, latitude: e.target.value }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Boylam"
                          value={formData.coordinates.longitude}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            coordinates: { ...prev.coordinates, longitude: e.target.value }
                          }))}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {selectedLocation ? 'Güncelle' : 'Ekle'}
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
        </Alert>
      </Snackbar>
    </Box>
  );
}
