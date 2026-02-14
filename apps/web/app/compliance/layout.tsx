/**
 * Compliance layout — children pass through directly.
 *
 * The AI Help system is unified into the global CopilotProvider (AppShell).
 * Individual compliance pages call useCompliancePageHelp("page-id")
 * to register with the unified widget — no separate wrapper needed.
 */
export default function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
