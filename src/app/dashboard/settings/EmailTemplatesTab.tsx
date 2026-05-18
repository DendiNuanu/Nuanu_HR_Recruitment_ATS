"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Mail, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  isDefault: boolean;
  createdAt: string;
}

const VARIABLE_HINTS = [
  "{{candidate_name}}", "{{position}}", "{{department}}",
  "{{salary}}", "{{start_date}}", "{{company_name}}",
  "{{interviewer_name}}", "{{interview_date}}", "{{interview_location}}",
];

export default function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", content: "", isDefault: false });

  const fetchTemplates = () => {
    setLoading(true);
    fetch("/api/offer-templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", content: "", isDefault: false });
    setIsModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({ name: t.name, content: t.content, isDefault: t.isDefault });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/offer-templates/${editingId}` : "/api/offer-templates";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editingId ? "Template updated" : "Template created");
        setIsModalOpen(false);
        fetchTemplates();
      } else {
        toast.error("Failed to save template");
      }
    } catch { toast.error("Network error"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/offer-templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } else {
      toast.error("Failed to delete");
    }
  };

  const insertVariable = (v: string) => {
    setForm((prev) => ({ ...prev, content: prev.content + v }));
  };

  const previewTemplate = templates.find((t) => t.id === previewId);

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between border-b border-nuanu-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-500" /> Email Templates
          </h2>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            Manage offer letter and email templates. Use {"{{"} variable {"}}"}  syntax for dynamic content.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2 py-2">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-nuanu-gray-200 mx-auto mb-4" />
          <p className="font-bold text-nuanu-navy">No templates yet</p>
          <p className="text-sm text-nuanu-gray-400 mt-1">Create your first email template to get started.</p>
          <button onClick={openCreate} className="btn-primary mt-4 text-sm">
            <Plus className="w-4 h-4" /> Create Template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="flex items-start gap-4 p-4 bg-nuanu-gray-50 rounded-xl border border-nuanu-gray-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-nuanu-navy text-sm">{t.name}</p>
                  {t.isDefault && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">Default</span>
                  )}
                </div>
                <p className="text-xs text-nuanu-gray-500 truncate">{t.content.slice(0, 100)}...</p>
                {t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.variables.map((v) => (
                      <span key={v} className="text-[10px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setPreviewId(t.id)}
                  className="p-1.5 text-nuanu-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => openEdit(t)}
                  className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-nuanu-gray-200 rounded-lg transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(t.id)}
                  className="p-1.5 text-nuanu-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-nuanu-navy">{editingId ? "Edit Template" : "New Template"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">Template Name *</label>
                  <input required type="text" className="input-field text-sm" placeholder="e.g. Offer Letter - Standard"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1.5">Content *</label>
                  <textarea required rows={10} className="input-field text-sm font-mono resize-y"
                    placeholder="Dear {{candidate_name}},&#10;&#10;We are pleased to offer you the position of {{position}}..."
                    value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-nuanu-gray-600 mb-2">Insert Variable:</p>
                  <div className="flex flex-wrap gap-2">
                    {VARIABLE_HINTS.map((v) => (
                      <button key={v} type="button" onClick={() => insertVariable(v)}
                        className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500" />
                  <span className="text-sm text-nuanu-gray-700">Set as default template</span>
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-sm py-2 px-5">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-5 flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {editingId ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPreviewId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-nuanu-navy">Preview: {previewTemplate.name}</h3>
                <button onClick={() => setPreviewId(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <pre className="text-sm text-nuanu-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {previewTemplate.content}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
