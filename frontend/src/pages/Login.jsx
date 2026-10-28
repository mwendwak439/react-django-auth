import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function validateClient() {
    const e = {};
    if (!formData.username.trim()) e.username = "Username is required.";
    if (!formData.password) e.password = "Password is required.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError("");

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/login/", formData);
      // res.data.user is available if you want it, but we don't store it —
      // the session cookie is what keeps us logged in.
      console.log("Logged in as:", res.data.user.username);
      navigate("/dashboard");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        const data = err.response.data;
        setFormError(data.detail || data.non_field_errors?.join(" ") || "Invalid credentials.");
      } else {
        setFormError("Network error. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtitle">Log in to continue.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Username
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </label>

          {formError && <div className="form-error">{formError}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}