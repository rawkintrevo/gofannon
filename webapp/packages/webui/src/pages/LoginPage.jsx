import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Paper,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import { useAuth } from '../contexts/AuthContextValue';
import { useConfig } from '../contexts/ConfigContextValue';
import AnvilIcon from '../components/AnvilIcon';

const socialProviderDetails = {
  google: {
    name: 'Google',
    icon: <GoogleIcon />,
  },
  facebook: {
    name: 'Facebook',
    icon: <FacebookIcon />,
  },
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const {
    loginWithEmail,
    loginWithProvider,
    loginAsMockUser,
    error,
    loading,
    user,
  } = useAuth();

  const { config } = useConfig();
  const authProviderType = config.auth.provider;
  const enabledSocialProviders = config.auth.socialProviders || [];

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    await loginWithEmail(email, password);
  };

  const handleProviderLogin = async (providerId) => {
    await loginWithProvider(providerId);
  };

  const handleMockLogin = async () => {
    await loginAsMockUser();
  };

  const renderMockLogin = () => (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        Local development mode - authentication disabled
      </Typography>
      <Button
        variant="contained"
        onClick={handleMockLogin}
        disabled={loading}
        fullWidth
        size="large"
        sx={{
          bgcolor: '#18181b',
          '&:hover': { bgcolor: '#27272a' },
          py: 1.5
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Enter App'}
      </Button>
    </>
  );

  const renderStandardLogin = () => (
    <>
      <Box component="form" onSubmit={handleEmailLogin} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': { borderColor: '#18181b' },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#18181b' },
          }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': { borderColor: '#18181b' },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: '#18181b' },
          }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ 
            mt: 3, 
            mb: 2,
            bgcolor: '#18181b',
            '&:hover': { bgcolor: '#27272a' },
            py: 1.5
          }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
        </Button>
      </Box>

      {enabledSocialProviders.length > 0 && (
        <>
          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">or continue with</Typography>
          </Divider>
          <Stack spacing={2}>
            {enabledSocialProviders.map((providerId) => {
              const details = socialProviderDetails[providerId];
              if (!details) return null;
              return (
                <Button
                  key={providerId}
                  fullWidth
                  variant="outlined"
                  startIcon={details.icon}
                  onClick={() => handleProviderLogin(providerId)}
                  disabled={loading}
                  sx={{ 
                    justifyContent: 'center',
                    borderColor: '#e4e4e7',
                    color: '#18181b',
                    '&:hover': { 
                      borderColor: '#a1a1aa',
                      bgcolor: '#fafafa'
                    }
                  }}
                >
                  {details.name}
                </Button>
              );
            })}
          </Stack>
        </>
      )}
    </>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f8f9fa', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid #e4e4e7',
            borderRadius: 2,
          }}
        >
          {/* Logo */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            mb: 4 
          }}>
            <AnvilIcon size={36} color="#18181b" />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600, 
                letterSpacing: '-0.5px',
                color: '#18181b'
              }}
            >
              Gofannon
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {authProviderType === 'mock' ? renderMockLogin() : renderStandardLogin()}
        </Paper>
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          AI Agent Development Platform
        </Typography>
      </Container>
    </Box>
  );
};

export default LoginPage;