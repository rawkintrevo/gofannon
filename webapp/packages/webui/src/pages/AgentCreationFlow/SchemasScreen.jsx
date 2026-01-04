import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import SettingsIcon from '@mui/icons-material/Settings'; 
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useAgentFlow } from './AgentCreationFlowContext';
import chatService from '../../services/chatService'; // Re-use chatService to fetch providers
import agentService from '../../services/agentService'; // Import the new agent service
import ModelConfigDialog from '../../components/ModelConfigDialog'; // Import the new component
import SchemaEditor from '../../components/SchemaEditor';

const SchemasScreen = () => {
  const { tools,
    description, 
    swaggerSpecs,
    inputSchema, 
    setInputSchema,
    outputSchema, 
    setOutputSchema,
    setGeneratedCode, 
    setFriendlyName, 
    setDocstring, 
    invokableModels, 
    setInvokableModels,
    gofannonAgents,
    composerBuiltInTool, 
    setComposerBuiltInTool,
    setComposerModelConfig
  } = useAgentFlow();
  const navigate = useNavigate();

  // State for Model Configuration
  const [modelConfigDialogOpen, setModelConfigDialogOpen] = useState(false);
  const [providers, setProviders] = useState({});
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelParamSchema, setModelParamSchema] = useState({});
  const [currentModelParams, setCurrentModelParams] = useState({});
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providersError, setProvidersError] = useState(null);

  // State for build process
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState(null);

  
  // State for the invokable models dialog
  const [invokableModelDialogOpen, setInvokableModelDialogOpen] = useState(false);
  const [currentInvokableProvider, setCurrentInvokableProvider] = useState('');
  const [currentInvokableModel, setCurrentInvokableModel] = useState('');
  const [currentInvokableSchema, setCurrentInvokableSchema] = useState({});
  const [currentInvokableParams, setCurrentInvokableParams] = useState({});
  const [currentInvokableBuiltInTool, setCurrentInvokableBuiltInTool] = useState('');

  // Fetch providers on component mount
  useEffect(() => {
    const fetchProviders = async () => {
      setLoadingProviders(true);
      setProvidersError(null);
      try {
        const providersData = await chatService.getProviders();
        setProviders(providersData);
  
        const providerKeys = Object.keys(providersData);
        if (providerKeys.length > 0) {
          const defaultProvider = providerKeys[0];
          setSelectedProvider(defaultProvider);
  
          const models = Object.keys(providersData[defaultProvider].models);
          if (models.length > 0) {
            const defaultModel = models[0];
            setSelectedModel(defaultModel);
            const modelParams = providersData[defaultProvider].models[defaultModel].parameters;
            setModelParamSchema(modelParams);
  
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
            setCurrentModelParams(defaultParams);
          } else {
            setSelectedModel('');
            setModelParamSchema({});
            setCurrentModelParams({});
          }
        } else {
          setProvidersError('No AI providers found.');
        }
      } catch (err) {
        setProvidersError('Failed to fetch AI providers: ' + err.message);
        console.error("Error fetching providers for agent creation:", err);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, []);

  const handleBuild = async () => {
    if (!selectedProvider || !selectedModel) {
      setProvidersError('Please select a model for code generation.');
      return;
    }
    setBuildError(null);
    setIsBuilding(true);

    const agentConfig = {
      tools,
      description,
      inputSchema,
      outputSchema,
      invokableModels,
      swaggerSpecs,
      gofannonAgents: gofannonAgents.map(agent => agent.id),
      builtInTools: composerBuiltInTool ? [composerBuiltInTool] : [],
      modelConfig: {
        provider: selectedProvider,
        model: selectedModel,
        parameters: currentModelParams,
      },
    };
    
    try {
      const response = await agentService.generateCode(agentConfig);
      setGeneratedCode(response.code);
      setFriendlyName(response.friendlyName);
      setDocstring(response.docstring);
      // Save the composer model config so it can be stored with the agent
      setComposerModelConfig({
        provider: selectedProvider,
        model: selectedModel,
        parameters: currentModelParams,
        builtInTool: composerBuiltInTool || null,
      });
      navigate('/create-agent/code');
    } catch (err) {
      setBuildError(err.message || 'An unexpected error occurred while building the agent.');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleAddInvokableModel = () => {
    const newModel = {
        provider: currentInvokableProvider,
        model: currentInvokableModel,
        parameters: currentInvokableParams,
        builtInTool: currentInvokableBuiltInTool || null,
    };
    setInvokableModels(prev => [...prev, newModel]);
    setInvokableModelDialogOpen(false);
  };
  
  const handleDeleteInvokableModel = (index) => {
    setInvokableModels(invokableModels.filter((_, i) => i !== index));
  };

  const handleSaveComposerModel = () => {
    // State is already updated via props, just close the dialog
    setModelConfigDialogOpen(false);
  };

  const openAddModelDialog = () => {
    // Reset to defaults before opening
    setCurrentInvokableProvider(selectedProvider);
    setCurrentInvokableModel(selectedModel);
    // Initialize schema and params for the selected model
    const modelParams = providers[selectedProvider]?.models?.[selectedModel]?.parameters || {};
    setCurrentInvokableSchema(modelParams);
    // Only set params with non-null defaults
    // For Anthropic, skip top_p (use temperature by default) since they're mutually exclusive
    const defaultParams = {};
    Object.keys(modelParams).forEach(key => {
      if (modelParams[key].default !== null) {
        // Skip top_p for Anthropic - use temperature by default
        if (key === 'top_p' && selectedProvider === 'anthropic') {
          return;
        }
        defaultParams[key] = modelParams[key].default;
      }
    });
    setCurrentInvokableParams(defaultParams);
    setCurrentInvokableBuiltInTool('');
    setInvokableModelDialogOpen(true);
  };
  
  const isModelSelected = selectedProvider && selectedModel;

  return (
    <Paper sx={{ p: 3, maxWidth: 800, margin: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Screen 3: Define Input/Output JSON
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        You can define the JSON structures for your agent's input and output. The default schemas are provided as a starting point.
      </Typography>

      {providersError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setProvidersError(null)}>
          {providersError}
        </Alert>
      )}

      {buildError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBuildError(null)}>
          {buildError}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <SchemaEditor
            title="Input JSON Schema"
            schema={inputSchema}
            setSchema={setInputSchema}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SchemaEditor
            title="Output JSON Schema"
            schema={outputSchema}
            setSchema={setOutputSchema}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Models the Agent Can Invoke</Typography>
        <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={openAddModelDialog}
            disabled={loadingProviders || providersError}
        >
            Add Model
        </Button>
      </Box>

      {invokableModels.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No invokable models added. The agent will not be able to call other LLMs.
        </Typography>
      ) : (
        <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {invokableModels.map((model, index) => {
            const paramStr = Object.entries(model.parameters || {})
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
            const toolStr = model.builtInTool ? ` + ${model.builtInTool}` : '';
            return (
              <Chip
                key={index}
                label={`${model.provider}/${model.model}${toolStr}${paramStr ? ` (${paramStr})` : ''}`}
                onDelete={() => handleDeleteInvokableModel(index)}
                color="primary"
                variant="outlined"
              />
            );
          })}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Model for Code Generation</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loadingProviders ? (
            <CircularProgress size={20} />
          ) : isModelSelected ? (
            <Chip 
              label={`${selectedProvider}/${selectedModel}${composerBuiltInTool ? ` + ${composerBuiltInTool}` : ''}${Object.keys(currentModelParams).length > 0 ? ` (${Object.entries(currentModelParams).map(([k,v]) => `${k}: ${v}`).join(', ')})` : ''}`}
              color="secondary" 
              variant="outlined"
            />
          ) : (
            <Typography color="text.secondary">No model selected</Typography>
          )}
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setModelConfigDialogOpen(true)}
            disabled={loadingProviders || providersError}
          >
            {isModelSelected ? 'Change Model' : 'Choose Model'}
          </Button>
        </Box>
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={handleBuild}
        fullWidth
        startIcon={isBuilding ? <CircularProgress size={20} color="inherit" /> : <CodeIcon />}
        disabled={!isModelSelected || isBuilding}
      >
        {isBuilding ? 'Building...' : 'Build Agent Code'}
      </Button>

      <ModelConfigDialog
        open={invokableModelDialogOpen}
        onClose={() => setInvokableModelDialogOpen(false)}
        onSave={handleAddInvokableModel}
        title="Add an Invokable Model for the Agent"
        providers={providers}
        selectedProvider={currentInvokableProvider}
        setSelectedProvider={setCurrentInvokableProvider}
        selectedModel={currentInvokableModel}
        setSelectedModel={setCurrentInvokableModel}
        modelParamSchema={currentInvokableSchema}
        setModelParamSchema={setCurrentInvokableSchema}
        currentModelParams={currentInvokableParams}
        setCurrentModelParams={setCurrentInvokableParams}
        selectedBuiltInTool={currentInvokableBuiltInTool}
        setSelectedBuiltInTool={setCurrentInvokableBuiltInTool}
        loadingProviders={loadingProviders}
        providersError={providersError}
      />

      <ModelConfigDialog
        open={modelConfigDialogOpen}
        onClose={() => setModelConfigDialogOpen(false)}
        onSave={handleSaveComposerModel}
        title="Configure Agent Code Generation Model"
        providers={providers}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        modelParamSchema={modelParamSchema}
        setModelParamSchema={setModelParamSchema}
        currentModelParams={currentModelParams}
        setCurrentModelParams={setCurrentModelParams}
        selectedBuiltInTool={composerBuiltInTool}
        setSelectedBuiltInTool={setComposerBuiltInTool}
        loadingProviders={loadingProviders}
        providersError={providersError}
      />
    </Paper>
  );
};

export default SchemasScreen;