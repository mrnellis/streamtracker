import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Signal, Loader2 } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 noise-overlay">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-16 relative z-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2.5 mb-10" data-testid="login-brand-link">
            <div className="h-8 w-8 rounded-lg bg-[color:var(--st-accent)] flex items-center justify-center">
              <Signal className="h-4 w-4 text-[color:var(--st-bg)]" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">StreamTrack</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)]">
                homelab
              </div>
            </div>
          </Link>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-2">
            Sign in.
          </h1>
          <p className="text-[color:var(--st-text-secondary)] mb-8 text-sm">
            Track every subscription running on your home network.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-2">
                Email
              </label>
              <input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="st-input w-full rounded-lg px-4 py-3 text-sm"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-2">
                Password
              </label>
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="st-input w-full rounded-lg px-4 py-3 text-sm"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div
                data-testid="login-error"
                className="text-sm text-[color:var(--st-danger)] font-mono"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="st-btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>

            <p className="text-sm text-[color:var(--st-text-secondary)] pt-2">
              No account yet?{" "}
              <Link
                to="/register"
                data-testid="login-register-link"
                className="text-[color:var(--st-accent)] hover:underline"
              >
                Create one
              </Link>
            </p>
          </form>

          <div className="mt-8 pt-4 border-t border-[color:var(--st-border)]">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-1">
              default admin
            </div>
            <div className="text-xs font-mono text-[color:var(--st-text-secondary)]">
              admin@example.com · admin123
            </div>
          </div>
        </div>
      </div>

      {/* Right: aesthetic pattern */}
      <div className="hidden md:flex relative overflow-hidden items-center justify-center bg-[color:var(--st-surface-1)] border-l border-[color:var(--st-border)]">
        <div className="absolute inset-0 opacity-40"
             style={{
               backgroundImage:
                 "linear-gradient(rgba(224,109,83,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(224,109,83,0.08) 1px, transparent 1px)",
               backgroundSize: "48px 48px",
             }}
        />
        <div className="relative z-10 max-w-md px-10 space-y-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[color:var(--st-accent)]">
            $ streamtrack --status
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-[color:var(--st-text)]">
            Every stream. Every seat. Every renewal.
          </h2>
          <div className="space-y-3 font-mono text-xs text-[color:var(--st-text-secondary)]">
            <div>› tracks monthly price + tier</div>
            <div>› concurrent user counts</div>
            <div>› geocode / region tagging</div>
            <div>› next payment reminders</div>
            <div>› profile users per plan</div>
          </div>
          <div className="pt-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[color:var(--st-accent-3)] animate-pulse" />
            <span className="text-xs font-mono text-[color:var(--st-text-secondary)]">
              backend online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
