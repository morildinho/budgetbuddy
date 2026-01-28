"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { HelpCircle, History, Receipt, Wallet, PieChart, Settings, Sparkles, Rocket, MessageCircle } from "lucide-react";

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
              {/* What is Budgetbuddy */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Hva er Budgetbuddy?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Budgetbuddy er et system for å få oversikt over utgiftene dine, og gi deg en oversikt
                  over hva du bruker penger på i løpet av en gitt periode. Du kan scanne kvitteringen
                  fra butikken og systemet legger inn detaljene. Den har også en budsjettfunksjon, der
                  du legger inn dine månedlige inntekter og utgifter, for å se ditt overskudd fra måned
                  til måned. Fremtidige funksjoner vil kunne hente info fra banken din, og gi deg forslag
                  til tidsaktuelle tilbud, basert på dine kjøpsvaner.
                </p>
              </div>

              {/* How to add receipt */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Receipt className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Hvordan legger jeg til en kvittering?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Trykk på &quot;+ Legg til&quot; knappen oppe til høyre under &quot;Kvitteringer&quot;.
                  Du kan enten ta bilde av kvitteringen (bildet blir automatisk analysert med AI), eller
                  legge inn detaljene manuelt. Systemet vil automatisk foreslå kategori basert på butikk
                  og varer.
                </p>
              </div>

              {/* How scanning works */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Hvordan fungerer kvitteringsskanningen?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Systemet leser automatisk butikknavn, dato, totalpris og individuelle varer. Det
                  forstår norsk datoformat (DD.MM.ÅÅ) og kategoriserer varer automatisk. Du kan redigere
                  informasjonen før du lagrer. Systemet skal huske varens kategori til neste gang. Sjekk
                  at dato, navn og kategori er korrekt, da analysen kan ta feil.
                </p>
              </div>

              {/* What the overview shows */}
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

              {/* How to set up budget */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Hvordan setter jeg opp budsjettet?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Gå til &quot;Budsjett&quot;-siden fra menyen. Her kan du legge til inntekter, faste
                  utgifter (husleie, strøm), variable utgifter (mat, underholdning), og lån. Du kan også
                  legge til egendefinerte kategorier for bedre organisering. Budsjettet viser balansen
                  og hvor mye som gjenstår av inntekten din.
                </p>
              </div>

              {/* Can I export data */}
              <div>
                <div className="mb-2 flex items-start gap-2">
                  <Settings className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Kan jeg eksportere dataene mine?
                  </h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] ml-6">
                  Ja! Gå til Innstillinger og trykk på &quot;Eksporter alle data (CSV)&quot;. Dette
                  laster ned en CSV-fil med alle kvitteringene dine som du kan åpne i Excel, Google
                  Sheets, eller andre regnearkprogrammer.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Future Features */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Fremtidige funksjoner
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <PieChart className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                <span>Analyse: bedre oversikt over utgifter</span>
              </li>
              <li className="flex items-start gap-2">
                <Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                <span>Bankintegrasjon for å hente ut kontoutskrift for å sammenligne med budsjett og utgifter</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-primary)]" />
                <span>Få konkrete tilbud basert på de varene du handler mest, fra butikker nær deg</span>
              </li>
            </ul>
          </CardBody>
        </Card>

        {/* Contact / Feedback */}
        <Card>
          <CardBody className="p-6">
            <div className="rounded-lg bg-[var(--accent-primary)]/10 p-4 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-[var(--accent-primary)] mb-2" />
              <h3 className="mb-1 font-semibold text-[var(--text-primary)]">
                Har du forslag til funksjoner?
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Ta kontakt for å dele dine ideer og ønsker for Budgetbuddy.
              </p>
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
                    <span className="text-[var(--accent-success)]">&#10003;</span>
                    <span>Forbedret norsk datoformat-tolkning i OCR (DD.MM.&#197;&#197;)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">&#10003;</span>
                    <span>Lagt til CSV-eksport av alle kvitteringer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">&#10003;</span>
                    <span>Mulighet for egendefinerte budsjettkategorier</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">&#10003;</span>
                    <span>Fikset ikoner som ekspanderte utenfor kort på mobil</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">&#10003;</span>
                    <span>Adminfunksjoner for avanserte innstillinger</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-success)]">&#10003;</span>
                    <span>Lagt til denne hjelpesiden med FAQ og endringslogg</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
