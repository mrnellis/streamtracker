import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

const REGIONS = [
  "US", "CA", "MX", "UK", "IE", "FR", "DE", "ES", "IT", "NL", "SE", "NO", "DK", "FI",
  "AU", "NZ", "JP", "KR", "IN", "BR", "AR", "ZA", "AE", "SG",
];

function uid() { return Math.random().toString(36).slice(2, 10); }

const AVATAR_COLORS = ["#E06D53", "#D4A373", "#8A9A86", "#B58BC7", "#6EA8C9", "#E9B44C"];

export default function SubscriptionDialog({ open, onOpenChange, initial, onSave, templates = [] }) {
  const [form, setForm] = useState(
    initial || {
      platform: "",
      tier: "",
      monthly_price: 0,
      currency: "USD",
      concurrent_users: 1,
      region: "US",
      next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      profile_users: [],
      notes: "",
      brand_color: "#E06D53",
    }
  );
  const [newUserName, setNewUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const applyTemplate = (idx) => {
    if (idx === "" || idx == null) return;
    const t = templates[Number(idx)];
    if (!t) return;
    setForm((f) => ({
      ...f,
      platform: t.platform,
      tier: t.tier,
      monthly_price: t.monthly_price,
      concurrent_users: t.concurrent_users,
      brand_color: t.brand_color,
    }));
  };

  const addProfile = () => {
    if (!newUserName.trim()) return;
    const color = AVATAR_COLORS[form.profile_users.length % AVATAR_COLORS.length];
    setForm((f) => ({
      ...f,
      profile_users: [...f.profile_users, { id: uid(), name: newUserName.trim(), color }],
    }));
    setNewUserName("");
  };

  const removeProfile = (id) => {
    setForm((f) => ({ ...f, profile_users: f.profile_users.filter((p) => p.id !== id) }));
  };

  const submit = async () => {
    setError("");
    if (!form.platform.trim() || !form.tier.trim()) {
      setError("Platform and Tier are required.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        monthly_price: Number(form.monthly_price) || 0,
        concurrent_users: Number(form.concurrent_users) || 1,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="subscription-dialog"
        className="bg-[color:var(--st-surface-1)] border-[color:var(--st-border)] text-[color:var(--st-text)] max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {initial ? "Edit subscription" : "Add subscription"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {!initial && templates.length > 0 && (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-2">
                Quick template
              </label>
              <select
                data-testid="template-select"
                onChange={(e) => applyTemplate(e.target.value)}
                className="st-input rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="">— choose a preset —</option>
                {templates.map((t, i) => (
                  <option key={i} value={i}>
                    {t.platform} — {t.tier} (${t.monthly_price})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Platform">
              <input
                data-testid="form-platform"
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
                className="st-input rounded-lg px-3 py-2 text-sm w-full"
              />
            </Field>
            <Field label="Tier / Level">
              <input
                data-testid="form-tier"
                value={form.tier}
                onChange={(e) => set("tier", e.target.value)}
                className="st-input rounded-lg px-3 py-2 text-sm w-full"
              />
            </Field>
            <Field label="Monthly price">
              <input
                data-testid="form-price"
                type="number"
                step="0.01"
                min="0"
                value={form.monthly_price}
                onChange={(e) => set("monthly_price", e.target.value)}
                className="st-input rounded-lg px-3 py-2 text-sm w-full font-mono"
              />
            </Field>
            <Field label="Currency">
              <input
                data-testid="form-currency"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase().slice(0, 3))}
                className="st-input rounded-lg px-3 py-2 text-sm w-full font-mono"
              />
            </Field>
            <Field label="Concurrent users">
              <input
                data-testid="form-concurrent"
                type="number"
                min="1"
                value={form.concurrent_users}
                onChange={(e) => set("concurrent_users", e.target.value)}
                className="st-input rounded-lg px-3 py-2 text-sm w-full font-mono"
              />
            </Field>
            <Field label="Region (geocode)">
              <select
                data-testid="form-region"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                className="st-input rounded-lg px-3 py-2 text-sm w-full font-mono"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Next payment date">
              <input
                data-testid="form-next-payment"
                type="date"
                value={form.next_payment_date}
                onChange={(e) => set("next_payment_date", e.target.value)}
                className="st-input rounded-lg px-3 py-2 text-sm w-full font-mono"
              />
            </Field>
            <Field label="Brand color">
              <div className="flex items-center gap-2">
                <input
                  data-testid="form-brand-color"
                  type="color"
                  value={form.brand_color || "#E06D53"}
                  onChange={(e) => set("brand_color", e.target.value)}
                  className="h-10 w-16 rounded-lg bg-transparent border border-[color:var(--st-border)] cursor-pointer"
                />
                <input
                  value={form.brand_color || ""}
                  onChange={(e) => set("brand_color", e.target.value)}
                  className="st-input rounded-lg px-3 py-2 text-sm flex-1 font-mono"
                />
              </div>
            </Field>
          </div>

          {/* Profile Users */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-2">
              Current users on this plan
            </label>
            <div className="flex gap-2 mb-3">
              <input
                data-testid="form-profile-name-input"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProfile())}
                placeholder="e.g. Alice"
                className="st-input rounded-lg px-3 py-2 text-sm flex-1"
              />
              <button
                type="button"
                data-testid="form-add-profile-btn"
                onClick={addProfile}
                className="st-btn-secondary px-4 py-2 text-sm flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {form.profile_users.length === 0 ? (
              <div className="text-xs text-[color:var(--st-text-secondary)] font-mono">
                No profile users yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {form.profile_users.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border border-[color:var(--st-border)] bg-[color:var(--st-surface-2)]"
                  >
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold"
                      style={{ backgroundColor: p.color, color: "#111210" }}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => removeProfile(p.id)}
                      data-testid={`form-remove-profile-${p.name}`}
                      className="text-[color:var(--st-text-secondary)] hover:text-[color:var(--st-danger)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Notes">
            <textarea
              data-testid="form-notes"
              rows={2}
              value={form.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              className="st-input rounded-lg px-3 py-2 text-sm w-full"
            />
          </Field>

          {error && (
            <div data-testid="form-error" className="text-sm text-[color:var(--st-danger)] font-mono">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <button
            data-testid="form-cancel-btn"
            onClick={() => onOpenChange(false)}
            className="st-btn-secondary px-5 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            data-testid="form-save-btn"
            onClick={submit}
            disabled={saving}
            className="st-btn-primary px-5 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : initial ? "Save changes" : "Add subscription"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-widest text-[color:var(--st-text-secondary)] mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
