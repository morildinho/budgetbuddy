"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Receipt, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate passwords match
    if (form.password !== form.confirmPassword) {
      setError("Passordene er ikke like");
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (form.password.length < 6) {
      setError("Passordet må være minst 6 tegn");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (success) {
    return (
      <Card>
        <CardBody className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-success)]/20">
              <CheckCircle className="h-8 w-8 text-[var(--accent-success)]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
              Sjekk e-posten din
            </h2>
            <p className="mb-6 text-sm text-[var(--text-muted)]">
              Vi har sendt en bekreftelseslenke til <strong>{form.email}</strong>.
              Klikk på lenken for å aktivere kontoen din.
            </p>
            <Link href="/login">
              <Button variant="outline">Tilbake til innlogging</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-8">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/20">
            <Receipt className="h-8 w-8 text-[var(--accent-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Opprett konto</h1>
          <p className="text-sm text-[var(--text-muted)]">Begynn å spore kvitteringene dine</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-[var(--accent-danger)]/10 p-4">
            <AlertCircle className="h-5 w-5 text-[var(--accent-danger)]" />
            <p className="text-sm text-[var(--accent-danger)]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Fullt navn"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Ditt navn"
            required
          />

          <Input
            label="E-post"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="deg@eksempel.no"
            required
          />

          <Input
            label="Passord"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          <Input
            label="Bekreft passord"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Opprett konto
          </Button>
        </form>

        {/* Sign In Link */}
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Har du allerede en konto?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--accent-primary)] hover:underline"
          >
            Logg inn
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
