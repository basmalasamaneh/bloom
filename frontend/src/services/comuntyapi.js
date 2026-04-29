// Frontend community API helper
// Provides fetchWithAuth that targets the community API base and attaches JWT

export const API_BASE = 'http://localhost:5000/api/community';

export async function fetchWithAuth(path, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { ...(options.headers || {}) };
  const isForm = (options.body instanceof FormData);
  if (!headers['Content-Type'] && !isForm) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { message: text }; }
  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export default { API_BASE, fetchWithAuth };
