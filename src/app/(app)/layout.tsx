import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = 'force-dynamic';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="pb-20 lg:ml-64 lg:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
