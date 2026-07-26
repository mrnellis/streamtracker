import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Signal, Loader2 } from "lucide-react";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await register(email, password, name);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center noise-overlay px-6">
      <div className="w-full max-w-sm relative z-10">
        <Link to="/login" className="flex items-center gap-2.5 mb-8" data-testid="register-brand-link">
          <div className="h-8 w-8 rounded-lg bg-[color:var(--st-accent)] flex items-center justify-center">
            <Signal className="h-4 w-4 text-[color:var(--st-bg)]" />
          </div>
          <div className="font-semibold tracking-tight">StreamTrack</div>
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight mb-2">Create account.</h1>
        <p className="text-[color:var(--st-text-secondary)] mb-8 text-sm">
          Set up a fresh homelab account.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-2">
              Name
            </label>
            <input
              data-testid="register-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="st-input w-full rounded-lg px-4 py-3 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-2">
              Email
            </label>
            <input
              data-testid="register-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="st-input w-full rounded-lg px-4 py-3 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-2">
              Password
            </label>
            <input
              data-testid="register-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="st-input w-full rounded-lg px-4 py-3 text-sm"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div data-testid="register-error" className="text-sm text-[color:var(--st-danger)] font-mono">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="register-submit-btn"
            className="st-btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </button>

          <p className="text-sm text-[color:var(--st-text-secondary)] pt-2">
            Already have an account?{" "}
            <Link
              to="/login"
              data-testid="register-login-link"
              className="text-[color:var(--st-accent)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
