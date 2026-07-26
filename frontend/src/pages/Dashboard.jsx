import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Wallet, Tv, Users, Globe2, TrendingUp, CalendarClock, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";

function fmt(n, curr = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}

const CHART_PALETTE = ["#E06D53", "#D4A373", "#8A9A86", "#B58BC7", "#6EA8C9", "#E9B44C", "#D9534F", "#7BAE7F"];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/summary").then((r) => {
      setSummary(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!summary?.spend_breakdown) return [];
    // aggregate by platform
    const agg = {};
    summary.spend_breakdown.forEach((s) => {
      agg[s.platform] = (agg[s.platform] || 0) + Number(s.monthly_price);
    });
    return Object.entries(agg).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [summary]);

  return (
    <div className="space-y-8 relative z-10">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[color:var(--st-accent)] mb-2">
            $ hello, {user?.name?.toLowerCase()}
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Homelab dashboard.
          </h1>
          <p className="text-[color:var(--st-text-secondary)] mt-2 text-sm">
            A live view of every streaming subscription across your household.
          </p>
        </div>
        <Link
          to="/subscriptions"
          data-testid="dashboard-manage-link"
          className="st-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 self-start md:self-auto"
        >
          <Sparkles className="h-4 w-4" />
          Manage subscriptions
        </Link>
      </header>

      {loading || !summary ? (
        <div className="text-[color:var(--st-text-secondary)] font-mono text-sm" data-testid="dashboard-loading">
          Loading dashboard...
        </div>
      ) : (
        <>
          {/* Metric grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              testid="stat-monthly"
              label="Monthly spend"
              value={fmt(summary.total_monthly)}
              icon={Wallet}
              accent="var(--st-accent)"
            />
            <Stat
              testid="stat-yearly"
              label="Yearly projection"
              value={fmt(summary.total_yearly)}
              icon={TrendingUp}
              accent="var(--st-accent-2)"
            />
            <Stat
              testid="stat-subs"
              label="Active subscriptions"
              value={String(summary.total_subscriptions)}
              icon={Tv}
              accent="var(--st-accent-3)"
            />
            <Stat
              testid="stat-seats"
              label="Total seats"
              value={`${summary.total_seats} / ${summary.total_profiles} used`}
              icon={Users}
              accent="var(--st-accent)"
            />
          </section>

          {/* Chart + Upcoming */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="st-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)]">
                    breakdown
                  </div>
                  <h2 className="text-lg font-semibold">Monthly spend by platform</h2>
                </div>
                <div className="text-xs font-mono text-[color:var(--st-text-secondary)]">
                  total · {fmt(summary.total_monthly)}
                </div>
              </div>
              {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-[color:var(--st-text-secondary)] font-mono text-sm">
                  No subscriptions yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1a1b19",
                            border: "1px solid #353733",
                            borderRadius: 8,
                            fontFamily: "JetBrains Mono",
                            fontSize: 12,
                          }}
                          formatter={(v) => fmt(v)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2">
                    {chartData.map((c, i) => (
                      <li
                        key={c.name}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-[color:var(--st-border)] last:border-b-0"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
                          />
                          <span>{c.name}</span>
                        </div>
                        <span className="font-mono text-[color:var(--st-text-secondary)]">
                          {fmt(c.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="st-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock className="h-4 w-4 text-[color:var(--st-accent-2)]" />
                <h2 className="text-lg font-semibold">Upcoming renewals</h2>
              </div>
              {summary.upcoming_renewals.length === 0 ? (
                <div className="text-[color:var(--st-text-secondary)] font-mono text-sm py-6">
                  No renewals in the next 30 days.
                </div>
              ) : (
                <ul className="space-y-3" data-testid="dashboard-renewals-list">
                  {summary.upcoming_renewals.slice(0, 6).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-semibold flex-shrink-0"
                          style={{ backgroundColor: r.brand_color || "#252623", color: "#111210" }}
                        >
                          {r.platform.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm truncate">{r.platform}</div>
                          <div className="text-[11px] text-[color:var(--st-text-secondary)] font-mono">
                            {r.tier} · {r.next_payment_date}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-mono">{fmt(r.monthly_price, r.currency)}</div>
                        <div
                          className={`text-[10px] font-mono uppercase tracking-widest ${
                            r.days_until <= 3
                              ? "text-[color:var(--st-danger)]"
                              : "text-[color:var(--st-text-secondary)]"
                          }`}
                        >
                          {r.days_until <= 0 ? "due today" : `in ${r.days_until}d`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Regions */}
          <section className="st-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe2 className="h-4 w-4 text-[color:var(--st-accent-3)]" />
              <h2 className="text-lg font-semibold">Regions in use</h2>
            </div>
            {Object.keys(summary.region_counts).length === 0 ? (
              <div className="text-[color:var(--st-text-secondary)] font-mono text-sm">
                No regions tracked yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2" data-testid="dashboard-regions">
                {Object.entries(summary.region_counts).map(([r, count]) => (
                  <div
                    key={r}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--st-border)] bg-[color:var(--st-surface-2)]"
                  >
                    <span className="font-mono text-xs">{r}</span>
                    <span className="text-[10px] font-mono text-[color:var(--st-text-secondary)]">
                      × {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent, testid }) {
  return (
    <div className="st-card p-5" data-testid={testid}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)]">
          {label}
        </div>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="text-2xl font-semibold tracking-tight font-mono">{value}</div>
    </div>
  );
}
