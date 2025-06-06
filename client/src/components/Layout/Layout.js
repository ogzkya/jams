import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';

import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

const drawerWidth = 240;

export default function Layout() {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const toggleMobileDrawer = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      <AppHeader 
        open={open}
        drawerWidth={drawerWidth}
        toggleDrawer={toggleMobileDrawer} 
      />
      
      <Sidebar 
        open={open}
        mobileOpen={mobileOpen}
        drawerWidth={drawerWidth}
        toggleDrawer={toggleDrawer}
        toggleMobileDrawer={toggleMobileDrawer}
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
