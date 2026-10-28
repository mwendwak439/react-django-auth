/**
 * Axios client for talking to the Django backend.
 *
 * Why axios over fetch:
 *   - Interceptors run on every request (we use this for CSRF)
 *   - Automatic JSON parsing
 *   - withCredentials option for cookies (needed for sessions)
 *
 * Why the CSRF interceptor:
 *   Django requires an X-CSRFToken header on every POST/PUT/PATCH/DELETE.
 *   The token lives in a cookie called `csrftoken`. This interceptor
 *   reads it from document.cookie on each request and copies it into
 *   the header. Since it reads the cookie every time, it automatically
 *   picks up the new token after login (Django rotates it on login).
 */

import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  withCredentials: true, // send cookies (sessionid, csrftoken) cross-origin
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Read the csrftoken cookie.
 * document.cookie is "key1=val1; key2=val2; ..." — this extracts the
 * value for `csrftoken`, or returns null if it isn't set yet.
 */
function getCsrfToken() {
  const match = document.cookie.match(/(^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}

// Attach the CSRF token to every non-GET request.
api.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers["X-CSRFToken"] = token;
    }
  }
  return config;
});

export default api;