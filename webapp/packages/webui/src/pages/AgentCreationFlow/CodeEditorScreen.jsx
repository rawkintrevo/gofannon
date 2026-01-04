import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  TextField, 
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PublishIcon from '@mui/icons-material/Publish';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAgentFlow } from './AgentCreationFlowContext';
import chatService from '../../services/chatService';
import agentService from '../../services/agentService';
import ModelConfigDialog from '../../components/ModelConfigDialog';

const CodeEditorScreen = () => {
  const { 
    generatedCode, 
    setGeneratedCode,
    description,
    setDescription,
    tools,
    inputSchema,
    outputSchema,
    swaggerSpecs,
    gofannonAgents,
    invokableModels,
    setInvokableModels,
    composerModelConfig,
    setComposerModelConfig,
    composerBuiltInTool,
    setComposerBuiltInTool,
    setFriendlyName,
    setDocstring,
  } = useAgentFlow();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(description);

  // Model management state
  const [providers, setProviders] = useState({});
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [modelDialogMode, setModelDialogMode] = useState('invokable'); // 'invokable' or 'composer'
  const [dialogProvider, setDialogProvider] = useState('');
  const [dialogModel, setDialogModel] = useState('');
  const [dialogParamSchema, setDialogParamSchema] = useState({});
  const [dialogParams, setDialogParams] = useState({});
  const [dialogBuiltInTool, setDialogBuiltInTool] = useState('');

  // Regenerate state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [selectedComposerModel, setSelectedComposerModel] = useState(null);
  const [error, setError] = useState(null);

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await chatService.getProviders();
        setProviders(data);
        const defaultProvider = Object.keys(data)[0] || '';
        setDialogProvider(defaultProvider);
        if (defaultProvider) {
          const models = Object.keys(data[defaultProvider]?.models || {});
          setDialogModel(models[0] || '');
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, []);

  const handleRunInSandbox = () => {
    navigate('/create-agent/sandbox');
  };

  const handleDeploy = () => {
    navigate('/create-agent/deploy');
  };

  const handleToggleEdit = () => {
    setIsEditing(prev => !prev);
  };

  const handleSaveDescription = () => {
    setDescription(editedDescription);
    setIsEditingDescription(false);
  };

  const handleCancelDescriptionEdit = () => {
    setEditedDescription(description);
    setIsEditingDescription(false);
  };

  // Model dialog functions
  const openModelDialog = (mode) => {
    setModelDialogMode(mode);
    const defaultProvider = Object.keys(providers)[0] || '';
    setDialogProvider(defaultProvider);
    const models = Object.keys(providers[defaultProvider]?.models || {});
    const defaultModel = models[0] || '';
    setDialogModel(defaultModel);
    const modelParams = providers[defaultProvider]?.models?.[defaultModel]?.parameters || {};
    setDialogParamSchema(modelParams);
    // Only set params with non-null defaults
    // For Anthropic, skip top_p (use temperature by default) since they're mutually exclusive
    const defaultParams = {};
    Object.keys(modelParams).forEach(key => {
      if (modelParams[key].default !== null) {
        // Skip top_p for Anthropic - use temperature by default
        if (key === 'top_p' && defaultProvider === 'anthropic') {
          return;
        }
        defaultParams[key] = modelParams[key].default;
      }
    });
    setDialogParams(defaultParams);
    setDialogBuiltInTool('');
    setModelDialogOpen(true);
  };

  const handleAddInvokableModel = () => {
    if (!dialogProvider || !dialogModel) return;
    const newModel = {
      provider: dialogProvider,
      model: dialogModel,
      parameters: dialogParams,
      builtInTool: dialogBuiltInTool || null,
    };
    setInvokableModels(prev => [...prev, newModel]);
    setModelDialogOpen(false);
  };

  const handleRemoveInvokableModel = (index) => {
    setInvokableModels(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetComposerModel = () => {
    if (!dialogProvider || !dialogModel) return;
    const newConfig = {
      provider: dialogProvider,
      model: dialogModel,
      parameters: dialogParams,
      builtInTool: dialogBuiltInTool || null,
    };
    setComposerModelConfig(newConfig);
    if (dialogBuiltInTool) {
      setComposerBuiltInTool(dialogBuiltInTool);
    }
    setModelDialogOpen(false);
  };

  // Regenerate code
  const openRegenerateDialog = () => {
    if (composerModelConfig) {
      setSelectedComposerModel(composerModelConfig);
    } else if (invokableModels?.length > 0) {
      setSelectedComposerModel(invokableModels[0]);
    }
    setRegenerateDialogOpen(true);
  };

  const handleRegenerateCode = async () => {
    if (!selectedComposerModel) return;
    if (!description || description.trim() === '') {
      setError('Description is required to generate code. Please add a description first.');
      return;
    }
    setRegenerateDialogOpen(false);
    setError(null);
    setIsRegenerating(true);

    try {
      const agentConfig = {
        tools: tools || {},
        description: description,
        inputSchema,
        outputSchema,
        invokableModels: invokableModels || [],
        swaggerSpecs: swaggerSpecs || [],
        gofannonAgents: (gofannonAgents || []).map(ga => typeof ga === 'string' ? ga : ga.id),
        builtInTools: selectedComposerModel.builtInTool ? [selectedComposerModel.builtInTool] : [],
        modelConfig: {
          provider: selectedComposerModel.provider,
          model: selectedComposerModel.model,
          parameters: selectedComposerModel.parameters || {},
        },
      };

      const response = await agentService.generateCode(agentConfig);
      setGeneratedCode(response.code);
      setFriendlyName(response.friendlyName);
      setDocstring(response.docstring);
      setComposerModelConfig({
        provider: selectedComposerModel.provider,
        model: selectedComposerModel.model,
        parameters: selectedComposerModel.parameters || {},
        builtInTool: selectedComposerModel.builtInTool || null,
      });
    } catch (err) {
      setError(err.message || 'Failed to regenerate code.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 900, margin: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Screen 4: Agent Code
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Review and edit your agent's code, description, and model configuration.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Description Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Description</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {isEditingDescription ? (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" onClick={handleSaveDescription}>
                  Save
                </Button>
                <Button variant="outlined" size="small" onClick={handleCancelDescriptionEdit}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                {description || 'No description provided.'}
              </Typography>
              <Button 
                size="small" 
                startIcon={<EditIcon />} 
                onClick={() => setIsEditingDescription(true)}
              >
                Edit Description
              </Button>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Models Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Models</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Composer Model */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Composer Model (for code generation)</Typography>
            {composerModelConfig ? (
              <Chip
                label={`${composerModelConfig.provider}/${composerModelConfig.model}${composerModelConfig.builtInTool ? ` + ${composerModelConfig.builtInTool}` : ''}${Object.keys(composerModelConfig.parameters || {}).length > 0 ? ` (${Object.entries(composerModelConfig.parameters).map(([k,v]) => `${k}: ${v}`).join(', ')})` : ''}`}
                color="secondary"
                variant="outlined"
                sx={{ mr: 1 }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">Not set</Typography>
            )}
            <Button
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => openModelDialog('composer')}
              disabled={loadingProviders}
              sx={{ ml: 1 }}
            >
              {composerModelConfig ? 'Change' : 'Set'} Composer Model
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Invokable Models */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>Invokable Models (agent can call at runtime)</Typography>
            {invokableModels && invokableModels.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {invokableModels.map((m, idx) => {
                  const paramStr = Object.entries(m.parameters || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');
                  const toolStr = m.builtInTool ? ` + ${m.builtInTool}` : '';
                  return (
                    <Chip
                      key={idx}
                      label={`${m.provider}/${m.model}${toolStr}${paramStr ? ` (${paramStr})` : ''}`}
                      onDelete={() => handleRemoveInvokableModel(idx)}
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No invokable models configured.
              </Typography>
            )}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => openModelDialog('invokable')}
              disabled={loadingProviders}
            >
              Add Invokable Model
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Code Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Python Code</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button size="small" startIcon={isEditing ? <SaveIcon /> : <EditIcon />} onClick={handleToggleEdit}>
              {isEditing ? 'Done Editing' : 'Edit Code'}
            </Button>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={15}
            maxRows={25}
            value={generatedCode}
            onChange={(e) => setGeneratedCode(e.target.value)}
            InputProps={{
              readOnly: !isEditing,
              style: {
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: isEditing ? 'inherit' : 'lightcoral',
                backgroundColor: isEditing ? 'inherit' : '#1e1e1e',
              }
            }}
            sx={{ '& .MuiInputBase-root': { p: 1 } }}
          />
        </AccordionDetails>
      </Accordion>

      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={isRegenerating ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
          onClick={openRegenerateDialog}
          disabled={isRegenerating || (!composerModelConfig && !invokableModels?.length)}
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate Code'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<PlayArrowIcon />}
          onClick={handleRunInSandbox}
        >
          Run in Sandbox
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PublishIcon />}
          onClick={handleDeploy}
        >
          Deploy
        </Button>
      </Stack>

      {/* Model Config Dialog */}
      <ModelConfigDialog
        open={modelDialogOpen}
        onClose={() => setModelDialogOpen(false)}
        onSave={modelDialogMode === 'composer' ? handleSetComposerModel : handleAddInvokableModel}
        title={modelDialogMode === 'composer' ? 'Set Composer Model' : 'Add Invokable Model'}
        providers={providers}
        selectedProvider={dialogProvider}
        setSelectedProvider={setDialogProvider}
        selectedModel={dialogModel}
        setSelectedModel={setDialogModel}
        modelParamSchema={dialogParamSchema}
        setModelParamSchema={setDialogParamSchema}
        currentModelParams={dialogParams}
        setCurrentModelParams={setDialogParams}
        selectedBuiltInTool={dialogBuiltInTool}
        setSelectedBuiltInTool={setDialogBuiltInTool}
        loadingProviders={loadingProviders}
        providersError={null}
      />

      {/* Regenerate Dialog */}
      <Dialog
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
      >
        <DialogTitle>Regenerate Agent Code</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select which model to use for code generation. The code will be regenerated based on the current description.
          </DialogContentText>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Composer Model</InputLabel>
            <Select
              value={selectedComposerModel ? `${selectedComposerModel.provider}/${selectedComposerModel.model}` : ''}
              label="Composer Model"
              onChange={(e) => {
                const [provider, ...modelParts] = e.target.value.split('/');
                const model = modelParts.join('/');
                if (composerModelConfig && 
                    composerModelConfig.provider === provider && 
                    composerModelConfig.model === model) {
                  setSelectedComposerModel(composerModelConfig);
                } else {
                  const selected = invokableModels?.find(m => m.provider === provider && m.model === model);
                  if (selected) {
                    setSelectedComposerModel(selected);
                  } else {
                    setSelectedComposerModel({ provider, model, parameters: {} });
                  }
                }
              }}
            >
              {composerModelConfig && (
                <MenuItem value={`${composerModelConfig.provider}/${composerModelConfig.model}`}>
                  {composerModelConfig.provider}/{composerModelConfig.model} (stored composer)
                </MenuItem>
              )}
              {invokableModels?.filter(m => 
                !composerModelConfig || 
                m.provider !== composerModelConfig.provider || 
                m.model !== composerModelConfig.model
              ).map((m, idx) => (
                <MenuItem key={idx} value={`${m.provider}/${m.model}`}>
                  {m.provider}/{m.model}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {(!invokableModels?.length && !composerModelConfig) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No models configured. Please add a model first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRegenerateCode} 
            color="primary" 
            variant="contained"
            disabled={!selectedComposerModel}
          >
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CodeEditorScreen;