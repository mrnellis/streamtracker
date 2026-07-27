import { useEffect, useState } from "react";
import api from "@/lib/api";
import SubscriptionDialog from "@/components/SubscriptionDialog";
import { Plus, Pencil, Trash2, Users, Download } from "lucide-react";
import { toast } from "sonner";

function fmt(n, curr = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get("/subscriptions"), api.get("/platform-templates")])
      .then(([a, b]) => {
        setSubs(a.data);
        setTemplates(b.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async (data) => {
    if (editing) {
      const r = await api.put(`/subscriptions/${editing.id}`, data);
      setSubs((prev) => prev.map((s) => (s.id === editing.id ? r.data : s)));
      toast.success(`${data.platform} updated`);
    } else {
      const r = await api.post("/subscriptions", data);
      setSubs((prev) => [...prev, r.data]);
      toast.success(`${data.platform} added`);
    }
    setEditing(null);
  };

  const handleDelete = async (id) => {
    const sub = subs.find((s) => s.id === id);
    await api.delete(`/subscriptions/${id}`);
    setSubs((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    toast.success(`${sub?.platform || "Subscription"} removed`);
  };

  return (
    <div className="space-y-6 relative z-10">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[color:var(--st-accent)] mb-2">
            $ subscriptions --list
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Subscriptions.</h1>
          <p className="text-[color:var(--st-text-secondary)] mt-2 text-sm">
            {subs.length} active {subs.length === 1 ? "plan" : "plans"} tracked.
          </p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <button
            data-testid="export-csv-btn"
            onClick={async () => {
              try {
                const r = await api.get("/subscriptions/export/csv", { responseType: "blob" });
                const url = URL.createObjectURL(new Blob([r.data], { type: "text/csv" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `streamtrack-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast.success("CSV exported");
              } catch (e) {
                toast.error("Export failed");
              }
            }}
            disabled={subs.length === 0}
            className="st-btn-secondary px-4 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            data-testid="add-subscription-btn"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="st-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add subscription
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-[color:var(--st-text-secondary)] font-mono text-sm">Loading...</div>
      ) : subs.length === 0 ? (
        <EmptyState
          onAdd={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" data-testid="subscriptions-grid">
          {subs.map((s) => (
            <SubCard
              key={s.id}
              sub={s}
              onEdit={() => {
                setEditing(s);
                setDialogOpen(true);
              }}
              onDelete={() => setConfirmDeleteId(s.id)}
            />
          ))}
        </div>
      )}

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        templates={templates}
        onSave={handleSave}
      />

      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          data-testid="delete-confirm-modal"
        >
          <div className="st-card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Remove subscription?</h3>
            <p className="text-sm text-[color:var(--st-text-secondary)] mb-6">
              This will delete the plan and its profile users. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="st-btn-secondary px-4 py-2 text-sm"
                data-testid="delete-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                data-testid="delete-confirm-btn"
                className="px-4 py-2 text-sm rounded-full bg-[color:var(--st-danger)] text-[color:var(--st-text)] hover:brightness-110 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubCard({ sub, onEdit, onDelete }) {
  const daysUntil = Math.ceil(
    (new Date(sub.next_payment_date) - new Date()) / 86400000
  );
  const badgeColor =
    daysUntil <= 3
      ? "var(--st-danger)"
      : daysUntil <= 14
      ? "var(--st-accent-2)"
      : "var(--st-accent-3)";

  return (
    <div className="st-card p-5 flex flex-col" data-testid={`sub-card-${sub.platform}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center font-mono text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: sub.brand_color || "#252623", color: "#111210" }}
          >
            {sub.platform.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{sub.platform}</div>
            <div className="text-xs text-[color:var(--st-text-secondary)] font-mono truncate">
              {sub.tier}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            data-testid={`edit-sub-${sub.platform}`}
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-[color:var(--st-surface-2)] text-[color:var(--st-text-secondary)] hover:text-[color:var(--st-text)] transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            data-testid={`delete-sub-${sub.platform}`}
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-[color:var(--st-surface-2)] text-[color:var(--st-text-secondary)] hover:text-[color:var(--st-danger)] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kv label="price / mo" value={fmt(sub.monthly_price, sub.currency)} />
        <Kv label="concurrent" value={`${sub.concurrent_users}`} />
        <Kv label="region" value={sub.region} />
        <Kv label="next payment" value={sub.next_payment_date} />
      </div>

      <div className="flex-1" />

      <div className="pt-3 border-t border-[color:var(--st-border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)]">
            <Users className="h-3 w-3" /> Current users
          </div>
          <span
            className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border"
            style={{ borderColor: badgeColor, color: badgeColor }}
          >
            {daysUntil <= 0 ? "due" : `${daysUntil}d`}
          </span>
        </div>
        {sub.profile_users.length === 0 ? (
          <div className="text-xs text-[color:var(--st-text-secondary)] font-mono">
            No profile users yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sub.profile_users.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 rounded-full pl-0.5 pr-2 py-0.5 border border-[color:var(--st-border)] bg-[color:var(--st-surface-2)]"
                title={p.name}
              >
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-mono font-semibold"
                  style={{ backgroundColor: p.color || "#E06D53", color: "#111210" }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px]">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kv({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)]">
        {label}
      </div>
      <div className="text-sm font-mono">{value}</div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="st-card p-10 flex flex-col items-center text-center" data-testid="empty-state">
      <div className="h-14 w-14 rounded-2xl bg-[color:var(--st-surface-2)] flex items-center justify-center mb-4">
        <Plus className="h-6 w-6 text-[color:var(--st-accent)]" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight mb-1">No subscriptions yet.</h3>
      <p className="text-sm text-[color:var(--st-text-secondary)] mb-6 max-w-sm">
        Start by adding your first subscription. Templates for Netflix, Disney+,
        Hulu and more are ready to go.
      </p>
      <button onClick={onAdd} data-testid="empty-add-btn" className="st-btn-primary px-5 py-2.5 text-sm">
        Add your first subscription
      </button>
    </div>
  );
}
