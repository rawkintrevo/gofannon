// webapp/packages/webui/src/extensions/echo/EchoPage.jsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Container
} from '@mui/material';
import apiClient from '../../../services/apiClient';

const EchoPage = () => {
  const [text, setText] = useState('');
  const [echo, setEcho] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setEcho('');
    try {
      const response = await apiClient.post('/echo', { text });
      setEcho(response.data.echo);
    } catch (err) {
      setError('Failed to get an echo. Is the backend extension running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Echo Chamber
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Type something in the box and click send. The backend will echo it back to you.
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="Text to echo"
            value={text}
            onChange={(e) => setText(e.target.value)}
            variant="outlined"
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={loading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {echo && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Echo:</Typography>
            <Typography variant="body1" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              {echo}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default EchoPage;
