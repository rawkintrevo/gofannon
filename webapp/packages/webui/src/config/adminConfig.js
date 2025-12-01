const toBoolean = (value) => {
  if (typeof value !== 'string') return false;
  return value.trim().toLowerCase() === 'true';
};

export const ADMIN_PANEL_ENABLED = toBoolean(import.meta.env.VITE_ADMIN_PANEL_ENABLED || 'false');
export const ADMIN_PANEL_PASSWORD = import.meta.env.VITE_ADMIN_PANEL_PASSWORD || 'password';
