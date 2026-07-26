import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Tv, CalendarClock, LogOut, Signal } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/subscriptions", label: "Subscriptions", icon: Tv, testid: "nav-subscriptions" },
  { to: "/renewals", label: "Renewals", icon: CalendarClock, testid: "nav-renewals" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="App noise-overlay min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[color:var(--st-border)] bg-[color:var(--st-surface-1)]/60 backdrop-blur-xl">
        <div className="px-6 py-6 border-b border-[color:var(--st-border)]">
          <Link to="/" className="flex items-center gap-2.5" data-testid="brand-logo-link">
            <div className="h-8 w-8 rounded-lg bg-[color:var(--st-accent)] flex items-center justify-center">
              <Signal className="h-4 w-4 text-[color:var(--st-bg)]" />
            </div>
            <div>
              <div className="text-[color:var(--st-text)] font-semibold tracking-tight">StreamTrack</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)]">
                homelab · v0.1
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-[color:var(--st-surface-2)] text-[color:var(--st-text)]"
                    : "text-[color:var(--st-text-secondary)] hover:text-[color:var(--st-text)] hover:bg-[color:var(--st-surface-2)]/60"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[color:var(--st-border)]">
          <div className="px-3 py-2 rounded-lg bg-[color:var(--st-surface-2)]/60">
            <div className="text-xs text-[color:var(--st-text-secondary)] font-mono truncate">
              {user?.email}
            </div>
            <div className="text-sm text-[color:var(--st-text)] truncate">
              {user?.name}
            </div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 st-btn-secondary py-2 text-sm"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 relative z-10 overflow-x-hidden">
        {/* Mobile top nav */}
        <div className="md:hidden sticky top-0 z-20 backdrop-blur-xl bg-[color:var(--st-bg)]/80 border-b border-[color:var(--st-border)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-[color:var(--st-accent)] flex items-center justify-center">
              <Signal className="h-3.5 w-3.5 text-[color:var(--st-bg)]" />
            </div>
            <span className="font-semibold">StreamTrack</span>
          </div>
          <div className="flex gap-1">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  `p-2 rounded-md ${isActive ? "text-[color:var(--st-accent)]" : "text-[color:var(--st-text-secondary)]"}`
                }
                data-testid={`${it.testid}-mobile`}
              >
                <it.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}
