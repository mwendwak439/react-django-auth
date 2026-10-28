import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Signup.css";

export default function Signup() {
  // Form state — one entry per input.
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
  });

  // UI state.
  const [errors, setErrors] = useState({});         // field-level errors from Django
  const [formError, setFormError] = useState("");   // non-field errors
  const [success, setSuccess] = useState("");       // success message
  const [loading, setLoading] = useState(false);    // disables submit while in flight

  const navigate = useNavigate();

  // Update formData for any input whose `name` matches a key.
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Client-side validation. Returns an object of errors, or {} if all good.
  function validateClient() {
    const e = {};
    if (!formData.username.trim()) e.username = "Username is required.";
    else if (formData.username.length < 3) e.username = "Username must be at least 3 characters.";
    if (!formData.email.trim()) e.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) e.email = "Email looks invalid.";
    if (!formData.password) e.password = "Password is required.";
    else if (formData.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (formData.password !== formData.password_confirm) {
      e.password_confirm = "Passwords do not match.";
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setSuccess("");

    // Run client-side validation first. Skip the network if it fails.
    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/signup/", formData);
      setSuccess(res.data.message || "Account created. You can log in now.");
      // Give the user a beat to read the message, then move to /login.
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        // Django returns {field: [errors], ...} or {detail: "..."}.
        const data = err.response.data;
        if (data.detail) {
          setFormError(data.detail);
        } else {
          setErrors(data);
        }
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
        <h1>Create account</h1>
        <p className="subtitle">Sign up to get started.</p>

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
            {errors.username && <span className="error">{formatError(errors.username)}</span>}
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
            {errors.email && <span className="error">{formatError(errors.email)}</span>}
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {errors.password && <span className="error">{formatError(errors.password)}</span>}
          </label>

          <label>
            Confirm password
            <input
              type="password"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {errors.password_confirm && (
              <span className="error">{formatError(errors.password_confirm)}</span>
            )}
          </label>

          {formError && <div className="form-error">{formError}</div>}
          {success && <div className="form-success">{success}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

// Django's 400 errors can be a string, an array, or an array of nested strings.
// This flattens any of those into a readable string.
function formatError(value) {
  if (Array.isArray(value)) return value.join(" ");
  return String(value);
}