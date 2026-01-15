// webapp/packages/webui/src/pages/DemoCreationFlow/DemoCreationFlowContext.jsx
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { DemoCreationFlowContext } from './DemoCreationFlowContextValue';

const getSessionKey = (editId) => editId ? `demo_edit_${editId}` : 'demo_create_draft';

export const DemoCreationFlowProvider = ({ children }) => {
    const [selectedApis, setSelectedApis] = useState([]);
    const [modelConfig, setModelConfig] = useState(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [generatedCode, setGeneratedCode] = useState({ html: '', css: '', js: '' });
    const [appName, setAppName] = useState('');
    const [description, setDescription] = useState('');
    const [currentEditId, setCurrentEditId] = useState(null);

    // Load state from sessionStorage for a specific edit ID
    const loadFromSession = useCallback((editId) => {
        const key = getSessionKey(editId);
        try {
            const saved = sessionStorage.getItem(key);
            console.log(`[DemoContext] Loading from sessionStorage (${key}):`, saved ? 'found data' : 'no data');
            if (saved) {
                const parsed = JSON.parse(saved);
                console.log('[DemoContext] Parsed state:', parsed);
                setSelectedApis(parsed.selectedApis || []);
                setModelConfig(parsed.modelConfig || null);
                setUserPrompt(parsed.userPrompt || '');
                setGeneratedCode(parsed.generatedCode || { html: '', css: '', js: '' });
                setAppName(parsed.appName || '');
                setDescription(parsed.description || '');
                setCurrentEditId(editId);
                return true;
            }
        } catch (e) {
            console.warn('Failed to load demo draft from sessionStorage:', e);
            sessionStorage.removeItem(key);
        }
        return false;
    }, []);

    // Save current state to sessionStorage
    const saveToSession = useCallback(() => {
        const key = getSessionKey(currentEditId);
        const state = {
            selectedApis,
            modelConfig,
            userPrompt,
            generatedCode,
            appName,
            description,
        };
        sessionStorage.setItem(key, JSON.stringify(state));
    }, [currentEditId, selectedApis, modelConfig, userPrompt, generatedCode, appName, description]);

    // Auto-save when state changes (if we have an active session)
    useEffect(() => {
        if (currentEditId !== null || userPrompt || generatedCode.html || selectedApis.length > 0) {
            saveToSession();
        }
    }, [selectedApis, modelConfig, userPrompt, generatedCode, appName, description, saveToSession, currentEditId]);

    // Clear draft from sessionStorage
    const clearDraft = useCallback((editId) => {
        const key = getSessionKey(editId !== undefined ? editId : currentEditId);
        sessionStorage.removeItem(key);
        console.log(`[DemoContext] Cleared draft: ${key}`);
    }, [currentEditId]);

    // Reset all state (for discarding changes or starting fresh)
    const resetState = useCallback(() => {
        setSelectedApis([]);
        setModelConfig(null);
        setUserPrompt('');
        setGeneratedCode({ html: '', css: '', js: '' });
        setAppName('');
        setDescription('');
    }, []);

    // Set state from server data (when loading a demo for editing)
    const loadFromServer = useCallback((demoData, editId) => {
        console.log('[DemoContext] Loading from server for editId:', editId);
        setSelectedApis(demoData.selectedApis || []);
        setModelConfig(demoData.modelConfig || null);
        setUserPrompt(demoData.userPrompt || '');
        setGeneratedCode(demoData.generatedCode || { html: '', css: '', js: '' });
        setAppName(demoData.name || '');
        setDescription(demoData.description || '');
        setCurrentEditId(editId);
    }, []);

    const value = {
        selectedApis,
        setSelectedApis,
        modelConfig,
        setModelConfig,
        userPrompt,
        setUserPrompt,
        generatedCode,
        setGeneratedCode,
        appName,
        setAppName,
        description,
        setDescription,
        currentEditId,
        setCurrentEditId,
        loadFromSession,
        loadFromServer,
        clearDraft,
        resetState,
    };

    return (
        <DemoCreationFlowContext.Provider value={value}>
            {children}
        </DemoCreationFlowContext.Provider>
    );
};

DemoCreationFlowProvider.propTypes = {
    children: PropTypes.node.isRequired,
};