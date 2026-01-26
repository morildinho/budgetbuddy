"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Receipt, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <Card>
      <CardBody className="p-8">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/20">
            <Receipt className="h-8 w-8 text-[var(--accent-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Velkommen tilbake</h1>
          <p className="text-sm text-[var(--text-muted)]">Logg inn på kontoen din</p>
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

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Logg inn
          </Button>
        </form>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Har du ikke en konto?{" "}
          <Link
            href="/signup"
            className="font-medium text-[var(--accent-primary)] hover:underline"
          >
            Registrer deg
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
