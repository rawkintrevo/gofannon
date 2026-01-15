import { createContext, useContext } from 'react';

export const AgentCreationFlowContext = createContext();

export const useAgentFlow = () => {
    const context = useContext(AgentCreationFlowContext);
    if (context === undefined) {
        throw new Error('useAgentFlow must be used within an AgentCreationFlowProvider');
    }
    return context;
};
