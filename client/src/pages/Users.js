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
  InputLabel,
  Tooltip,
  Paper,
  Divider,
  Avatar,
  Snackbar,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Add,
  Person,
  Edit,
  Delete,
  Search,
  Email,
  Phone,
  Badge,
  VpnKey,
  Group,
  Lock,
  LockOpen,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import api from '../services/api';
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

const userRoles = [
  { value: 'USER', label: 'Kullanıcı', color: '#2196f3', permissions: ['DASHBOARD_VIEW'] },
  { value: 'ADMIN', label: 'Yönetici', color: '#f44336', permissions: ['ALL'] },
  { value: 'MODERATOR', label: 'Moderatör', color: '#ff9800', permissions: ['USER_MANAGE', 'INVENTORY_MANAGE'] },
  { value: 'VIEWER', label: 'İzleyici', color: '#4caf50', permissions: ['DASHBOARD_VIEW', 'INVENTORY_VIEW'] },
];

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`user-tabpanel-${index}`}
    aria-labelledby={`user-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const UserStatusChip = ({ status, isActive }) => {
  if (!isActive) {
    return <Chip label="Devre Dışı" color="error" size="small" />;
  }
  
  const getStatusProps = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { label: 'Aktif', color: 'success' };
      case 'inactive':
        return { label: 'Pasif', color: 'default' };
      case 'locked':
        return { label: 'Kilitli', color: 'error' };
      case 'pending':
        return { label: 'Beklemede', color: 'warning' };
      default:
        return { label: 'Bilinmiyor', color: 'default' };
    }
  };

  const props = getStatusProps(status);
  return <Chip {...props} size="small" />;
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    role: 'USER',
    password: '',
    confirmPassword: '',
    isActive: true,
    permissions: [],
    notes: '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      
      // API yanıt yapısına göre kullanıcı verilerini alma
      if (response.data && response.data.success) {
        setUsers(response.data.data?.users || []);
      } else {
        // Alternatif veri yapısı
        setUsers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      logError('Users fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.isActive);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => !user.isActive);
      }
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Password validation
    if (!selectedUser && formData.password !== formData.confirmPassword) {
      showSnackbar('Şifreler eşleşmiyor', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const submitData = { ...formData };
      delete submitData.confirmPassword;

      if (selectedUser) {
        const response = await api.put(`/api/users/${selectedUser._id}`, submitData);
        if (response.data.success) {
          showSnackbar('Kullanıcı güncellendi', 'success');
        }
      } else {
        const response = await api.post('/api/users', submitData);
        if (response.data.success) {
          showSnackbar('Kullanıcı eklendi', 'success');
        }
      }
      
      await fetchUsers();
      handleCloseForm();
    } catch (error) {
      console.error('Form submit error:', error);
      showSnackbar('İşlem sırasında hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showSnackbar('Şifreler eşleşmiyor', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await api.put(`/api/users/${selectedUser._id}/password`, {
        password: passwordData.newPassword
      });
      
      if (response.data.success) {
        showSnackbar('Şifre güncellendi', 'success');
        setShowPasswordDialog(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Password change error:', error);
      showSnackbar('Şifre değiştirme başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/api/users/${id}`);
      if (response.data.success) {
        showSnackbar('Kullanıcı silindi', 'success');
        await fetchUsers();
      }
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar('Silme işlemi başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      setLoading(true);
      const response = await api.put(`/api/users/${userId}/toggle-active`, {
        isActive: !currentStatus
      });
      
      // Yanıt kontrolü düzeltildi
      if (response.data && (response.data.success || response.status === 200)) {
        showSnackbar(
          !currentStatus ? 'Kullanıcı aktifleştirildi' : 'Kullanıcı devre dışı bırakıldı', 
          'success'
        );
        await fetchUsers();
      }
    } catch (error) {
      console.error('Toggle active error:', error);
      showSnackbar('Durum değiştirme başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        department: user.department || '',
        role: user.role || 'USER',
        password: '',
        confirmPassword: '',
        isActive: user.isActive !== false, // undefined kontrolü eklendi
        permissions: user.permissions || [],
        notes: user.notes || '',
      });
    } else {
      setSelectedUser(null);
      // Form resetleme düzeltildi
      setFormData({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        department: '',
        role: 'USER',
        password: '',
        confirmPassword: '',
        isActive: true,
        permissions: [],
        notes: '',
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedUser(null);
    setTabValue(0);
  };

  const handleOpenPasswordDialog = (user) => {
    setSelectedUser(user);
    setShowPasswordDialog(true);
  };

  const getRoleConfig = (roleValue) => {
    return userRoles.find(r => r.value === roleValue) || userRoles[0];
  };

  const getUserInitials = (user) => {
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person color="primary" />
          Kullanıcı Yönetimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenForm()}
          disabled={loading}
        >
          Yeni Kullanıcı
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Kullanıcı ara..."
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
              <InputLabel>Rol Filtresi</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Rol Filtresi"
              >
                <MenuItem value="">Tümü</MenuItem>
                {userRoles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: role.color,
                        }}
                      />
                      {role.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                <MenuItem value="active">Aktif</MenuItem>
                <MenuItem value="inactive">Pasif</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              Toplam: {filteredUsers.length} kullanıcı
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Grid */}
      <Grid container spacing={3}>
        {filteredUsers.map((user) => {
          const roleConfig = getRoleConfig(user.role);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={user._id}>
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
                    <Avatar sx={{ bgcolor: roleConfig.color, width: 40, height: 40 }}>
                      {getUserInitials(user)}
                    </Avatar>
                    <UserStatusChip status={user.status} isActive={user.isActive} />
                  </Box>
                  
                  <Typography variant="h6" component="h3" gutterBottom>
                    {user.firstName} {user.lastName}
                  </Typography>
                  
                  <Chip 
                    label={roleConfig.label}
                    size="small"
                    sx={{ mb: 2, bgcolor: roleConfig.color, color: 'white' }}
                  />
                  
                  <List dense>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Badge fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Kullanıcı Adı" 
                        secondary={user.username}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Email fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="E-posta" 
                        secondary={user.email || 'Belirtilmemiş'}
                      />
                    </ListItem>
                    {user.department && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Group fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Departman" 
                          secondary={user.department}
                        />
                      </ListItem>
                    )}
                    {user.phone && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Phone fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Telefon" 
                          secondary={user.phone}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Tooltip title="Şifre Değiştir">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenPasswordDialog(user)}
                      disabled={loading}
                    >
                      <VpnKey />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={user.isActive ? "Devre Dışı Bırak" : "Aktifleştir"}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleActive(user._id, user.isActive)}
                      disabled={loading}
                    >
                      {user.isActive ? <Lock /> : <LockOpen />}
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleOpenForm(user)}
                    disabled={loading}
                  >
                    Düzenle
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDelete(user._id)}
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
      {filteredUsers.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || roleFilter || statusFilter
              ? 'Arama kriterlerine uygun kullanıcı bulunamadı'
              : 'Henüz kullanıcı eklenmemiş'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenForm()}
            sx={{ mt: 2 }}
          >
            İlk Kullanıcıyı Ekle
          </Button>
        </Paper>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedUser ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}
          </DialogTitle>
          <DialogContent>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Genel Bilgiler" />
              <Tab label="Rol ve İzinler" />
              <Tab label="İletişim" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Kullanıcı Adı"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    required
                    disabled={!!selectedUser}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="E-posta"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ad"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Soyad"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </Grid>
                {!selectedUser && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Şifre"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Şifre Tekrar"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                    }
                    label="Aktif Kullanıcı"
                  />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Rol</InputLabel>
                    <Select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      label="Rol"
                    >
                      {userRoles.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: role.color,
                              }}
                            />
                            {role.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Rol İzinleri:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {getRoleConfig(formData.role).permissions.map((permission) => (
                      <Chip 
                        key={permission}
                        label={permission}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Telefon"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Departman"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notlar"
                    multiline
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Kullanıcı hakkında notlar..."
                  />
                </Grid>
              </Grid>
            </TabPanel>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {selectedUser ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handlePasswordChange}>
          <DialogTitle>
            Şifre Değiştir - {selectedUser?.username}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Yeni Şifre"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Şifre Tekrar"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPasswordDialog(false)}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              Şifreyi Değiştir
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
