// webapp/packages/webui/src/components/FloatingChat.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import chatService from '../services/chatService';

const FloatingChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  
  // Model selection state
  const [providers, setProviders] = useState({});
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Fetch providers when modal opens
  useEffect(() => {
    if (chatOpen && Object.keys(providers).length === 0) {
      const fetchProviders = async () => {
        setLoadingProviders(true);
        try {
          const providersData = await chatService.getProviders();
          setProviders(providersData);
          
          // Check for saved selection in sessionStorage
          const savedProvider = sessionStorage.getItem('chat_provider');
          const savedModel = sessionStorage.getItem('chat_model');
          
          if (savedProvider && savedModel && providersData[savedProvider]?.models?.[savedModel]) {
            // Use saved selection
            setSelectedProvider(savedProvider);
            setSelectedModel(savedModel);
          } else {
            // Set default provider/model
            const providerKeys = Object.keys(providersData);
            for (const provider of providerKeys) {
              const models = Object.keys(providersData[provider].models || {});
              if (models.length > 0) {
                setSelectedProvider(provider);
                setSelectedModel(models[0]);
                break;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching providers:', err);
        } finally {
          setLoadingProviders(false);
        }
      };
      fetchProviders();
    }
  }, [chatOpen, providers]);

  // Don't show on the chat page itself
  if (location.pathname === '/chat') {
    return null;
  }

  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    setSelectedProvider(newProvider);
    const models = Object.keys(providers[newProvider]?.models || {});
    if (models.length > 0) {
      setSelectedModel(models[0]);
    }
  };

  const handleSendToChat = () => {
    if (!chatMessage.trim() || !selectedProvider || !selectedModel) return;
    
    // Save selection to sessionStorage for persistence
    sessionStorage.setItem('chat_provider', selectedProvider);
    sessionStorage.setItem('chat_model', selectedModel);
    
    // Navigate to chat page with the message and model config
    navigate('/chat', {
      state: {
        initialMessage: chatMessage,
        provider: selectedProvider,
        model: selectedModel,
      }
    });
    
    // Reset state
    setChatMessage('');
    setChatOpen(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendToChat();
    }
  };

  const availableModels = selectedProvider ? Object.keys(providers[selectedProvider]?.models || {}) : [];

  return (
    <>
      {/* Floating Chat Button */}
      <Fab
        sx={{ 
          position: 'fixed', 
          bottom: 24, 
          right: 24,
          bgcolor: '#18181b',
          color: '#fff',
          '&:hover': { bgcolor: '#27272a' },
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          zIndex: 1000,
        }}
        onClick={() => setChatOpen(true)}
      >
        <ChatIcon />
      </Fab>

      {/* Chat Modal */}
      <Dialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        PaperProps={{
          sx: {
            position: 'fixed',
            bottom: 88,
            right: 24,
            m: 0,
            width: 380,
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }
        }}
        hideBackdrop
        disableScrollLock
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: '#18181b',
          color: 'white',
          py: 1.5,
          px: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChatIcon sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Chat</Typography>
          </Box>
          <IconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: 'white' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
          {/* Model Selection */}
          <Box sx={{ p: 2, borderBottom: '1px solid #e4e4e7', bgcolor: '#fafafa' }}>
            {loadingProviders ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel sx={{ fontSize: '0.85rem' }}>Provider</InputLabel>
                  <Select
                    value={selectedProvider}
                    label="Provider"
                    onChange={handleProviderChange}
                    sx={{ fontSize: '0.85rem' }}
                  >
                    {Object.keys(providers).map((provider) => (
                      <MenuItem key={provider} value={provider} sx={{ fontSize: '0.85rem' }}>
                        {provider}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1.5 }}>
                  <InputLabel sx={{ fontSize: '0.85rem' }}>Model</InputLabel>
                  <Select
                    value={selectedModel}
                    label="Model"
                    onChange={(e) => setSelectedModel(e.target.value)}
                    sx={{ fontSize: '0.85rem' }}
                  >
                    {availableModels.map((model) => (
                      <MenuItem key={model} value={model} sx={{ fontSize: '0.85rem' }}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>

          {/* Empty State / Instructions */}
          <Box sx={{ 
            flexGrow: 1, 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: 200,
            bgcolor: '#fff'
          }}>
            <ChatIcon sx={{ fontSize: 40, color: '#d4d4d8', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Start a conversation
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Select a model and type your message
            </Typography>
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, borderTop: '1px solid #e4e4e7', bgcolor: '#fff' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!selectedProvider || !selectedModel}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#f4f4f5',
                  '& fieldset': { borderColor: '#e4e4e7' },
                  '&:hover fieldset': { borderColor: '#a1a1aa' },
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      disabled={!chatMessage.trim() || !selectedProvider || !selectedModel}
                      onClick={handleSendToChat}
                      sx={{ color: chatMessage.trim() ? '#18181b' : '#d4d4d8' }}
                    >
                      <SendIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingChat;