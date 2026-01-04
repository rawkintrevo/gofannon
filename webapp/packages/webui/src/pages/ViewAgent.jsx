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
  Grid,
  Divider,
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
import CodeIcon from '@mui/icons-material/Code';
import AddIcon from '@mui/icons-material/Add';

import { useAgentFlow } from './AgentCreationFlow/AgentCreationFlowContext';
import agentService from '../services/agentService';
import chatService from '../services/chatService';
import CodeEditor from '../components/CodeEditor';
import SpecViewerModal from '../components/SpecViewerModal';
import ModelConfigDialog from '../components/ModelConfigDialog';
import SchemaEditor from '../components/SchemaEditor';

const ViewAgent = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agentFlowContext = useAgentFlow();

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
  const [dialogParamSchema, setDialogParamSchema] = useState({});
  const [dialogParams, setDialogParams] = useState({});
  const [dialogBuiltInTool, setDialogBuiltInTool] = useState('');

  const isCreationFlow = !agentId;
  const hasCode = agent?.code && agent.code.trim() !== '';

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

  // Track if initial load has been done for creation flow
  const initialLoadDone = React.useRef(false);

  const loadAgentData = useCallback(async () => {
    // For creation flow, only load from context once on initial mount
    if (isCreationFlow && initialLoadDone.current) {
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      if (isCreationFlow) {
        // In creation flow, data comes from context
        // Code may or may not exist yet
        setAgent({
          name: agentFlowContext.friendlyName || '',
          description: agentFlowContext.description,
          tools: agentFlowContext.tools,
          swaggerSpecs: agentFlowContext.swaggerSpecs,
          gofannonAgents: agentFlowContext.gofannonAgents,
          code: agentFlowContext.generatedCode || '',
          inputSchema: agentFlowContext.inputSchema,
          outputSchema: agentFlowContext.outputSchema,
          invokableModels: agentFlowContext.invokableModels,
          composerModelConfig: agentFlowContext.composerModelConfig,
          docstring: agentFlowContext.docstring,
          friendlyName: agentFlowContext.friendlyName,
        });
        initialLoadDone.current = true;

      } else {
        // In view/edit mode, fetch from API
        const data = await agentService.getAgent(agentId);
        
        if (data.gofannonAgents && data.gofannonAgents.length > 0) {
            // To display names, we need to fetch all agents and create a map.
            const allAgents = await agentService.getAgents();
            const agentMap = new Map(allAgents.map(a => [a._id, a.name]));
            data.gofannonAgents = data.gofannonAgents.map(id => ({
                id,
                name: agentMap.get(id) || id,
            }));
        }
        
        setAgent(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId, isCreationFlow]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: agentFlowContext intentionally excluded - we only load from context once on mount

  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);

  const updateContextAndNavigate = (path) => {
      // Update the context with the current agent state before navigating
      agentFlowContext.setDescription(agent.description);
      agentFlowContext.setGeneratedCode(agent.code);
      agentFlowContext.setTools(agent.tools);
      agentFlowContext.setSwaggerSpecs(agent.swaggerSpecs);
      agentFlowContext.setInputSchema(agent.inputSchema);
      agentFlowContext.setOutputSchema(agent.outputSchema);
      agentFlowContext.setInvokableModels(agent.invokableModels);
      agentFlowContext.setComposerModelConfig(agent.composerModelConfig);
      agentFlowContext.setDocstring(agent.docstring);
      agentFlowContext.setGofannonAgents(agent.gofannonAgents);
      agentFlowContext.setFriendlyName(agent.friendlyName);
      navigate(path);
  };

  const handleRunInSandbox = () => {
    if (agentId) {
      updateContextAndNavigate(`/agent/${agentId}/sandbox`);
    } else {
      updateContextAndNavigate('/create-agent/sandbox');
    }
  };

  const handleDeploy = () => {
    if (agentId) {
      navigate(`/agent/${agentId}/deploy`);
    } else {
      updateContextAndNavigate('/create-agent/deploy');
    }
  };

  const handleEditTools = () => {
    updateContextAndNavigate('/create-agent/tools');
  };

  const handleUpdateAgent = async () => {
    if (!agentId || !agent) return;
    setError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const updatePayload = {
        name: agent.name,
        description: agent.description,
        code: agent.code,
        tools: agent.tools,
        swaggerSpecs: agent.swaggerSpecs,
        gofannonAgents: agent.gofannonAgents?.map(ga => typeof ga === 'string' ? ga : ga.id),
        inputSchema: agent.inputSchema,
        outputSchema: agent.outputSchema,
        invokableModels: agent.invokableModels,
        composerModelConfig: agent.composerModelConfig,
        docstring: agent.docstring,
        friendlyName: agent.friendlyName,
      };
      await agentService.updateAgent(agentId, updatePayload);
      setSaveSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to update agent.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!agent.composerModelConfig) {
      setError('Please select a composer model before generating code.');
      return;
    }
    if (!agent.description || agent.description.trim() === '') {
      setError('Description is required to generate code.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const agentConfig = {
        tools: agent.tools || {},
        description: agent.description,
        inputSchema: agent.inputSchema,
        outputSchema: agent.outputSchema,
        invokableModels: agent.invokableModels || [],
        swaggerSpecs: agent.swaggerSpecs || [],
        gofannonAgents: (agent.gofannonAgents || []).map(ga => typeof ga === 'string' ? ga : ga.id),
        builtInTools: agent.composerModelConfig?.builtInTool ? [agent.composerModelConfig.builtInTool] : [],
        modelConfig: {
          provider: agent.composerModelConfig.provider,
          model: agent.composerModelConfig.model,
          parameters: agent.composerModelConfig.parameters || {},
        },
      };

      const response = await agentService.generateCode(agentConfig);
      
      setAgent(prev => ({
        ...prev,
        code: response.code,
        docstring: response.docstring,
        friendlyName: response.friendlyName,
        name: response.friendlyName,
      }));

      // Also update context if in creation flow
      if (isCreationFlow) {
        agentFlowContext.setGeneratedCode(response.code);
        agentFlowContext.setDocstring(response.docstring);
        agentFlowContext.setFriendlyName(response.friendlyName);
      }

      setSaveSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to generate code.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setAgent((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    // Sync to context in creation flow
    if (isCreationFlow) {
      if (field === 'description') {
        agentFlowContext.setDescription(value);
      } else if (field === 'code') {
        agentFlowContext.setGeneratedCode(value);
      }
    }
  };

  const handleViewSpec = (spec) => {
    setViewingSpec({ open: true, name: spec.name, content: spec.content });
  };

  // Model Dialog functions
  const openModelDialog = (mode) => {
    setModelDialogMode(mode);
    const defaultProvider = Object.keys(providers)[0] || '';
    setDialogProvider(defaultProvider);
    const models = Object.keys(providers[defaultProvider]?.models || {});
    const defaultModel = models[0] || '';
    setDialogModel(defaultModel);
    
    // Initialize param schema and default params
    const modelParams = providers[defaultProvider]?.models?.[defaultModel]?.parameters || {};
    setDialogParamSchema(modelParams);
    const defaultParams = {};
    Object.keys(modelParams).forEach(key => {
      if (modelParams[key].default !== null) {
        if (key === 'top_p' && defaultProvider === 'anthropic') return;
        defaultParams[key] = modelParams[key].default;
      }
    });
    setDialogParams(defaultParams);
    setDialogBuiltInTool('');
    setModelDialogOpen(true);
  };

  const handleDialogProviderChange = (newProvider) => {
    setDialogProvider(newProvider);
    const models = Object.keys(providers[newProvider]?.models || {});
    const firstModel = models[0] || '';
    setDialogModel(firstModel);
    const modelParams = providers[newProvider]?.models?.[firstModel]?.parameters || {};
    setDialogParamSchema(modelParams);
    const defaultParams = {};
    Object.keys(modelParams).forEach(key => {
      if (modelParams[key].default !== null) {
        if (key === 'top_p' && newProvider === 'anthropic') return;
        defaultParams[key] = modelParams[key].default;
      }
    });
    setDialogParams(defaultParams);
    setDialogBuiltInTool('');
  };

  const handleDialogModelChange = (newModel) => {
    setDialogModel(newModel);
    const modelParams = providers[dialogProvider]?.models?.[newModel]?.parameters || {};
    setDialogParamSchema(modelParams);
    const defaultParams = {};
    Object.keys(modelParams).forEach(key => {
      if (modelParams[key].default !== null) {
        if (key === 'top_p' && dialogProvider === 'anthropic') return;
        defaultParams[key] = modelParams[key].default;
      }
    });
    setDialogParams(defaultParams);
    setDialogBuiltInTool('');
  };

  const handleAddInvokableModel = () => {
    if (!dialogProvider || !dialogModel) return;
    const newModel = {
      provider: dialogProvider,
      model: dialogModel,
      parameters: dialogParams,
      builtInTool: dialogBuiltInTool || null,
    };
    const newInvokableModels = [...(agent.invokableModels || []), newModel];
    setAgent(prev => ({
      ...prev,
      invokableModels: newInvokableModels,
    }));
    // Sync to context in creation flow
    if (isCreationFlow) {
      agentFlowContext.setInvokableModels(newInvokableModels);
    }
    setModelDialogOpen(false);
  };

  const handleRemoveInvokableModel = (index) => {
    const newInvokableModels = agent.invokableModels.filter((_, i) => i !== index);
    setAgent(prev => ({
      ...prev,
      invokableModels: newInvokableModels,
    }));
    // Sync to context in creation flow
    if (isCreationFlow) {
      agentFlowContext.setInvokableModels(newInvokableModels);
    }
  };

  const handleSetComposerModel = () => {
    if (!dialogProvider || !dialogModel) return;
    const newComposerConfig = {
      provider: dialogProvider,
      model: dialogModel,
      parameters: dialogParams,
      builtInTool: dialogBuiltInTool || null,
    };
    setAgent(prev => ({
      ...prev,
      composerModelConfig: newComposerConfig,
    }));
    // Sync to context in creation flow
    if (isCreationFlow) {
      agentFlowContext.setComposerModelConfig(newComposerConfig);
    }
    setModelDialogOpen(false);
  };

  const handleDeleteAgent = async () => {
    if (!agentId) return;
    setDeleteConfirmationOpen(false);
    setError(null);
    setIsSaving(true);

    try {
      await agentService.deleteAgent(agentId);
      navigate('/agents', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to delete agent.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndeploy = async () => {
    if (!agentId || !deployment?.is_deployed) return;
    setIsUndeploying(true);
    setError(null);
    try {
        await agentService.undeployAgent(agentId);
        setDeployment({ is_deployed: false });
    } catch (err) {
        setError(err.message || 'Failed to undeploy agent.');
    } finally {
        setIsUndeploying(false);
    }
  };

  // Schema handlers for creation flow
  const handleInputSchemaChange = (newSchema) => {
    setAgent(prev => ({ ...prev, inputSchema: newSchema }));
    if (isCreationFlow) {
      agentFlowContext.setInputSchema(newSchema);
    }
  };

  const handleOutputSchemaChange = (newSchema) => {
    setAgent(prev => ({ ...prev, outputSchema: newSchema }));
    if (isCreationFlow) {
      agentFlowContext.setOutputSchema(newSchema);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!agent) {
    return <Alert severity="warning">No agent data found.</Alert>;
  }
  
  return (
    <Paper sx={{ p: 3, maxWidth: 900, margin: 'auto', mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
            {isCreationFlow 
              ? (hasCode ? 'Review Your Agent' : 'Configure Your Agent')
              : `Agent: ${agent.name}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isCreationFlow 
              ? (hasCode 
                  ? 'Review the generated code. You can edit the description, schemas, or models and regenerate.'
                  : 'Configure schemas and models, then generate the agent code.')
              : 'View and edit your agent configuration.'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {saveSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccess(false)}>
          {hasCode ? 'Operation completed successfully!' : 'Code generated successfully!'}
        </Alert>}

        {/* Tools & Specs Section */}
        <Accordion defaultExpanded={!hasCode}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Tools & Specs</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="subtitle1" gutterBottom>MCP Servers</Typography>
                {Object.keys(agent.tools || {}).length > 0 ? (
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
                {agent.swaggerSpecs?.length > 0 ? (
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
                
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditTools}
                  sx={{ mt: 2 }}
                >
                  Edit Tools & Specs
                </Button>
            </AccordionDetails>
        </Accordion>

        {/* Description Section */}
        <Accordion defaultExpanded={!hasCode}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Description</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <TextField 
                    fullWidth
                    multiline
                    rows={4}
                    label="Agent Description"
                    value={agent.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Describe what your agent should do..."
                />
            </AccordionDetails>
        </Accordion>

        {/* Schemas Section */}
        <Accordion defaultExpanded={!hasCode}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Input/Output Schemas</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Define the JSON structure for your agent's input and output.
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <SchemaEditor
                            title="Input Schema"
                            schema={agent.inputSchema || {}}
                            setSchema={handleInputSchemaChange}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <SchemaEditor
                            title="Output Schema"
                            schema={agent.outputSchema || {}}
                            setSchema={handleOutputSchemaChange}
                        />
                    </Grid>
                </Grid>
            </AccordionDetails>
        </Accordion>

        {/* Model Configuration Section */}
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
                        The model used to generate agent code.
                    </Typography>
                    {agent.composerModelConfig ? (
                        (() => {
                            const paramStr = Object.entries(agent.composerModelConfig.parameters || {})
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ');
                            const toolStr = agent.composerModelConfig.builtInTool ? ` + ${agent.composerModelConfig.builtInTool}` : '';
                            return (
                                <Chip 
                                    label={`${agent.composerModelConfig.provider}/${agent.composerModelConfig.model}${toolStr}${paramStr ? ` (${paramStr})` : ''}`} 
                                    color="primary" 
                                    sx={{ mr: 1, mt: 1 }}
                                    onDelete={() => setAgent(prev => ({ ...prev, composerModelConfig: null }))}
                                />
                            );
                        })()
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
                            No composer model configured.
                        </Typography>
                    )}
                    <Button 
                        size="small" 
                        startIcon={<EditIcon />} 
                        onClick={() => openModelDialog('composer')}
                        sx={{ ml: 1, mt: 1 }}
                        disabled={loadingProviders}
                    >
                        {agent.composerModelConfig ? 'Change' : 'Set Model'}
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
                            {agent.invokableModels.map((m, idx) => {
                                const paramStr = Object.entries(m.parameters || {})
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(', ');
                                const toolStr = m.builtInTool ? ` + ${m.builtInTool}` : '';
                                return (
                                    <Chip 
                                        key={idx}
                                        label={`${m.provider}/${m.model}${toolStr}${paramStr ? ` (${paramStr})` : ''}`} 
                                        sx={{ mr: 1, mb: 1 }}
                                        onDelete={() => handleRemoveInvokableModel(idx)}
                                    />
                                );
                            })}
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
                        disabled={loadingProviders}
                    >
                        Add Model
                    </Button>
                </Box>
            </AccordionDetails>
        </Accordion>

        {/* Docstring Section - only show if exists */}
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

        {/* Composer Thoughts Section - only show if exists */}
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

        {/* Agent Code Section - only show if code exists */}
        {hasCode && (
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Agent Code</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <CodeEditor code={agent.code} onCodeChange={(newCode) => handleFieldChange('code', newCode)} isReadOnly={false}/>
                </AccordionDetails>
            </Accordion>
        )}

        {/* Deployments Section - only show for existing deployed agents */}
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

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{mt: 3}} flexWrap="wrap" useFlexGap>
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

            {/* Generate/Regenerate Code Button */}
            {!hasCode ? (
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <CodeIcon />}
                    onClick={handleGenerateCode}
                    disabled={isGenerating || !agent.composerModelConfig}
                >
                    {isGenerating ? 'Generating...' : 'Generate Code'}
                </Button>
            ) : (
                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                    onClick={handleGenerateCode}
                    disabled={isGenerating || isSaving}
                >
                    {isGenerating ? 'Regenerating...' : 'Regenerate Code'}
                </Button>
            )}

            {/* Only show these when code exists */}
            {hasCode && (
                <>
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
                    >
                        Deploy Agent
                    </Button>

                    {isCreationFlow ? (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SaveIcon />}
                            onClick={() => {
                              updateContextAndNavigate('/create-agent/save');
                            }}
                        >
                            Save Agent
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            onClick={handleUpdateAgent}
                            disabled={isSaving || isGenerating}
                        >
                            {isSaving ? 'Updating...' : 'Update Agent'}
                        </Button>
                    )}
                </>
            )}
        </Stack>

        {/* Delete Confirmation Dialog */}
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

        {/* Model Config Dialog */}
        <ModelConfigDialog
            open={modelDialogOpen}
            onClose={() => setModelDialogOpen(false)}
            onSave={modelDialogMode === 'composer' ? handleSetComposerModel : handleAddInvokableModel}
            title={modelDialogMode === 'composer' ? 'Set Composer Model' : 'Add Invokable Model'}
            providers={providers}
            selectedProvider={dialogProvider}
            setSelectedProvider={handleDialogProviderChange}
            selectedModel={dialogModel}
            setSelectedModel={handleDialogModelChange}
            modelParamSchema={dialogParamSchema}
            setModelParamSchema={setDialogParamSchema}
            currentModelParams={dialogParams}
            setCurrentModelParams={setDialogParams}
            selectedBuiltInTool={dialogBuiltInTool}
            setSelectedBuiltInTool={setDialogBuiltInTool}
            loadingProviders={loadingProviders}
            providersError={null}
        />

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