import React from 'react';
import PropTypes from 'prop-types';
import appConfig from '../config';
import { ConfigContext } from './ConfigContextValue';

// 3. Create the provider component
export const ConfigProvider = ({ children }) => {
    const value = { config: appConfig };

    return (
        <ConfigContext.Provider value={value}>
            {children}
        </ConfigContext.Provider>
    );
};

ConfigProvider.propTypes = {
    children: PropTypes.node.isRequired,
};