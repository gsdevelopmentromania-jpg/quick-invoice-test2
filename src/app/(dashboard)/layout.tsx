import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GlobalShortcuts } from "@/components/global-shortcuts";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): React.ReactElement {
  return (
    <DashboardShell>
      <GlobalShortcuts />
      {children}
    </DashboardShell>
  );
}
