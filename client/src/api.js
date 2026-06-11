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
  
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    if (!response.ok) {
      let errorMessage = "Request failed.";
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      const requestError = new Error(errorMessage);
      requestError.status = response.status;
      throw requestError;
    }

    if (response.status === 204) return null;
    
    try {
      return await response.json();
    } catch {
      throw new Error("Invalid response from server");
    }
  } catch (error) {
    // If it's already a custom error, rethrow it
    if (error.status) throw error;
    // If it's a fetch error (network issue), provide better message
    if (error instanceof TypeError) {
      throw new Error("Failed to connect to server. Make sure the server is running.");
    }
    throw error;
  }
}

async function requestBlob(path, options = {}) {
  const token = getToken();

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    if (!response.ok) {
      let errorMessage = "Request failed.";
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      const requestError = new Error(errorMessage);
      requestError.status = response.status;
      throw requestError;
    }

    return await response.blob();
  } catch (error) {
    if (error.status) throw error;
    if (error instanceof TypeError) {
      throw new Error("Failed to connect to server. Make sure the server is running.");
    }
    throw error;
  }
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  analyzeResume: (payload) => request("/resume/analyze", { method: "POST", body: JSON.stringify(payload) }),
  generateResume: (payload) => requestBlob("/resume/generate", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } }),
  createSession: () => request("/sessions", { method: "POST" }),
  listSessions: () => request("/sessions"),
  getSession: (id) => request(`/sessions/${id}`),
  renameSession: (id, title) => request(`/sessions/${id}`, { method: "PUT", body: JSON.stringify({ title }) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),
  chat: (payload) => request("/chat", { method: "POST", body: JSON.stringify(payload) })
};
