import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Servers from './pages/Servers';
import Locations from './pages/Locations';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PrivateRoute from './routes/PrivateRoute';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import './styles/globals.css';
import './styles/components.css';

const App = () => {
  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Giriş ve Hata Sayfaları */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/404" element={<NotFound />} />
            
            {/* Ana Sayfa Yönlendirmesi */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            {/* Private Routes - Layout içinde */}
            <Route element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory/*" element={<Inventory />} />
              <Route path="/servers/*" element={<Servers />} />
              <Route path="/locations/*" element={<Locations />} />
              <Route path="/users/*" element={
                <PrivateRoute requiredRoles={['ADMIN', 'MANAGER']}>
                  <Users />
                </PrivateRoute>
              } />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* 404 Not Found */}
            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;