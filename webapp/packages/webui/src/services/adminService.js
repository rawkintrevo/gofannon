// webapp/packages/webui/src/services/adminService.js
import apiClient from './apiClient';

export const listUsers = (adminPassword) =>
  apiClient.get('/admin/users', {
    headers: {
      'x-admin-password': adminPassword,
    },
  });

export const updateUser = (userId, payload, adminPassword) =>
  apiClient.put(`/admin/users/${encodeURIComponent(userId)}`, payload, {
    headers: {
      'x-admin-password': adminPassword,
    },
  });

export default {
  listUsers,
  updateUser,
};
