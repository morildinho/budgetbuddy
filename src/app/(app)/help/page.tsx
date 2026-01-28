"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { HelpCircle, History, Receipt, Wallet, PieChart, Settings, Sparkles } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="min-h-screen p-4 lg:p-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">
          Hjelp & Endringslogg
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Slik bruker du appen og hva som er nytt
        </p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Ofte stilte spørsmål
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* Question 1 */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Receipt className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Hvordan legger jeg til en kvittering?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Trykk på "+" knappen i navigasjonslinjen nederst på skjermen. Du kan enten ta bilde
                  av kvitteringen (bildet blir automatisk analysert med AI), eller legge inn detaljene
                  manuelt. Systemet vil automatisk foreslå kategori basert på butikk og varer.
                </p>
              </div>

              {/* Question 2 */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Hvordan fungerer kvitteringsskanningen?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Appen bruker GPT-4 Vision for å analysere kvitteringsbilder. Systemet leser automatisk
                  butikknavn, dato, totalpris og individuelle varer. Det forstår norsk datoformat
                  (DD.MM.ÅÅ) og kategoriserer varer automatisk. Du kan redigere informasjonen før du lagrer.
                </p>
              </div>

              {/* Question 3 */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <PieChart className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Hva viser oversikten?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Oversikten gir deg fire hovedvisninger: ukentlig og månedlig forbruk, antall kvitteringer,
                  toppkategori, utgiftshistorikk (måned/år), budsjettbalanse, og kategorinedbrytning.
                  Alle grafer oppdateres automatisk når du legger til nye kvitteringer.
                </p>
              </div>

              {/* Question 4 */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Hvordan setter jeg opp budsjettet?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Gå til "Budsjett"-siden fra menyen. Her kan du legge til inntekter, faste utgifter
                  (husleie, strøm), variable utgifter (mat, underholdning), og lån. Du kan også legge
                  til egendefinerte kategorier for bedre organisering. Budsjettet viser balansen og
                  hvor mye som gjenstår av inntekten din.
                </p>
              </div>

              {/* Question 5 */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Settings className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Kan jeg eksportere dataene mine?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Ja! Gå til Innstillinger og trykk på "Eksporter alle data (CSV)". Dette laster ned
                  en CSV-fil med alle kvitteringene dine som du kan åpne i Excel, Google Sheets, eller
                  andre regnearkprogrammer.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Changelog Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Endringslogg
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* Version entry */}
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                    <span className="text-sm font-bold text-[var(--accent-primary)]">1.0</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">
                      Versjon 1.0.0
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">28. januar 2026</p>
                  </div>
                </div>
                <ul className="ml-11 space-y-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">✓</span>
                    <span>Forbedret norsk datoformat-tolkning i OCR (DD.MM.ÅÅ)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">✓</span>
                    <span>Lagt til CSV-eksport av alle kvitteringer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">✓</span>
                    <span>Mulighet for egendefinerte budsjettkategorier</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">✓</span>
                    <span>Fikset ikoner som ekspanderte utenfor kort på mobil</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">✓</span>
                    <span>Adminfunksjoner for avanserte innstillinger</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">✓</span>
                    <span>Lagt til denne hjelpesiden med FAQ og endringslogg</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tips Section */}
        <Card>
          <CardBody className="p-6">
            <div className="rounded-lg bg-[var(--accent-primary)]/10 p-4">
              <h3 className="mb-2 font-semibold text-[var(--text-primary)]">
                💡 Tips
              </h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>• Ta bilder av kvitteringer med god belysning for best OCR-resultat</li>
                <li>• Bruk søkefunksjonen for å finne spesifikke kvitteringer raskt</li>
                <li>• Sett opp budsjett for å få bedre oversikt over økonomien</li>
                <li>• Eksporter data regelmessig som backup</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
