export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-4xl">{children}</div>
    </div>
  );
}
