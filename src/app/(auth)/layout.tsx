import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell relative flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="absolute right-4 top-4 w-10 sm:w-36">
        <div className="hidden sm:block"><ThemeToggle /></div>
        <div className="sm:hidden"><ThemeToggle compact /></div>
      </div>
      <div className="w-full max-w-4xl">{children}</div>
    </div>
  );
}
