// webapp/packages/webui/src/extensions/index.js

// Import all your extensions here
import * as echoExtension from './echo';

// Aggregate all extensions
const allExtensions = [
    echoExtension,
];

// Process and export the aggregated parts
export const extensionCards = allExtensions.flatMap(ext => ext.cards || []);
export const extensionPages = allExtensions.flatMap(ext => ext.pages || []);

// You can also export other things like reducers, middleware, etc.
// export const extensionReducers = allExtensions.reduce((acc, ext) => ({ ...acc, ...(ext.reducers || {}) }), {});
