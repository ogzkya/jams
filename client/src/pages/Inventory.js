import React, { useEffect, useState } from 'react';
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
  CardActions,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Computer as ComputerIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../services/api';

export default function Inventory() {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: '',
    ip: '',
    mac: '',
    serial: '',
    purchasedAt: '',
    warrantyUntil: '',
    assignedTo: '',
    location: '',
    status: 'active'
  });
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchData();
    fetchUsers();
    fetchLocations();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/inventory/devices');
      setDevices(response.data);
    } catch (err) {
      setError('Cihazlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Users fetch error:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/api/inventory/locations');
      setLocations(response.data);
    } catch (err) {
      console.error('Locations fetch error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingDevice) {
        const response = await api.put(`/api/inventory/devices/${editingDevice._id}`, form);
        setDevices(devices.map(d => d._id === editingDevice._id ? response.data : d));
      } else {
        const response = await api.post('/api/inventory/devices', form);
        setDevices([...devices, response.data]);
      }
      handleClose();
    } catch (err) {
      setError('Cihaz kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setForm({
      type: device.type || '',
      ip: device.ip || '',
      mac: device.mac || '',
      serial: device.serial || '',
      purchasedAt: device.purchasedAt ? device.purchasedAt.split('T')[0] : '',
      warrantyUntil: device.warrantyUntil ? device.warrantyUntil.split('T')[0] : '',
      assignedTo: device.assignedTo?._id || '',
      location: device.location?._id || '',
      status: device.status || 'active'
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu cihazı silmek istediğinizden emin misiniz?')) {
      try {
        await api.delete(`/api/inventory/devices/${id}`);
        setDevices(devices.filter(d => d._id !== id));
      } catch (err) {
        setError('Cihaz silinirken hata oluştu');
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingDevice(null);
    setForm({
      type: '',
      ip: '',
      mac: '',
      serial: '',
      purchasedAt: '',
      warrantyUntil: '',
      assignedTo: '',
      location: '',
      status: 'active'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'maintenance': return 'warning';
      case 'broken': return 'error';
      default: return 'default';
    }
  };

  const columns = [
    { field: 'type', headerName: 'Tip', width: 150 },
    { field: 'ip', headerName: 'IP Adresi', width: 130 },
    { field: 'mac', headerName: 'MAC Adresi', width: 150 },
    { field: 'serial', headerName: 'Seri No', width: 150 },
    {
      field: 'status',
      headerName: 'Durum',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'location',
      headerName: 'Konum',
      width: 150,
      valueGetter: (params) => params.row.location?.name || '-',
    },
    {
      field: 'assignedTo',
      headerName: 'Atanan Kişi',
      width: 150,
      valueGetter: (params) => params.row.assignedTo?.name || '-',
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleEdit(params.row)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row._id)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Envanter Yönetimi
        </Typography>
        <Box>
          <IconButton onClick={fetchData} color="primary">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ ml: 1 }}
          >
            Yeni Cihaz
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={devices}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          checkboxSelection
          disableSelectionOnClick
          loading={loading}
          getRowId={(row) => row._id}
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDevice ? 'Cihaz Düzenle' : 'Yeni Cihaz Ekle'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Cihaz Tipi"
                  fullWidth
                  variant="outlined"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="IP Adresi"
                  fullWidth
                  variant="outlined"
                  value={form.ip}
                  onChange={(e) => setForm({ ...form, ip: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="MAC Adresi"
                  fullWidth
                  variant="outlined"
                  value={form.mac}
                  onChange={(e) => setForm({ ...form, mac: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Seri Numarası"
                  fullWidth
                  variant="outlined"
                  value={form.serial}
                  onChange={(e) => setForm({ ...form, serial: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Durum</InputLabel>
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    label="Durum"
                  >
                    <MenuItem value="active">Aktif</MenuItem>
                    <MenuItem value="inactive">Pasif</MenuItem>
                    <MenuItem value="maintenance">Bakımda</MenuItem>
                    <MenuItem value="broken">Bozuk</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Konum</InputLabel>
                  <Select
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    label="Konum"
                  >
                    <MenuItem value="">Seçiniz</MenuItem>
                    {locations.map((location) => (
                      <MenuItem key={location._id} value={location._id}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Atanan Kişi</InputLabel>
                  <Select
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    label="Atanan Kişi"
                  >
                    <MenuItem value="">Seçiniz</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.name || user.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Satın Alma Tarihi"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={form.purchasedAt}
                  onChange={(e) => setForm({ ...form, purchasedAt: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Garanti Bitiş Tarihi"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={form.warrantyUntil}
                  onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
}
