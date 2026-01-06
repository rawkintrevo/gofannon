// webapp/packages/webui/src/components/Layout.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  CssBaseline,
} from '@mui/material';
import ProfileMenu from './ProfileMenu';
import AnvilIcon from './AnvilIcon';
import FloatingChat from './FloatingChat';

const Layout = ({ children }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#18181b',
          borderBottom: '1px solid #27272a',
        }}
        elevation={0}
      >
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              cursor: 'pointer',
              '&:hover': { opacity: 0.9 }
            }} 
            onClick={() => navigate('/')}
          >
            <AnvilIcon size={28} color="#ffffff" />
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                fontWeight: 600, 
                letterSpacing: '-0.5px',
                color: '#fff'
              }}
            >
              Gofannon
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <ProfileMenu />
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#f8f9fa',
          pt: '56px', // Account for fixed AppBar
        }}
      >
        {children}
      </Box>
      <FloatingChat />
    </Box>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;