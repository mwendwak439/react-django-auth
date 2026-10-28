import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();

  // On mount, ask Django "who am I?".
  // - 200 → logged in, use the returned user
  // - 403 → not logged in, kick them back to /login
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/me/");
        if (!cancelled) setUser(res.data);
      } catch (err) {
        if (cancelled) return;
        if (err.response && err.response.status === 403) {
          navigate("/login", { replace: true });
        } else {
          setError("Could not load your profile. Is the backend running?");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.post("/logout/");
    } catch (err) {
      // Even if logout fails, we still send the user to /login.
      console.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-card">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-page">
        <div className="dash-card error">{error}</div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="dash-card">
        <h1>Welcome, {user.username}</h1>
        <p className="email">{user.email}</p>
        <p className="meta">User ID: {user.id}</p>
        <button onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </div>
    </div>
  );
}