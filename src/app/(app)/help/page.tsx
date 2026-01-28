"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { HelpCircle, History, Receipt, Wallet, PieChart, Settings, Sparkles, Rocket, MessageCircle, Send } from "lucide-react";

export default function HelpPage() {
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;

    const subject = encodeURIComponent("Forslag til Budgetbuddy");
    const body = encodeURIComponent(
      `Fra: ${contactEmail || "Ikke oppgitt"}\n\nForslag:\n${contactMessage}`
    );
    window.open(`mailto:espen.morild@gmail.com?subject=${subject}&body=${body}`, "_self");

    setSubmitted(true);
    setContactEmail("");
    setContactMessage("");
  };

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
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Har du forslag til funksjoner?
              </h2>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Del dine ideer og ønsker for Budgetbuddy.
            </p>
          </CardHeader>
          <CardBody>
            {submitted ? (
              <div className="rounded-lg bg-[var(--accent-primary)]/10 p-6 text-center">
                <Send className="mx-auto h-8 w-8 text-[var(--accent-primary)] mb-2" />
                <h3 className="mb-1 font-semibold text-[var(--text-primary)]">
                  Takk for tilbakemeldingen!
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  E-postklienten din skal ha åpnet seg med forslaget ditt.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSubmitted(false)}
                >
                  Send nytt forslag
                </Button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <Input
                  label="Din e-post"
                  type="email"
                  placeholder="navn@eksempel.no"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <div className="w-full">
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                    Ditt forslag
                  </label>
                  <textarea
                    placeholder="Beskriv funksjonen eller forslaget ditt..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    rows={4}
                    className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all duration-200 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-none"
                  />
                </div>
                <Button type="submit" variant="primary" size="md" disabled={!contactMessage.trim()}>
                  <Send className="h-4 w-4" />
                  Send forslag
                </Button>
              </form>
            )}
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
