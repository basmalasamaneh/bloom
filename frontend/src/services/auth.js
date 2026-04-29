const AUTH_BASE = 'http://localhost:5000/api/auth';

const storeUser = (user) => {
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

const fetchMe = async (token) => {
  const res = await fetch(`${AUTH_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data?.farmer || null;
};

const send = async (path, body, options = {}) => {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
};

export const register = async ({ name, email, password, city, village }) => {
  const data = await send('/register', { name, email, password, city, village });
  if (data?.token) {
    localStorage.setItem('token', data.token);
    try {
      const user = await fetchMe(data.token);
      storeUser(user);
    } catch {
      storeUser(data?.farmer || null);
    }
  }
  return data;
};

export const login = async ({ email, password }) => {
  const data = await send('/login', { email, password });
  if (data?.token) {
    localStorage.setItem('token', data.token);
    try {
      const user = await fetchMe(data.token);
      storeUser(user);
    } catch {
      storeUser(data?.farmer || null);
    }
  }
  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getToken = () => localStorage.getItem('token');
