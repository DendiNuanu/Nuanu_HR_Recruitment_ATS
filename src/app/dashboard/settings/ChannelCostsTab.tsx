"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = [
  { key: "jobstreet", label: "Jobstreet" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "referral", label: "Employee Referral" },
  { key: "loker_bali", label: "Loker Bali" },
  { key: "instagram", label: "Instagram" },
  { key: "walk_in", label: "Walk-in" },
  { key: "other", label: "Other" },
];

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function ChannelCostsTab() {
  const year = new Date().getFullYear();
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/channel-costs?year=${year}`)
      .then((r) => r.json())
      .then((data: { channel: string; cost: number }[]) => {
        const map: Record<string, string> = {};
        for (const d of data) map[d.channel] = String(d.cost);
        setCosts(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        CHANNELS.map(({ key }) =>
          fetch("/api/channel-costs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: key, cost: Number(costs[key] ?? 0), year }),
          })
        )
      );
      toast.success("Channel costs saved successfully!");
    } catch {
      toast.error("Failed to save channel costs");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between border-b border-nuanu-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" /> Channel Cost Management
          </h2>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            Set recruitment costs per channel for {year}. Used in analytics cost-per-hire calculations.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm flex items-center gap-2 py-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Costs
        </button>
      </div>

      <div className="space-y-4">
        {CHANNELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4 p-4 bg-nuanu-gray-50 rounded-xl border border-nuanu-gray-100">
            <div className="w-40 flex-shrink-0">
              <p className="font-semibold text-nuanu-navy text-sm">{label}</p>
              <p className="text-xs text-nuanu-gray-400 mt-0.5">per year</p>
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nuanu-gray-400 text-sm font-medium">Rp</span>
              <input
                type="number"
                min="0"
                step="100000"
                value={costs[key] ?? "0"}
                onChange={(e) => setCosts((prev) => ({ ...prev, [key]: e.target.value }))}
                className="input-field !pl-10 text-sm"
                placeholder="0"
              />
            </div>
            <div className="w-40 text-right flex-shrink-0">
              <p className="text-sm font-bold text-nuanu-navy">
                {formatIDR(Number(costs[key] ?? 0))}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>Note:</strong> These costs are used to calculate Cost-per-Hire and Channel Effectiveness in the Analytics dashboard.
        Enter the total annual spend per channel in IDR.
      </div>
    </div>
  );
}
