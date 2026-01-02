import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  List,
  Chip,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  IconButton,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PublishIcon from '@mui/icons-material/Publish';
import SaveIcon from '@mui/icons-material/Save';
import WebIcon from '@mui/icons-material/Web';
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import Divider from '@mui/material/Divider';

import { useAgentFlow } from './AgentCreationFlow/AgentCreationFlowContext';
import agentService from '../services/agentService';
import chatService from '../services/chatService';
import CodeEditor from '../components/CodeEditor';
import SpecViewerModal from '../components/SpecViewerModal';
import CodeIcon from '@mui/icons-material/Code';
import AddIcon from '@mui/icons-material/Add';

const ViewAgent = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agentFlowContext = useAgentFlow();

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [selectedComposerModel, setSelectedComposerModel] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);  
  const [viewingSpec, setViewingSpec] = useState({ open: false, name: '', content: '' });
  
  // State for deployment
  const [deployment, setDeployment] = useState(null);
  const [isUndeploying, setIsUndeploying] = useState(false);

  // State for model management
  const [providers, setProviders] = useState({});
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [modelDialogMode, setModelDialogMode] = useState('invokable'); // 'invokable' or 'composer'
  const [dialogProvider, setDialogProvider] = useState('');
  const [dialogModel, setDialogModel] = useState('');
  const [dialogParams, setDialogParams] = useState({});

  const isCreationFlow = !agentId;

  useEffect(() => {
    if (agentId) { // Only for existing agents, not during creation flow
        const fetchDeploymentStatus = async () => {
            try {
                const status = await agentService.getDeployment(agentId);
                setDeployment(status);
            } catch (err) {
                // Don't block the page from rendering, just show an auxiliary error
                const deploymentError = 'Could not fetch deployment status.';
                setError(prev => prev ? `${prev}\n${deploymentError}` : deploymentError);
            }
        };
        fetchDeploymentStatus();
    }
  }, [agentId]);

  // Fetch providers for model selection
  useEffect(() => {
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        const providersData = await chatService.getProviders();
        setProviders(providersData);
        // Set default provider if available
        const defaultProvider = Object.keys(providersData)[0];
        if (defaultProvider) {
          setDialogProvider(defaultProvider);
          const models = Object.keys(providersData[defaultProvider]?.models || {});
          if (models.length > 0) {
            setDialogModel(models[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, []);

    const loadAgentData = useCallback(async () => {
    setError(null);
    setLoading(true);
    
    try {
      if (isCreationFlow) {
        // In creation flow, data comes from context
        if (!agentFlowContext.generatedCode) {
            throw new Error("Agent code has not been generated yet. Please go back to the schemas screen.");
        }
        
        setAgent({
          name: agentFlowContext.friendlyName || '',
          description: agentFlowContext.description,
          tools: agentFlowContext.tools,
          swaggerSpecs: agentFlowContext.swaggerSpecs,
          gofannonAgents: agentFlowContext.gofannonAgents,
          code: agentFlowContext.generatedCode,
          inputSchema: agentFlowContext.inputSchema,
          outputSchema: agentFlowContext.outputSchema,
          invokableModels: agentFlowContext.invokableModels,
          docstring: agentFlowContext.docstring,
          friendlyName: agentFlowContext.friendlyName,
        });

      } else {
        // In view/edit mode, fetch from API
        const data = await agentService.getAgent(agentId);
        
        if (data.gofannonAgents && data.gofannonAgents.length > 0) {
            // To display names, we need to fetch all agents and create a map.
            const allAgents = await agentService.getAgents();
            const agentMap = new Map(allAgents.map(a => [a._id, a.name]));
            data.gofannonAgents = data.gofannonAgents.map(id => ({
                id: id,
                name: agentMap.get(id) || `Unknown Agent (ID: ${id})`
            }));
        } else {
            data.gofannonAgents = []; // Ensure it's an array
        }
        
        setAgent(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load agent data.');
    } finally {
      setLoading(false);
    }
  }, [agentId, isCreationFlow, agentFlowContext]);

  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);
  
  const handleFieldChange = (field, value) => {
    setAgent(prev => ({...prev, [field]: value}));
  };

  const handleViewSpec = (spec) => {
    setViewingSpec({ open: true, name: spec.name, content: spec.content });
};

  const updateContextAndNavigate = (path) => {
      // Update the context with the current agent state before navigating
      agentFlowContext.setDescription(agent.description);
      agentFlowContext.setGeneratedCode(agent.code);
      agentFlowContext.setTools(agent.tools);
      agentFlowContext.setSwaggerSpecs(agent.swaggerSpecs);
      agentFlowContext.setInputSchema(agent.inputSchema);
      agentFlowContext.setOutputSchema(agent.outputSchema);
      agentFlowContext.setInvokableModels(agent.invokableModels);
      agentFlowContext.setDocstring(agent.docstring);
      agentFlowContext.setGofannonAgents(agent.gofannonAgents);
      agentFlowContext.setFriendlyName(agent.friendlyName);
      navigate(path);
    
  };

  const handleRunInSandbox = () => {
    if (agentId) {
      // For saved agents, navigate to agent-specific sandbox route
      updateContextAndNavigate(`/agent/${agentId}/sandbox`);
    } else {
      // For creation flow, navigate to creation sandbox
      updateContextAndNavigate('/create-agent/sandbox');
    }
  };

  const handleDeploy = () => {
    if (agentId) {
      // For saved agents, navigate directly to deploy screen with agentId
      navigate(`/agent/${agentId}/deploy`);
    } else {
      // For unsaved agents (creation flow), update context and navigate
      updateContextAndNavigate('/create-agent/deploy');
    }
  };

  const handleEditTools = () => {
    updateContextAndNavigate('/create-agent/tools');
  };

  const handleUpdateAgent = async () => {
    if (!agentId) return; // Should not happen if button is only for edit mode
    setError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await agentService.updateAgent(agentId, {
        name: agent.name,
        description: agent.description,
        code: agent.code,
        docstring: agent.docstring,
        friendlyName: agent.friendlyName,
        tools: agent.tools || {},
        swaggerSpecs: agent.swaggerSpecs || [],
        inputSchema: agent.inputSchema,
        outputSchema: agent.outputSchema,
        invokableModels: agent.invokableModels,
        gofannonAgents: (agent.gofannonAgents || []).map(ga => typeof ga === 'string' ? ga : ga.id),
        composerThoughts: agent.composerThoughts,
        composerModelConfig: agent.composerModelConfig,
      });
      setSaveSuccess(true);
    } catch (err) {
        setError(err.message || 'Failed to update agent.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!agent || !selectedComposerModel) return;
    setRegenerateDialogOpen(false);
    setError(null);
    setSaveSuccess(false);
    setIsRegenerating(true);
    try {
      const agentConfig = {
        tools: agent.tools || {},
        description: agent.description,
        inputSchema: agent.inputSchema,
        outputSchema: agent.outputSchema,
        invokableModels: agent.invokableModels || [],
        swaggerSpecs: agent.swaggerSpecs || [],
        gofannonAgents: (agent.gofannonAgents || []).map(ga => typeof ga === 'string' ? ga : ga.id),
        modelConfig: {
          provider: selectedComposerModel.provider,
          model: selectedComposerModel.model,
          parameters: selectedComposerModel.parameters || {},
        },
      };

      const response = await agentService.generateCode(agentConfig);
      
      // Update the agent state with new code, docstring, and composer model config
      setAgent(prev => ({
        ...prev,
        code: response.code,
        docstring: response.docstring,
        friendlyName: response.friendlyName,
        composerModelConfig: {
          provider: selectedComposerModel.provider,
          model: selectedComposerModel.model,
          parameters: selectedComposerModel.parameters || {},
        },
      }));
      
      setSaveSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to regenerate code.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const openRegenerateDialog = () => {
    // Default to stored composer model, or first invokable model
    if (agent?.composerModelConfig) {
      setSelectedComposerModel(agent.composerModelConfig);
    } else if (agent?.invokableModels?.length > 0) {
      setSelectedComposerModel(agent.invokableModels[0]);
    }
    setRegenerateDialogOpen(true);
  };

  // Model management functions
  const openModelDialog = (mode) => {
    setModelDialogMode(mode);
    // Reset dialog state
    const defaultProvider = Object.keys(providers)[0] || '';
    setDialogProvider(defaultProvider);
    const models = Object.keys(providers[defaultProvider]?.models || {});
    setDialogModel(models[0] || '');
    setDialogParams({});
    setModelDialogOpen(true);
  };

  const handleProviderChange = (provider) => {
    setDialogProvider(provider);
    const models = Object.keys(providers[provider]?.models || {});
    setDialogModel(models[0] || '');
    setDialogParams({});
  };

  const handleAddInvokableModel = () => {
    if (!dialogProvider || !dialogModel) return;
    const newModel = {
      provider: dialogProvider,
      model: dialogModel,
      parameters: dialogParams,
    };
    setAgent(prev => ({
      ...prev,
      invokableModels: [...(prev.invokableModels || []), newModel],
    }));
    setModelDialogOpen(false);
  };

  const handleRemoveInvokableModel = (index) => {
    setAgent(prev => ({
      ...prev,
      invokableModels: prev.invokableModels.filter((_, i) => i !== index),
    }));
  };

  const handleSetComposerModel = () => {
    if (!dialogProvider || !dialogModel) return;
    const newComposerConfig = {
      provider: dialogProvider,
      model: dialogModel,
      parameters: dialogParams,
    };
    setAgent(prev => ({
      ...prev,
      composerModelConfig: newComposerConfig,
    }));
    setModelDialogOpen(false);
  };

  const handleDeleteAgent = async () => {
    if (!agentId) return;
    setDeleteConfirmationOpen(false);
    setError(null);
    setIsSaving(true); // Reuse saving state for loading indicator

    try {
      await agentService.deleteAgent(agentId);
      navigate('/agents', { replace: true }); // Redirect after deletion
    } catch (err) {
      setError(err.message || 'Failed to delete agent.');
      // Stay on the page to show the error
      setIsSaving(false);
    }
    // On success, isSaving will not be set to false because we navigate away.    
  };

  const handleUndeploy = async () => {
    if (!agentId) return;
    setIsUndeploying(true);
    setError(null);
    try {
        await agentService.undeployAgent(agentId);
        // Update UI immediately to reflect the undeployed state
        setDeployment({ is_deployed: false });
    } catch (err) {
        setError(err.message || 'Failed to undeploy agent.');
    } finally {
        setIsUndeploying(false);
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!agent) {
    return <Alert severity="warning">No agent data found.</Alert>;
  }
  
  return (
    <Paper sx={{ p: 3, maxWidth: 900, margin: 'auto', mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
            {isCreationFlow ? 'Review Your New Agent' : `Viewing Agent: ${agent.name}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isCreationFlow ? 'Review the generated code and details below. You can make edits before proceeding.' : 'View and edit the details of your saved agent.'}
        </Typography>

        {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)}>Agent updated successfully!</Alert>}

        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Tools & Specs</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="subtitle1" gutterBottom>MCP Servers</Typography>
                {Object.keys(agent.tools).length > 0 ? (
                <List dense>
                    {Object.entries(agent.tools).map(([url, selectedTools]) => (
                        <ListItem key={url}>
                            <ListItemIcon><WebIcon /></ListItemIcon>
                            <ListItemText primary={url} secondary={selectedTools.length > 0 ? `Selected: ${selectedTools.join(', ')}` : "No specific tools selected"} />
                        </ListItem>
                    ))}
                </List>
                ) : (<Typography variant="body2" color="text.secondary">No MCP servers configured.</Typography>)}
                <Typography variant="subtitle1" gutterBottom sx={{mt: 2}}>Swagger/OpenAPI Specs</Typography>
                {agent.swaggerSpecs.length > 0 ? (
                <List dense>
                    {agent.swaggerSpecs.map(spec => (
                        <ListItem
                            key={spec.name}
                            secondaryAction={
                                <IconButton edge="end" aria-label="view" onClick={() => handleViewSpec(spec)}>
                                    <VisibilityIcon />
                                </IconButton>
                            }
                        >
                            <ListItemIcon><ArticleIcon /></ListItemIcon>
                            <ListItemText primary={spec.name} />
                        </ListItem>
                    ))}
                </List>
                ) : (<Typography variant="body2" color="text.secondary">No Swagger specs uploaded.</Typography>)}
                
                <Typography variant="subtitle1" gutterBottom sx={{mt: 2}}>Gofannon Agents</Typography>
                {agent.gofannonAgents && agent.gofannonAgents.length > 0 ? (
                <List dense>
                    {agent.gofannonAgents.map(ga => (
                        <ListItem key={ga.id}>
                            <ListItemIcon><SmartToyIcon /></ListItemIcon>
                            <ListItemText primary={ga.name} />
                        </ListItem>
                    ))}
                </List>
                ) : (<Typography variant="body2" color="text.secondary">No Gofannon agents configured.</Typography>)}
                
                {!isCreationFlow && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEditTools}
                    sx={{ mt: 2 }}
                  >
                    Edit Tools & Specs
                  </Button>
                )}
            </AccordionDetails>
        </Accordion>

        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Description</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <TextField 
                    fullWidth
                    multiline
                    rows={4}
                    label="Agent Description"
                    value={agent.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                />
            </AccordionDetails>
        </Accordion>

        {agent.docstring && (
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Generated Docstring</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', overflowX: 'auto', border: '1px solid #444' }}>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                            {agent.docstring}
                        </pre>
                    </Paper>
                </AccordionDetails>
            </Accordion>
        )}

        {agent.composerThoughts && (
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Composer Thoughts</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', overflowX: 'auto', border: '1px solid #444', maxHeight: '300px' }}>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                            {JSON.stringify(agent.composerThoughts, null, 2)}
                        </pre>
                    </Paper>
                </AccordionDetails>
            </Accordion>
        )}

        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Model Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Composer Model
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        The model used to generate agent code when you click "Regenerate Code".
                    </Typography>
                    {agent.composerModelConfig ? (
                        <Chip 
                            label={`${agent.composerModelConfig.provider}/${agent.composerModelConfig.model}`} 
                            color="primary" 
                            sx={{ mr: 1, mt: 1 }}
                            onDelete={() => setAgent(prev => ({ ...prev, composerModelConfig: null }))}
                        />
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
                            No composer model configured. Will use first invokable model.
                        </Typography>
                    )}
                    <Button 
                        size="small" 
                        startIcon={<EditIcon />} 
                        onClick={() => openModelDialog('composer')}
                        sx={{ ml: 1, mt: 1 }}
                    >
                        {agent.composerModelConfig ? 'Change' : 'Set'}
                    </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Invokable Models
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Models the agent can call at runtime via litellm.acompletion().
                    </Typography>
                    {agent.invokableModels && agent.invokableModels.length > 0 ? (
                        <Box sx={{ mt: 1 }}>
                            {agent.invokableModels.map((m, idx) => (
                                <Chip 
                                    key={idx}
                                    label={`${m.provider}/${m.model}`} 
                                    sx={{ mr: 1, mb: 1 }}
                                    onDelete={() => handleRemoveInvokableModel(idx)}
                                />
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
                            No invokable models configured.
                        </Typography>
                    )}
                    <Button 
                        size="small" 
                        startIcon={<AddIcon />} 
                        onClick={() => openModelDialog('invokable')}
                        sx={{ mt: 1 }}
                    >
                        Add Model
                    </Button>
                </Box>
            </AccordionDetails>
        </Accordion>
        
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Agent Code</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <CodeEditor code={agent.code} onCodeChange={(newCode) => handleFieldChange('code', newCode)} isReadOnly={false}/>
            </AccordionDetails>
        </Accordion>

        {!isCreationFlow && deployment && deployment.is_deployed && (
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Deployments</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography variant="subtitle1" gutterBottom>Internal REST Endpoint</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', fontFamily: 'monospace' }}>
                        <Typography component="div" gutterBottom>
                            <Chip label="POST" color="success" size="small" sx={{ mr: 1 }} />
                            <Typography component="span" sx={{ fontWeight: 'bold' }}>{`/rest/${deployment.friendly_name}`}</Typography>
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>Request Body:</Typography>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, padding: '8px', backgroundColor: '#2e2e2e', color: '#dddddd', borderRadius: '4px' }}>
                            {JSON.stringify(agent.inputSchema, null, 2)}
                        </pre>
                        <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>Success Response (200 OK):</Typography>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, padding: '8px', backgroundColor: '#2e2e2e', color: '#dddddd', borderRadius: '4px' }}>
                            {JSON.stringify(agent.outputSchema, null, 2)}
                        </pre>
                    </Paper>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={isUndeploying ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                        onClick={handleUndeploy}
                        disabled={isUndeploying}
                        sx={{ mt: 2 }}
                    >
                        {isUndeploying ? 'Undeploying...' : 'Undeploy'}
                    </Button>
                </AccordionDetails>
            </Accordion>
        )}

        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{mt: 3}}>
            {!isCreationFlow && (
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteConfirmationOpen(true)}
                    disabled={isSaving}
                >
                    Delete Agent
                </Button>
            )}          
            <Button
                variant="outlined"
                startIcon={<PlayArrowIcon />}
                onClick={handleRunInSandbox}
            >
                Run in Sandbox
            </Button>
            
            <Button
                variant="outlined"
                color="secondary"
                startIcon={<PublishIcon />}
                onClick={handleDeploy}
                disabled={isCreationFlow && !agentFlowContext.friendlyName} // Disable if not saved
                title={isCreationFlow && !agentFlowContext.friendlyName ? "Please save your agent before deploying" : ""}
            >
                Deploy Agent
            </Button>
            {isCreationFlow && (
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={() => navigate('/create-agent/save')}
                >
                    Save Agent
                </Button>
            )}
            {!isCreationFlow && (
                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={isRegenerating ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                    onClick={openRegenerateDialog}
                    disabled={isRegenerating || isSaving}
                >
                    {isRegenerating ? 'Regenerating...' : 'Regenerate Code'}
                </Button>
            )}
            {!isCreationFlow && (
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleUpdateAgent}
                    disabled={isSaving || isRegenerating}
                >
                    {isSaving ? 'Updating...' : 'Update Agent'}
                </Button>
            )}
        </Stack>

        <Dialog
            open={deleteConfirmationOpen}
            onClose={() => setDeleteConfirmationOpen(false)}
        >
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to permanently delete the agent "{agent?.name}"? This action cannot be undone.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteConfirmationOpen(false)}>Cancel</Button>
                <Button onClick={handleDeleteAgent} color="error" variant="contained">
                    Delete
                </Button>
            </DialogActions>
        </Dialog> 
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
                            const model = modelParts.join('/'); // Handle models with / in name
                            // Check if it's the stored composer config
                            if (agent?.composerModelConfig && 
                                agent.composerModelConfig.provider === provider && 
                                agent.composerModelConfig.model === model) {
                                setSelectedComposerModel(agent.composerModelConfig);
                            } else {
                                // Find from invokable models
                                const selected = agent?.invokableModels?.find(m => m.provider === provider && m.model === model);
                                if (selected) {
                                    setSelectedComposerModel(selected);
                                } else {
                                    setSelectedComposerModel({ provider, model, parameters: {} });
                                }
                            }
                        }}
                    >
                        {agent?.composerModelConfig && (
                            <MenuItem value={`${agent.composerModelConfig.provider}/${agent.composerModelConfig.model}`}>
                                {agent.composerModelConfig.provider}/{agent.composerModelConfig.model} (stored composer)
                            </MenuItem>
                        )}
                        {agent?.invokableModels?.filter(m => 
                            !agent?.composerModelConfig || 
                            m.provider !== agent.composerModelConfig.provider || 
                            m.model !== agent.composerModelConfig.model
                        ).map((m, idx) => (
                            <MenuItem key={idx} value={`${m.provider}/${m.model}`}>
                                {m.provider}/{m.model}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {(!agent?.invokableModels?.length && !agent?.composerModelConfig) && (
                    <Alert severity="warning" sx={{ mt: 2 }}>No models configured for this agent. Please add a model first.</Alert>
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

        {/* Model Selection Dialog */}
        <Dialog
            open={modelDialogOpen}
            onClose={() => setModelDialogOpen(false)}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                {modelDialogMode === 'composer' ? 'Set Composer Model' : 'Add Invokable Model'}
            </DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    {modelDialogMode === 'composer' 
                        ? 'Select the model to use for code generation.'
                        : 'Select a model the agent can call at runtime.'}
                </DialogContentText>
                {loadingProviders ? (
                    <CircularProgress />
                ) : Object.keys(providers).length === 0 ? (
                    <Alert severity="warning">No providers available. Check your API keys.</Alert>
                ) : (
                    <>
                        <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
                            <InputLabel>Provider</InputLabel>
                            <Select
                                value={dialogProvider}
                                label="Provider"
                                onChange={(e) => handleProviderChange(e.target.value)}
                            >
                                {Object.keys(providers).map(p => (
                                    <MenuItem key={p} value={p}>{p}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Model</InputLabel>
                            <Select
                                value={dialogModel}
                                label="Model"
                                onChange={(e) => setDialogModel(e.target.value)}
                            >
                                {Object.keys(providers[dialogProvider]?.models || {}).map(m => (
                                    <MenuItem key={m} value={m}>{m}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setModelDialogOpen(false)}>Cancel</Button>
                <Button 
                    onClick={modelDialogMode === 'composer' ? handleSetComposerModel : handleAddInvokableModel}
                    color="primary" 
                    variant="contained"
                    disabled={!dialogProvider || !dialogModel}
                >
                    {modelDialogMode === 'composer' ? 'Set Model' : 'Add Model'}
                </Button>
            </DialogActions>
        </Dialog>

        <SpecViewerModal
            open={viewingSpec.open}
            onClose={() => setViewingSpec({ open: false, name: '', content: '' })}
            specName={viewingSpec.name}
            specContent={viewingSpec.content}
        />       
    </Paper>
  );
};

export default ViewAgent;