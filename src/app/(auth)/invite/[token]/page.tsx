"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

interface InviteInfo {
  id: string;
  household_name: string;
  invite_email: string | null;
  permissions: {
    overview: boolean;
    receipts: boolean;
    transactions: boolean;
    budget: boolean;
    analytics: boolean;
    portfolio: boolean;
  };
}

const permissionLabels: Record<string, string> = {
  overview: "Oversikt",
  receipts: "Kvitteringer",
  transactions: "Transaksjoner",
  budget: "Budsjett",
  analytics: "Analyse",
  portfolio: "Portefølje",
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/household/invite/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Ugyldig invitasjon");
          return;
        }
        const data = await res.json();
        setInvite(data.invite);
      } catch {
        setError("Kunne ikke hente invitasjon");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAction = (action: "login" | "signup") => {
    const returnTo = `/invite/${token}/accept`;
    const path = action === "login" ? "/login" : "/signup";
    router.push(`${path}?returnTo=${encodeURIComponent(returnTo)}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
        <Card className="w-full max-w-md">
          <CardBody className="p-8 text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-[var(--accent-danger)]" />
            <h1 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Ugyldig invitasjon</h1>
            <p className="mb-6 text-[var(--text-muted)]">{error}</p>
            <Button onClick={() => router.push("/login")} variant="outline">
              Gå til innlogging
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!invite) return null;

  const grantedPermissions = Object.entries(invite.permissions)
    .filter(([, v]) => v)
    .map(([k]) => permissionLabels[k] || k);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-primary)]/15">
              <Users className="h-8 w-8 text-[var(--accent-primary)]" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Du er invitert!
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Bli med i <span className="font-semibold text-[var(--accent-primary)]">{invite.household_name}</span> på BudgetBuddy
            </p>
          </div>

          {/* Permissions */}
          <div className="mb-6 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
              <Shield className="h-4 w-4" />
              Du får tilgang til:
            </div>
            <div className="space-y-2">
              {grantedPermissions.map((label) => (
                <div key={label} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <CheckCircle className="h-4 w-4 text-[var(--accent-success)]" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button className="w-full" onClick={() => handleAction("login")}>
              Logg inn og aksepter
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleAction("signup")}>
              Lag ny konto
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
            Du vil bli vist til å akseptere invitasjonen etter innlogging.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
