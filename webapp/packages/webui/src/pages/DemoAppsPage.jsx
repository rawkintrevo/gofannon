import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import demoService from '../services/demoService';

const DemoAppsPage = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, appId: null, appName: '' });

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        setError(null);
        const savedApps = await demoService.getDemos();
        setApps(savedApps);
      } catch (err) {
        setError('Failed to load demo apps.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, []);

  const handleEdit = (appId, event) => {
    event.stopPropagation();
    navigate(`/create-demo/canvas?edit=${appId}`);
  };
  
  const handleDeleteClick = (appId, appName, event) => {
    event.stopPropagation();
    setDeleteConfirmation({ open: true, appId, appName });
  };

  const handleConfirmDelete = async () => {
    const { appId } = deleteConfirmation;
    try {
      await demoService.deleteDemo(appId);
      setApps(prev => prev.filter(app => app._id !== appId));
    } catch (err) {
      setError(`Failed to delete app: ${err.message}`);
    } finally {
      setDeleteConfirmation({ open: false, appId: null, appName: '' });
    }
  };
  
  const handleViewApp = (appId, event) => {
    event.stopPropagation();
    window.open(`/demos/${appId}`, '_blank');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton size="small" onClick={() => navigate('/')} sx={{ mr: 1 }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
          Demo Apps
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/create-demo')}
        >
          Create Demo
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : apps.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                No demo apps yet
              </Typography>
              <Button 
                size="small" 
                onClick={() => navigate('/create-demo')}
                sx={{ mt: 1 }}
              >
                Create your first demo
              </Button>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>APIs</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apps.map((app) => (
                  <TableRow 
                    key={app._id} 
                    hover 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/demos/${app._id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {app.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {app.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${app.selectedApis?.length || 0} APIs`}
                        size="small"
                        sx={{ 
                          bgcolor: '#f4f4f5', 
                          color: '#71717a',
                          fontWeight: 500,
                          fontSize: '0.7rem'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Open in new tab" arrow>
                        <IconButton size="small" onClick={(e) => handleViewApp(app._id, e)}>
                          <OpenInNewIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View" arrow>
                        <IconButton size="small" onClick={() => navigate(`/demos/${app._id}`)}>
                          <VisibilityIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit" arrow>
                        <IconButton size="small" onClick={(e) => handleEdit(app._id, e)}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton size="small" onClick={(e) => handleDeleteClick(app._id, app.name, e)}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>
      
      <Dialog open={deleteConfirmation.open} onClose={() => setDeleteConfirmation({ open: false, appId: null, appName: '' })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete "{deleteConfirmation.appName}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmation({ open: false, appId: null, appName: '' })}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>      
    </Box>
  );
};

export default DemoAppsPage;