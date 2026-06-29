"use client";

export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUser } from "@/hooks/useUser";
import { useMerchantIcons } from "@/hooks/useMerchantIcons";
import {
  ImagePlus,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Store,
  Trash2,
  X,
  Pencil,
} from "lucide-react";

export default function AdminMerchantsPage() {
  const { isAdmin, loading: userLoading } = useUser();
  const { icons, loading, error, addIcon, updateIcon, deleteIcon } = useMerchantIcons();

  const [pattern, setPattern] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <ShieldAlert className="h-12 w-12 text-[var(--accent-danger)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ingen tilgang</h2>
        <p className="text-sm text-[var(--text-muted)]">Denne siden er kun for administratorer.</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const resetForm = () => {
    setPattern("");
    setName("");
    setFile(null);
    setPreview(null);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim() || !name.trim()) return;

    setSaving(true);
    setMessage(null);

    let success: boolean;
    if (editingId) {
      success = await updateIcon(editingId, pattern, name, file);
      if (success) setMessage("Ikon oppdatert");
    } else {
      success = await addIcon(pattern, name, file);
      if (success) setMessage("Ikon lagt til");
    }

    if (success) resetForm();
    setSaving(false);
  };

  const handleEdit = (icon: typeof icons[0]) => {
    setEditingId(icon.id);
    setPattern(icon.pattern);
    setName(icon.name);
    setFile(null);
    setPreview(icon.icon_url);
  };

  const handleDelete = async (icon: typeof icons[0]) => {
    if (!confirm(`Slett "${icon.name}"?`)) return;
    setMessage(null);
    const success = await deleteIcon(icon.id, icon.icon_path);
    if (success) setMessage("Ikon slettet");
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">
          Butikk-ikoner
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Last opp logoer og koble til transaksjoner
        </p>
      </div>

      {/* Status messages */}
      {(message || error) && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            error
              ? "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]"
              : "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="max-w-3xl space-y-6">
        {/* Add/Edit form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {editingId ? (
                <Pencil className="h-5 w-5 text-[var(--accent-primary)]" />
              ) : (
                <Plus className="h-5 w-5 text-[var(--accent-primary)]" />
              )}
              <h2 className="font-semibold text-[var(--text-primary)]">
                {editingId ? "Rediger ikon" : "Legg til nytt ikon"}
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Mønster (i transaksjonsbeskrivelse)"
                  placeholder="f.eks. REMA 1000"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  required
                />
                <Input
                  label="Visningsnavn"
                  placeholder="f.eks. Rema 1000"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* File upload */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Ikon (PNG, SVG, JPG — maks 200KB)
                </label>
                <div className="flex items-center gap-4">
                  {preview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt="Forhåndsvisning"
                        className="h-12 w-12 rounded-lg border border-[var(--border-primary)] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setPreview(null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--accent-danger)] p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                      <ImagePlus className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleFileChange}
                    className="text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent-primary)]/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--accent-primary)] hover:file:bg-[var(--accent-primary)]/20"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={saving || !pattern.trim() || !name.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Oppdater" : "Legg til"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Avbryt
                  </Button>
                )}
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Icon list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Ikoner ({icons.length})</h2>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
              </div>
            ) : icons.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Ingen ikoner lagt til ennå. Bruk skjemaet over for å legge til.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-primary)]">
                {icons.map((icon) => (
                  <div key={icon.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      {icon.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={icon.icon_url}
                          alt={icon.name}
                          className="h-10 w-10 rounded-lg border border-[var(--border-primary)] object-contain"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-sm font-bold text-[var(--text-muted)]">
                          ?
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{icon.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Mønster: <code className="rounded bg-[var(--bg-secondary)] px-1">{icon.pattern}</code>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(icon)}
                        className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-primary)]"
                        title="Rediger"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(icon)}
                        className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-danger)]/10 hover:text-[var(--accent-danger)]"
                        title="Slett"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
