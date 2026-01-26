"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Settings, Download, Trash2, Info, Sparkles } from "lucide-react";

export default function SettingsPage() {
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

        {/* OCR Settings */}
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

        {/* Data Management */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <Download className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Data</h2>
            </div>

            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4" />
                Eksporter alle data (CSV)
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

            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <p>Kostnadsknuser v1.0.0</p>
              <p>Bygget med Next.js, Supabase og Tailwind CSS</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
