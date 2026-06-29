"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    const acceptInvite = async () => {
      try {
        const res = await fetch(`/api/household/invite/${token}`, {
          method: "POST",
        });
        const data = await res.json();

        if (!res.ok) {
          setMessage(data.error || "Kunne ikke akseptere invitasjonen");
          setStatus("error");
          return;
        }

        setStatus("success");
        setMessage("Du har akseptert invitasjonen!");
        setTimeout(() => router.push("/"), 2000);
      } catch {
        setStatus("error");
        setMessage("Noe gikk galt. Prøv igjen.");
      }
    };

    acceptInvite();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--accent-primary)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Aksepterer invitasjon...</h1>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-[var(--accent-success)]" />
              <h1 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Velkommen!</h1>
              <p className="text-[var(--text-muted)]">{message}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Videresender til oversikten...</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto mb-4 h-12 w-12 text-[var(--accent-danger)]" />
              <h1 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Noe gikk galt</h1>
              <p className="mb-6 text-[var(--text-muted)]">{message}</p>
              <Button onClick={() => router.push("/")} variant="outline">
                Gå til oversikten
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
