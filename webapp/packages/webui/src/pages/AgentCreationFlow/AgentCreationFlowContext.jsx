import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AgentCreationFlowContext } from './AgentCreationFlowContextValue';

export const AgentCreationFlowProvider = ({ children }) => {
    const [tools, setTools] = useState({}); // { "url": [] }
    const [swaggerSpecs, setSwaggerSpecs] = useState([]); // [{ name: string, content: string }]
    const [description, setDescription] = useState('');
    const [inputSchema, setInputSchema] = useState({ inputText: "string" }); 
    const [outputSchema, setOutputSchema] = useState({ outputText: "string" });
    const [generatedCode, setGeneratedCode] = useState('');
    const [friendlyName, setFriendlyName] = useState('');
    const [docstring, setDocstring] = useState('');
    const [invokableModels, setInvokableModels] = useState([]);
    const [gofannonAgents, setGofannonAgents] = useState([]); // {id, name}
    const [composerModelConfig, setComposerModelConfig] = useState(null); // { provider, model, parameters }

    // State for the composer model's built-in tool
    const [composerBuiltInTool, setComposerBuiltInTool] = useState('');    

    const value = {
        tools,
        setTools,
        swaggerSpecs,
        setSwaggerSpecs,
        description,
        setDescription,
        inputSchema,
        setInputSchema,
        outputSchema,
        setOutputSchema,
        generatedCode,
        setGeneratedCode,
        friendlyName,
        setFriendlyName,
        docstring,
        setDocstring,
        invokableModels,
        setInvokableModels,
        gofannonAgents,
        setGofannonAgents,
        composerBuiltInTool,
        setComposerBuiltInTool,
        composerModelConfig,
        setComposerModelConfig,
    };

    return (
        <AgentCreationFlowContext.Provider value={value}>
            {children}
        </AgentCreationFlowContext.Provider>
    );
};

AgentCreationFlowProvider.propTypes = {
    children: PropTypes.node.isRequired,
};