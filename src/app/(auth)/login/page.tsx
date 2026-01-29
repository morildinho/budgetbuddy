"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle } from "lucide-react";
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
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
      {/* Left side - Logo & description */}
      <div className="flex-1 text-center lg:text-left">
        <div className="relative mx-auto lg:mx-0 h-32 w-64 lg:h-40 lg:w-80 mb-6">
          <Image
            src="/logo.png"
            alt="Budgetbuddy"
            fill
            className="object-contain object-center lg:object-left"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
          Budgetbuddy
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          Budgetbuddy gir deg oversikt over utgiftene dine, og gir deg kontroll
          over hva du bruker penger på i løpet av en gitt periode. Scan eller
          legg inn kvitteringer og Budgetbuddy legger inn alt i kategorier. Lag
          budsjett og sammenlign med din kontoutskrift.
        </p>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Har du ikke login?{" "}
          <Link
            href="/signup"
            className="font-medium text-[var(--accent-primary)] hover:underline"
          >
            Registrer deg her!
          </Link>
        </p>
      </div>

      {/* Right side - Login form */}
      <div className="w-full max-w-md">
        <Card>
          <CardBody className="p-8">
            <div className="mb-8 flex flex-col items-center">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Velkommen tilbake</h2>
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

            {/* Sign Up Link (mobile only) */}
            <p className="mt-6 text-center text-sm text-[var(--text-muted)] lg:hidden">
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
      </div>
    </div>
  );
}
