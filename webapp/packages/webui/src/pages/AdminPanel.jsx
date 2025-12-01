import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ADMIN_PANEL_ENABLED, ADMIN_PANEL_PASSWORD } from '../config/adminConfig';
import adminService from '../services/adminService';

const formatDateInput = (value) => {
  if (!value) return '';
  return value.toString().slice(0, 10);
};

const AdminPanel = () => {
  const [password, setPassword] = useState(ADMIN_PANEL_PASSWORD);
  const [authenticated, setAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const updateEditValues = (userList) => {
    const next = {};
    userList.forEach((user) => {
      const id = user._id || user.id;
      next[id] = {
        email: user.email || '',
        spendRemaining: user.spendRemaining ?? 0,
        monthlyAllowance: user.monthlyAllowance ?? 0,
        refillDate: formatDateInput(user.refillDate),
      };
    });
    setEditValues(next);
  };

  const fetchUsers = async (adminPassword) => {
    const response = await adminService.listUsers(adminPassword);
    setUsers(response);
    updateEditValues(response);
  };

  const handleAuthenticate = async (event) => {
    event.preventDefault();
    setError('');
    setStatusMessage('');
    setLoading(true);
    try {
      await fetchUsers(password);
      setAuthenticated(true);
    } catch (err) {
      setAuthenticated(false);
      setError(err.message || 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (userId, field, value) => {
    setEditValues((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSaveUser = async (userId) => {
    setSavingUserId(userId);
    setError('');
    setStatusMessage('');
    const payload = {
      email: editValues[userId]?.email || undefined,
      spendRemaining: Number(editValues[userId]?.spendRemaining) || 0,
      monthlyAllowance: Number(editValues[userId]?.monthlyAllowance) || 0,
      refillDate: editValues[userId]?.refillDate || null,
    };

    try {
      const updatedUser = await adminService.updateUser(userId, payload, password);
      const updatedUsers = users.map((user) => (user._id === userId || user.id === userId ? updatedUser : user));
      setUsers(updatedUsers);
      updateEditValues(updatedUsers);
      setStatusMessage('User saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setSavingUserId(null);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchUsers(password).catch((err) => setError(err.message || 'Failed to refresh users.'));
    }
  }, [authenticated, password]);

  if (!ADMIN_PANEL_ENABLED) {
    return (
      <Alert severity="info">
        The admin panel is currently disabled. Set VITE_ADMIN_PANEL_ENABLED to true to enable it.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Manage user spend settings. Access is protected by an environment-configured password.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Authenticate
          </Typography>
          <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} onSubmit={handleAuthenticate}>
            <TextField
              label="Admin Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
            />
            <Button type="submit" variant="contained" disabled={loading} sx={{ minWidth: 180 }}>
              {loading ? <CircularProgress size={24} /> : 'Unlock Panel'}
            </Button>
          </Stack>
          {error && (
            <Box mt={2}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}
          {statusMessage && (
            <Box mt={2}>
              <Alert severity="success">{statusMessage}</Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {authenticated && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Users</Typography>
              <Button variant="outlined" onClick={() => fetchUsers(password)} disabled={loading}>
                Refresh
              </Button>
            </Stack>

            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : users.length === 0 ? (
              <Alert severity="info">No users found.</Alert>
            ) : (
              <Grid container spacing={2}>
                {users.map((user) => {
                  const userId = user._id || user.id;
                  const values = editValues[userId] || {};
                  return (
                    <Grid item xs={12} md={6} key={userId}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            {user.email || userId}
                          </Typography>
                          <Stack spacing={2}>
                            <TextField
                              label="User ID"
                              value={userId}
                              InputProps={{ readOnly: true }}
                              fullWidth
                            />
                            <TextField
                              label="Email"
                              value={values.email || ''}
                              onChange={(e) => handleFieldChange(userId, 'email', e.target.value)}
                              fullWidth
                            />
                            <TextField
                              label="Spend Remaining"
                              type="number"
                              value={values.spendRemaining ?? ''}
                              onChange={(e) => handleFieldChange(userId, 'spendRemaining', e.target.value)}
                              fullWidth
                              inputProps={{ step: '0.01' }}
                            />
                            <TextField
                              label="Monthly Allowance"
                              type="number"
                              value={values.monthlyAllowance ?? ''}
                              onChange={(e) => handleFieldChange(userId, 'monthlyAllowance', e.target.value)}
                              fullWidth
                              inputProps={{ step: '0.01' }}
                            />
                            <TextField
                              label="Refill Date"
                              type="date"
                              value={values.refillDate || ''}
                              onChange={(e) => handleFieldChange(userId, 'refillDate', e.target.value)}
                              fullWidth
                              InputLabelProps={{ shrink: true }}
                            />
                            <Button
                              variant="contained"
                              onClick={() => handleSaveUser(userId)}
                              disabled={savingUserId === userId}
                            >
                              {savingUserId === userId ? <CircularProgress size={24} /> : 'Save Changes'}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AdminPanel;
