/**
 * Credential Alerter Engine
 *
 * Scans staff credentials for upcoming/past expiry dates.
 * Returns alerts sorted by urgency (CRITICAL → WARNING → INFO).
 *
 * Severity:
 *   CRITICAL — expired or < 30 days to expiry
 *   WARNING  — 30-60 days to expiry
 *   INFO     — 60-90 days to expiry
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface CredentialAlert {
  staffId: string;
  staffName: string;
  staffCategory: string;
  designation: string | null;
  credentialId: string;
  credentialType: string;
  credentialName: string;
  registrationNo: string | null;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: "CRITICAL" | "WARNING" | "INFO";
  action: string;
}

export interface CredentialAlertResult {
  totalStaff: number;
  staffWithAlerts: number;
  alerts: CredentialAlert[];
  critical: number;
  warning: number;
  info: number;
  summary: string;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export async function runCredentialAlerts(
  prisma: any,
  branchId: string,
  lookAheadDays: number = 90,
): Promise<CredentialAlertResult> {
  const now = new Date();
  const cutoff = new Date(Date.now() + lookAheadDays * 86400000);

  // Find staff with credentials expiring within lookAheadDays, OR already expired
  const staffWithCredentials = await prisma.staff.findMany({
    where: {
      isActive: true,
      assignments: {
        some: { branchId, status: "ACTIVE" },
      },
      credentials: {
        some: {
          validTo: { lte: cutoff },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      category: true,
      designation: true,
      credentials: {
        where: {
          validTo: { lte: cutoff },
        },
        select: {
          id: true,
          credentialType: true,
          name: true,
          registrationNo: true,
          validTo: true,
        },
        orderBy: { validTo: "asc" },
      },
    },
  });

  // Count total active staff for context
  const totalStaff = await prisma.staff.count({
    where: {
      isActive: true,
      assignments: { some: { branchId, status: "ACTIVE" } },
    },
  });

  const alerts: CredentialAlert[] = [];

  for (const staff of staffWithCredentials) {
    const staffName = [staff.firstName, staff.lastName].filter(Boolean).join(" ");

    for (const cred of staff.credentials) {
      if (!cred.validTo) continue;

      const expiryDate = new Date(cred.validTo);
      const diffMs = expiryDate.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / 86400000);

      let severity: CredentialAlert["severity"];
      let action: string;

      if (daysUntilExpiry <= 0) {
        severity = "CRITICAL";
        action = `EXPIRED ${Math.abs(daysUntilExpiry)} day(s) ago. Immediate renewal required. Staff may not be legally authorized to practice.`;
      } else if (daysUntilExpiry <= 30) {
        severity = "CRITICAL";
        action = `Expiring in ${daysUntilExpiry} day(s). Initiate renewal immediately to avoid lapse.`;
      } else if (daysUntilExpiry <= 60) {
        severity = "WARNING";
        action = `Expiring in ${daysUntilExpiry} day(s). Start renewal process.`;
      } else {
        severity = "INFO";
        action = `Expiring in ${daysUntilExpiry} day(s). Plan ahead for renewal.`;
      }

      alerts.push({
        staffId: staff.id,
        staffName,
        staffCategory: staff.category,
        designation: staff.designation,
        credentialId: cred.id,
        credentialType: cred.credentialType,
        credentialName: cred.name ?? cred.credentialType,
        registrationNo: cred.registrationNo,
        expiryDate: expiryDate.toISOString().split("T")[0],
        daysUntilExpiry,
        severity,
        action,
      });
    }
  }

  // Sort: CRITICAL first, then by days until expiry ascending
  const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  alerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });

  const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
  const warning = alerts.filter((a) => a.severity === "WARNING").length;
  const info = alerts.filter((a) => a.severity === "INFO").length;

  let summary: string;
  if (alerts.length === 0) {
    summary = `All staff credentials are valid for at least ${lookAheadDays} days.`;
  } else {
    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (warning > 0) parts.push(`${warning} warning`);
    if (info > 0) parts.push(`${info} informational`);
    summary = `${alerts.length} credential alert(s) for ${staffWithCredentials.length} staff: ${parts.join(", ")}.`;
  }

  return {
    totalStaff,
    staffWithAlerts: staffWithCredentials.length,
    alerts,
    critical,
    warning,
    info,
    summary,
  };
}
