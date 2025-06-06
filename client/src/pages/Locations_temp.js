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

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    type: 'datacenter',
    address: '',
    city: '',
    country: '',
    description: '',
    contact_person: '',
    contact_phone: '',
    capacity: ''
  });

  const locationTypes = [
    { value: 'datacenter', label: 'Veri Merkezi', icon: <Business /> },
    { value: 'office', label: 'Ofis', icon: <Room /> },
    { value: 'branch', label: 'Şube', icon: <Apartment /> },
    { value: 'warehouse', label: 'Depo', icon: <DeviceHub /> },
    { value: 'remote', label: 'Uzak', icon: <Computer /> },
  ];

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/locations');
      setLocations(response.data || []);
    } catch (error) {
      logError('Lokasyonlar getirilemedi (temp):', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, formData);
        setSnackbar({
          open: true,
          message: 'Lokasyon başarıyla güncellendi',
          severity: 'success'
        });
      } else {
        await api.post('/locations', formData);
        setSnackbar({
          open: true,
          message: 'Lokasyon başarıyla oluşturuldu',
          severity: 'success'
        });
      }
      handleClose();
      fetchLocations();
    } catch (error) {
      console.error('Lokasyon kaydedilemedi:', error);
      setSnackbar({
        open: true,
        message: 'Lokasyon kaydedilemedi',
        severity: 'error'
      });
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || '',
      type: location.type || 'datacenter',
      address: location.address || '',
      city: location.city || '',
      country: location.country || '',
      description: location.description || '',
      contact_person: location.contact_person || '',
      contact_phone: location.contact_phone || '',
      capacity: location.capacity || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu lokasyonu silmek istediğinizden emin misiniz?')) {
      try {
        await api.delete(`/locations/${id}`);
        setSnackbar({
          open: true,
          message: 'Lokasyon başarıyla silindi',
          severity: 'success'
        });
        fetchLocations();
      } catch (error) {
        console.error('Lokasyon silinemedi:', error);
        setSnackbar({
          open: true,
          message: 'Lokasyon silinemedi',
          severity: 'error'
        });
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      type: 'datacenter',
      address: '',
      city: '',
      country: '',
      description: '',
      contact_person: '',
      contact_phone: '',
      capacity: ''
    });
  };

  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.country?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || location.type === filterType;
    return matchesSearch && matchesType;
  });

  const getLocationIcon = (type) => {
    const locationTypeObj = locationTypes.find(lt => lt.value === type);
    return locationTypeObj ? locationTypeObj.icon : <LocationOn />;
  };

  const getLocationTypeLabel = (type) => {
    const locationTypeObj = locationTypes.find(lt => lt.value === type);
    return locationTypeObj ? locationTypeObj.label : type;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Yükleniyor...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Lokasyonlar
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Yeni Lokasyon
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
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
            sx={{ minWidth: 300 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Tür Filtresi</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Tür Filtresi"
            >
              <MenuItem value="all">Tümü</MenuItem>
              {locationTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {filteredLocations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {searchTerm || filterType !== 'all' ? 'Filtreye uygun lokasyon bulunamadı' : 'Henüz lokasyon eklenmemiş'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredLocations.map((location) => (
            <Grid item xs={12} sm={6} md={4} key={location.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {getLocationIcon(location.type)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="h2">
                        {location.name}
                      </Typography>
                      <Chip 
                        label={getLocationTypeLabel(location.type)} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  
                  {location.address && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      {location.address}
                    </Typography>
                  )}
                  
                  {(location.city || location.country) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <Map sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      {[location.city, location.country].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  
                  {location.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {location.description}
                    </Typography>
                  )}
                  
                  {location.contact_person && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>İletişim:</strong> {location.contact_person}
                    </Typography>
                  )}
                  
                  {location.capacity && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Kapasite:</strong> {location.capacity}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<Edit />} onClick={() => handleEdit(location)}>
                    Düzenle
                  </Button>
                  <Button size="small" startIcon={<Delete />} onClick={() => handleDelete(location.id)} color="error">
                    Sil
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingLocation ? 'Lokasyon Düzenle' : 'Yeni Lokasyon'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Lokasyon Adı"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tür</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    label="Tür"
                  >
                    {locationTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Adres"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Şehir"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ülke"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Açıklama"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="İletişim Kişisi"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="İletişim Telefonu"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Kapasite"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Örn: 100 sunucu, 50 kişi, vs."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>İptal</Button>
            <Button type="submit" variant="contained">
              {editingLocation ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
