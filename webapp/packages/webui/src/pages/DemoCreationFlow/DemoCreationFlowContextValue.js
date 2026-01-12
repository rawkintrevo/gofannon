import { createContext, useContext } from 'react';

export const DemoCreationFlowContext = createContext();

export const useDemoFlow = () => {
    const context = useContext(DemoCreationFlowContext);
    if (context === undefined) {
        throw new Error('useDemoFlow must be used within a DemoCreationFlowProvider');
    }
    return context;
};
