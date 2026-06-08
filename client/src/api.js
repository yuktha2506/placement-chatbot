const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("placement_token");
}

export function setAuth({ token, user }) {
  localStorage.setItem("placement_token", token);
  localStorage.setItem("placement_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("placement_token");
  localStorage.removeItem("placement_user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("placement_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    clearAuth();
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const requestError = new Error(error.message || "Request failed.");
    requestError.status = response.status;
    throw requestError;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  createSession: () => request("/sessions", { method: "POST" }),
  listSessions: () => request("/sessions"),
  getSession: (id) => request(`/sessions/${id}`),
  renameSession: (id, title) => request(`/sessions/${id}`, { method: "PUT", body: JSON.stringify({ title }) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),
  chat: (payload) => request("/chat", { method: "POST", body: JSON.stringify(payload) })
};
