import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CalendarClock } from "lucide-react";

function fmt(n, curr = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}

export default function Renewals() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/subscriptions").then((r) => {
      setSubs(r.data);
      setLoading(false);
    });
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = subs
    .map((s) => {
      const npd = new Date(s.next_payment_date);
      const days = Math.ceil((npd - today) / 86400000);
      return { ...s, days };
    })
    .sort((a, b) => a.days - b.days);

  const groups = [
    { key: "overdue", label: "Overdue", filter: (s) => s.days < 0 },
    { key: "week", label: "This week", filter: (s) => s.days >= 0 && s.days <= 7 },
    { key: "month", label: "Next 30 days", filter: (s) => s.days > 7 && s.days <= 30 },
    { key: "later", label: "Later", filter: (s) => s.days > 30 },
  ];

  return (
    <div className="space-y-6 relative z-10">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[color:var(--st-accent)] mb-2">
          $ renewals --timeline
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">Renewals.</h1>
        <p className="text-[color:var(--st-text-secondary)] mt-2 text-sm">
          Sorted by next payment date so you never miss one.
        </p>
      </header>

      {loading ? (
        <div className="text-[color:var(--st-text-secondary)] font-mono text-sm">Loading...</div>
      ) : subs.length === 0 ? (
        <div className="st-card p-10 text-center">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 text-[color:var(--st-accent)]" />
          <div className="text-[color:var(--st-text-secondary)] font-mono text-sm">
            Nothing to renew. Add subscriptions to see them here.
          </div>
        </div>
      ) : (
        <div className="space-y-8" data-testid="renewals-timeline">
          {groups.map((g) => {
            const items = sorted.filter(g.filter);
            if (items.length === 0) return null;
            return (
              <section key={g.key}>
                <h2 className="text-xs font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-3">
                  {g.label} · {items.length}
                </h2>
                <ul className="st-card divide-y divide-[color:var(--st-border)] overflow-hidden">
                  {items.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-[color:var(--st-surface-2)]/50 transition-colors"
                      data-testid={`renewal-row-${s.platform}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-[10px] font-mono font-semibold flex-shrink-0"
                          style={{ backgroundColor: s.brand_color || "#252623", color: "#111210" }}
                        >
                          {s.platform.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.platform}</div>
                          <div className="text-xs text-[color:var(--st-text-secondary)] font-mono truncate">
                            {s.tier} · {s.region}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-mono">{fmt(s.monthly_price, s.currency)}</div>
                        <div
                          className={`text-[10px] font-mono uppercase tracking-widest ${
                            s.days < 0
                              ? "text-[color:var(--st-danger)]"
                              : s.days <= 3
                              ? "text-[color:var(--st-accent-2)]"
                              : "text-[color:var(--st-text-secondary)]"
                          }`}
                        >
                          {s.next_payment_date} · {s.days < 0 ? `${Math.abs(s.days)}d late` : s.days === 0 ? "today" : `in ${s.days}d`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
