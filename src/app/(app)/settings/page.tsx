"use client";

export const dynamic = 'force-dynamic';

import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Settings, Download, Trash2, Info, Sparkles, Loader2, HelpCircle, LogOut, Users, Link2, Copy, Check, UserX, Pencil } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useHousehold, HouseholdMember, Permissions } from "@/hooks/useHousehold";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PERMISSION_LABELS: { key: keyof Permissions; label: string }[] = [
  { key: "receipts", label: "Kvitteringer" },
  { key: "transactions", label: "Transaksjoner" },
  { key: "budget", label: "Budsjett" },
  { key: "analytics", label: "Analyse" },
  { key: "portfolio", label: "Portefølje" },
];

const defaultPermissions: Permissions = {
  overview: true,
  receipts: false,
  transactions: false,
  budget: false,
  analytics: false,
  portfolio: false,
};

type ExportReceiptRow = {
  receipt_date: string;
  merchant: string;
  total_amount: number;
  category: { name: string } | { name: string }[] | null;
  notes: string | null;
};

interface BankAccountOption {
  id: string;
  name: string;
  iban: string | null;
}

function InviteModal({
  isOpen,
  onClose,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, permissions: Permissions, allowedBankAccountIds: string[] | null) => Promise<string | null>;
}) {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<Permissions>({ ...defaultPermissions });
  const [accounts, setAccounts] = useState<BankAccountOption[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !permissions.transactions) return;

    let cancelled = false;
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const res = await fetch("/api/bank/tink/accounts");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAccounts(data.accounts || []);
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    };

    loadAccounts();
    return () => { cancelled = true; };
  }, [isOpen, permissions.transactions]);

  const handleInvite = async () => {
    setInviting(true);
    const accountIds = permissions.transactions
      ? (selectedAccountIds.length > 0 ? selectedAccountIds : null)
      : null;
    const link = await onInvite(email, permissions, accountIds);
    setInviting(false);
    if (link) setInviteLink(link);
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail("");
    setPermissions({ ...defaultPermissions });
    setSelectedAccountIds([]);
    setInviteLink(null);
    onClose();
  };

  const togglePermission = (key: keyof Permissions) => {
    if (key === "overview") return; // always on
    setPermissions((p) => {
      const next = { ...p, [key]: !p[key] };
      if (key === "transactions" && !next.transactions) {
        setSelectedAccountIds([]);
      }
      return next;
    });
  };

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((accountId) => accountId !== id) : [...prev, id]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Legg til familiemedlem">
      {!inviteLink ? (
        <div className="space-y-5">
          <Input
            label="E-post (valgfritt)"
            type="email"
            placeholder="navn@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Tillatelser</p>
            <div className="space-y-2">
              {/* Overview — always on */}
              <div className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] px-3 py-2.5">
                <span className="text-sm text-[var(--text-primary)]">Oversikt</span>
                <div className="h-5 w-9 rounded-full bg-[var(--accent-primary)] opacity-50 cursor-not-allowed relative">
                  <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
                </div>
              </div>
              {PERMISSION_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => togglePermission(key)}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--border-primary)] px-3 py-2.5 transition-colors hover:bg-[var(--bg-secondary)]"
                >
                  <span className="text-sm text-[var(--text-primary)]">{label}</span>
                  <div className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    permissions[key] ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-secondary)]"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                      permissions[key] ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {permissions.transactions && (
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Bankkontoer</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Velg hvilke eksisterende kontoer gjesten får se. Hvis ingen er valgt, deles alle kontoer.
              </p>
              <div className="mt-3 space-y-2">
                {loadingAccounts ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Laster kontoer...
                  </div>
                ) : accounts.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">Ingen bankkontoer er koblet til ennå.</p>
                ) : (
                  accounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => toggleAccount(account.id)}
                      className="flex w-full items-center justify-between rounded border border-[var(--border-primary)] px-3 py-2 text-left text-xs hover:bg-[var(--bg-card)]"
                    >
                      <span className="text-[var(--text-primary)]">
                        {account.name}{account.iban ? ` (...${account.iban.slice(-4)})` : ""}
                      </span>
                      <span className={selectedAccountIds.includes(account.id) ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"}>
                        {selectedAccountIds.includes(account.id) ? "Valgt" : "Alle hvis ingen valgt"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Avbryt</Button>
            <Button onClick={handleInvite} isLoading={inviting}>
              <Link2 className="h-4 w-4" />
              Generer lenke
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/5 p-4 text-center">
            <p className="text-sm font-medium text-[var(--accent-success)]">Invitasjonslenke opprettet!</p>
          </div>

          <div>
            <p className="mb-2 text-sm text-[var(--text-secondary)]">Del denne lenken med familiemedlemmet:</p>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
              <span className="flex-1 truncate text-xs text-[var(--text-muted)]">{inviteLink}</span>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-[var(--accent-success)]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Kopiert!" : "Kopier lenke"}
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={handleClose}>Ferdig</Button>
        </div>
      )}
    </Modal>
  );
}

export default function SettingsPage() {
  const { user, loading: userLoading, isAdmin } = useUser();
  const { household, members, loading: householdLoading, updateHouseholdName, inviteMember, revokeMember } = useHousehold();
  const [exporting, setExporting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleExportCSV = async () => {
    setExporting(true);
    const supabase = createClient();

    try {
      const { data: receipts, error } = await supabase
        .from("receipts")
        .select(`
          id,
          merchant,
          receipt_date,
          total_amount,
          category:categories(name),
          notes,
          created_at
        `)
        .order("receipt_date", { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = ["Date", "Merchant", "Amount", "Category", "Notes"];
      const csvRows = [headers.join(",")];

      receipts?.forEach((receipt: ExportReceiptRow) => {
        const category = Array.isArray(receipt.category)
          ? receipt.category[0]?.name
          : receipt.category?.name || "Ukategorisert";

        const row = [
          receipt.receipt_date,
          `"${receipt.merchant}"`,
          receipt.total_amount,
          `"${category}"`,
          `"${receipt.notes || ""}"`,
        ];
        csvRows.push(row.join(","));
      });

      // Download CSV
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `kvitteringer_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Kunne ikke eksportere data");
    } finally {
      setExporting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }
  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">Innstillinger</h1>
        <p className="text-sm text-[var(--text-muted)]">Tilpass opplevelsen din</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Preferences */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <Settings className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Preferanser</h2>
            </div>

            <div className="space-y-4">
              <Select
                label="Standard kategori"
                options={[
                  { value: "groceries", label: "Dagligvarer" },
                  { value: "household", label: "Husholdning" },
                  { value: "personal", label: "Personlig pleie" },
                  { value: "other", label: "Annet" },
                ]}
                defaultValue="groceries"
              />

              <Select
                label="Valuta"
                options={[
                  { value: "NOK", label: "Norske kroner (NOK)" },
                  { value: "EUR", label: "Euro (EUR)" },
                  { value: "USD", label: "Amerikanske dollar (USD)" },
                ]}
                defaultValue="NOK"
              />

              <Select
                label="Datoformat"
                options={[
                  { value: "dd.mm.yyyy", label: "DD.MM.ÅÅÅÅ" },
                  { value: "yyyy-mm-dd", label: "ÅÅÅÅ-MM-DD" },
                  { value: "mm/dd/yyyy", label: "MM/DD/ÅÅÅÅ" },
                ]}
                defaultValue="dd.mm.yyyy"
              />
            </div>
          </CardBody>
        </Card>

        {/* OCR Settings - Admin only */}
        {isAdmin && (
          <Card>
            <CardBody className="p-6">
              <div className="mb-6 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">OCR-innstillinger</h2>
              </div>

              <div className="space-y-4">
                <Select
                  label="OCR-metode"
                  options={[
                    { value: "auto", label: "Automatisk (anbefalt)" },
                    { value: "gpt4", label: "GPT-4 Vision (best nøyaktighet)" },
                    { value: "tesseract", label: "Tesseract (gratis, offline)" },
                  ]}
                  defaultValue="auto"
                />
                <p className="text-xs text-[var(--text-muted)]">
                  GPT-4 Vision gir best nøyaktighet, men koster ca. 0,20 kr per kvittering.
                  Tesseract er gratis, men mindre nøyaktig.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Data Management */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <Download className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Data</h2>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportCSV}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exporting ? "Eksporterer..." : "Eksporter alle data (CSV)"}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Familie & deling */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Familie &amp; deling</h2>
              </div>
              <Button size="sm" onClick={() => setShowInviteModal(true)}>
                <Users className="h-4 w-4" />
                Legg til familiemedlem
              </Button>
            </div>

            {householdLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Household name */}
                <div className="flex items-center gap-2">
                  {editingName ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={householdName}
                        onChange={(e) => setHouseholdName(e.target.value)}
                        placeholder="Min familie"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (householdName.trim()) {
                            await updateHouseholdName(householdName.trim());
                          }
                          setEditingName(false);
                        }}
                      >
                        Lagre
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingName(false)}>
                        Avbryt
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-[var(--text-secondary)]">
                        Hustandsnavn: <span className="font-medium text-[var(--text-primary)]">{household?.name || "Ikke opprettet"}</span>
                      </span>
                      <button
                        onClick={() => {
                          setHouseholdName(household?.name || "Min familie");
                          setEditingName(true);
                        }}
                        className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Members list */}
                {members.filter(m => m.invite_status !== "revoked").length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Ingen familiemedlemmer enda. Inviter noen!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {members
                      .filter((m) => m.invite_status !== "revoked")
                      .map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] px-4 py-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {member.invite_email || "Ukjent"}
                              </span>
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-xs",
                                member.invite_status === "accepted"
                                  ? "bg-[var(--accent-success)]/15 text-[var(--accent-success)]"
                                  : "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)]"
                              )}>
                                {member.invite_status === "accepted" ? "Aktiv" : "Venter"}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {["overview", "receipts", "transactions", "budget", "analytics", "portfolio"]
                                .filter((k) => member[`can_view_${k}` as keyof HouseholdMember])
                                .map((k) => (
                                  <span key={k} className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                                    {k === "overview" ? "Oversikt"
                                      : k === "receipts" ? "Kvitteringer"
                                      : k === "transactions" ? "Transaksjoner"
                                      : k === "budget" ? "Budsjett"
                                      : k === "analytics" ? "Analyse"
                                      : "Portefølje"}
                                  </span>
                                ))
                              }
                            </div>
                          </div>
                          <button
                            onClick={() => revokeMember(member.id)}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-danger)]/10 hover:text-[var(--accent-danger)]"
                            title="Fjern tilgang"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Danger Zone */}
        <Card className="border-[var(--accent-danger)]/30">
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-[var(--accent-danger)]" />
              <h2 className="font-semibold text-[var(--accent-danger)]">Faresone</h2>
            </div>

            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Slett permanent alle kvitteringer og data. Denne handlingen kan ikke
              angres.
            </p>

            <Button variant="danger">Slett alle data</Button>
          </CardBody>
        </Card>

        {/* Logout */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <LogOut className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Konto</h2>
            </div>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Logget inn som {user?.email}
            </p>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logg ut
            </Button>
          </CardBody>
        </Card>

        {/* App Info */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Om</h2>
            </div>

            <div className="space-y-3 text-sm text-[var(--text-muted)]">
              <p>Budgetbuddy v1.0.0</p>
              {isAdmin && <p>Bygget med Next.js, Supabase og Tailwind CSS</p>}

              <Link
                href="/help"
                className="flex items-center gap-2 text-[var(--accent-primary)] transition-colors hover:text-[var(--accent-primary)]/80"
              >
                <HelpCircle className="h-4 w-4" />
                Hjelp & FAQ
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={async (email, permissions, allowedBankAccountIds) => {
          const result = await inviteMember({
            email: email || undefined,
            permissions,
            allowedBankAccountIds,
          });
          return result?.inviteLink ?? null;
        }}
      />
    </div>
  );
}
