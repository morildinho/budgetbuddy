"use client";

export const dynamic = 'force-dynamic';

import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Settings, Download, Trash2, Info, Sparkles, Loader2, HelpCircle } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const { user, loading: userLoading, isAdmin } = useUser();
  const [exporting, setExporting] = useState(false);

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

      receipts?.forEach((receipt: any) => {
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

        {/* App Info */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Om</h2>
            </div>

            <div className="space-y-3 text-sm text-[var(--text-muted)]">
              <p>Kostnadsknuser v1.0.0</p>
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
    </div>
  );
}
