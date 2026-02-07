/**
 * Go-Live Score Calculator Engine
 *
 * Computes an AI-weighted readiness score across 5 categories:
 *   1. Physical Infrastructure (25%)
 *   2. Services & Billing     (30%)
 *   3. Staff Readiness         (20%)
 *   4. Clinical/Diagnostics    (15%)
 *   5. Compliance              (10%)
 *
 * Aggregates results from:
 *   - Existing GoLiveService (billing checks)
 *   - NABH Checker (compliance + infrastructure)
 *   - Consistency Checker (infrastructure + diagnostics)
 *   - Credential Alerter (staff readiness)
 */

import type { NABHReadinessResult } from "./nabh-checker.engine";
import type { ConsistencyResult } from "./consistency-checker.engine";
import type { CredentialAlertResult } from "./credential-alerter.engine";

// ─── Types ──────────────────────────────────────────────────────────────

export interface GoLiveCategory {
  name: string;
  weight: number;
  score: number;           // 0-100 within this category
  weightedScore: number;   // score * weight / 100
  blockers: string[];
  warnings: string[];
  passedChecks: number;
  totalChecks: number;
}

export interface GoLiveScoreResult {
  overall: number;         // 0-100 weighted score
  grade: "A" | "B" | "C" | "D" | "F";
  canGoLive: boolean;
  categories: {
    infrastructure: GoLiveCategory;
    servicesBilling: GoLiveCategory;
    staff: GoLiveCategory;
    diagnostics: GoLiveCategory;
    compliance: GoLiveCategory;
  };
  totalBlockers: number;
  totalWarnings: number;
  fixItSummary: { open: number };
  recommendation: string;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export function computeGoLiveScore(
  billingResult: any,
  nabhResult: NABHReadinessResult,
  consistencyResult: ConsistencyResult,
  credentialResult: CredentialAlertResult,
): GoLiveScoreResult {

  // ── 1. Physical Infrastructure (25%) ────────────────────────────────
  const infraBlockers: string[] = [];
  const infraWarnings: string[] = [];
  let infraPassed = 0;
  let infraTotal = 0;

  // From NABH chapters 1, 5, 8 (infrastructure-related)
  const infraChapters = [1, 5, 8];
  for (const ch of nabhResult.chapters) {
    if (infraChapters.includes(ch.chapter)) {
      for (const check of ch.checks) {
        infraTotal++;
        if (check.status === "PASS") {
          infraPassed++;
        } else if (check.severity === "BLOCKER") {
          infraBlockers.push(`${check.id}: ${check.description}`);
        } else {
          infraWarnings.push(`${check.id}: ${check.description}`);
        }
      }
    }
  }

  // From consistency checker — infrastructure category
  const infraConsistency = consistencyResult.issues.filter((i) => i.category === "INFRASTRUCTURE");
  for (const issue of infraConsistency) {
    infraTotal++;
    if (issue.severity === "BLOCKER") {
      infraBlockers.push(issue.title);
    } else if (issue.severity === "WARNING") {
      infraWarnings.push(issue.title);
    } else {
      infraPassed++; // INFO items don't penalize
    }
  }

  // Also count basic infrastructure health
  infraTotal += 3;
  if ((billingResult?.infra?.units ?? 0) > 0) infraPassed++;
  else infraBlockers.push("No active units created");
  if ((billingResult?.infra?.rooms ?? 0) > 0) infraPassed++;
  else infraWarnings.push("No rooms configured");
  if ((billingResult?.infra?.beds ?? 0) > 0) infraPassed++;
  else infraBlockers.push("No beds configured");

  const infraScore = infraTotal > 0 ? Math.round((infraPassed / infraTotal) * 100) : 0;

  // ── 2. Services & Billing (30%) ─────────────────────────────────────
  const billingBlockers: string[] = billingResult?.blockers ?? [];
  const billingWarnings: string[] = billingResult?.warnings ?? [];
  const billingTotal = (billingResult?.billing?.billableServicesChecked ?? 0)
    + (billingResult?.billing?.packagesChecked ?? 0) + 2; // +2 for plan + tax code existence
  const billingPassed = Math.max(0, billingTotal - billingBlockers.length - billingWarnings.length);

  // NABH chapters 3, 10 (medication + information management)
  const billingChapters = [3, 10];
  let billingNabhPassed = 0;
  let billingNabhTotal = 0;
  for (const ch of nabhResult.chapters) {
    if (billingChapters.includes(ch.chapter)) {
      for (const check of ch.checks) {
        billingNabhTotal++;
        if (check.status === "PASS") {
          billingNabhPassed++;
        } else if (check.severity === "BLOCKER") {
          billingBlockers.push(`${check.id}: ${check.description}`);
        } else {
          billingWarnings.push(`${check.id}: ${check.description}`);
        }
      }
    }
  }

  const totalBilling = billingTotal + billingNabhTotal;
  const passedBilling = billingPassed + billingNabhPassed;
  const billingScore = totalBilling > 0 ? Math.round((passedBilling / totalBilling) * 100) : 0;

  // ── 3. Staff Readiness (20%) ────────────────────────────────────────
  const staffBlockers: string[] = [];
  const staffWarnings: string[] = [];
  let staffPassed = 0;
  let staffTotal = 0;

  // NABH chapter 9
  for (const ch of nabhResult.chapters) {
    if (ch.chapter === 9) {
      for (const check of ch.checks) {
        staffTotal++;
        if (check.status === "PASS") {
          staffPassed++;
        } else if (check.severity === "BLOCKER") {
          staffBlockers.push(`${check.id}: ${check.description}`);
        } else {
          staffWarnings.push(`${check.id}: ${check.description}`);
        }
      }
    }
  }

  // Credential alerts
  staffTotal += 1;
  if (credentialResult.critical === 0) {
    staffPassed++;
  } else {
    staffBlockers.push(`${credentialResult.critical} critical credential alert(s)`);
  }

  if (credentialResult.warning > 0) {
    staffWarnings.push(`${credentialResult.warning} credential warning(s)`);
  }

  // Staffing consistency
  const staffConsistency = consistencyResult.issues.filter((i) => i.category === "STAFFING");
  for (const issue of staffConsistency) {
    staffTotal++;
    if (issue.severity === "BLOCKER") {
      staffBlockers.push(issue.title);
    } else if (issue.severity === "WARNING") {
      staffWarnings.push(issue.title);
    } else {
      staffPassed++;
    }
  }

  const staffScore = staffTotal > 0 ? Math.round((staffPassed / staffTotal) * 100) : 0;

  // ── 4. Clinical / Diagnostics (15%) ─────────────────────────────────
  const diagBlockers: string[] = [];
  const diagWarnings: string[] = [];
  let diagPassed = 0;
  let diagTotal = 0;

  // NABH chapter 2 (Care of Patients)
  for (const ch of nabhResult.chapters) {
    if (ch.chapter === 2) {
      for (const check of ch.checks) {
        diagTotal++;
        if (check.status === "PASS") {
          diagPassed++;
        } else if (check.severity === "BLOCKER") {
          diagBlockers.push(`${check.id}: ${check.description}`);
        } else {
          diagWarnings.push(`${check.id}: ${check.description}`);
        }
      }
    }
  }

  // Diagnostics consistency
  const diagConsistency = consistencyResult.issues.filter((i) => i.category === "DIAGNOSTICS");
  for (const issue of diagConsistency) {
    diagTotal++;
    if (issue.severity === "BLOCKER") {
      diagBlockers.push(issue.title);
    } else {
      diagPassed++;
    }
  }

  const diagScore = diagTotal > 0 ? Math.round((diagPassed / diagTotal) * 100) : 100;

  // ── 5. Compliance (10%) ─────────────────────────────────────────────
  const compBlockers: string[] = [];
  const compWarnings: string[] = [];
  let compPassed = 0;
  let compTotal = 0;

  // NABH chapters 4, 6, 7 (patient rights, QI, management)
  const compChapters = [4, 6, 7];
  for (const ch of nabhResult.chapters) {
    if (compChapters.includes(ch.chapter)) {
      for (const check of ch.checks) {
        compTotal++;
        if (check.status === "PASS") {
          compPassed++;
        } else if (check.severity === "BLOCKER") {
          compBlockers.push(`${check.id}: ${check.description}`);
        } else {
          compWarnings.push(`${check.id}: ${check.description}`);
        }
      }
    }
  }

  const compScore = compTotal > 0 ? Math.round((compPassed / compTotal) * 100) : 100;

  // ── Aggregate ───────────────────────────────────────────────────────
  const categories = {
    infrastructure: buildCategory("Physical Infrastructure", 25, infraScore, infraBlockers, infraWarnings, infraPassed, infraTotal),
    servicesBilling: buildCategory("Services & Billing", 30, billingScore, billingBlockers, billingWarnings, passedBilling, totalBilling),
    staff: buildCategory("Staff Readiness", 20, staffScore, staffBlockers, staffWarnings, staffPassed, staffTotal),
    diagnostics: buildCategory("Clinical / Diagnostics", 15, diagScore, diagBlockers, diagWarnings, diagPassed, diagTotal),
    compliance: buildCategory("Compliance", 10, compScore, compBlockers, compWarnings, compPassed, compTotal),
  };

  const overall = Math.round(
    Object.values(categories).reduce((sum, c) => sum + c.weightedScore, 0),
  );

  const totalBlockers = Object.values(categories).reduce((sum, c) => sum + c.blockers.length, 0);
  const totalWarnings = Object.values(categories).reduce((sum, c) => sum + c.warnings.length, 0);

  const grade = overall >= 90 ? "A"
    : overall >= 75 ? "B"
    : overall >= 60 ? "C"
    : overall >= 40 ? "D"
    : "F";

  const canGoLive = totalBlockers === 0 && overall >= 60;

  let recommendation: string;
  if (canGoLive && grade === "A") {
    recommendation = "Excellent! The branch is fully ready to go live.";
  } else if (canGoLive) {
    recommendation = `Branch can go live (score: ${overall}%). Address ${totalWarnings} warning(s) for a higher score.`;
  } else if (totalBlockers > 0) {
    recommendation = `Cannot go live. ${totalBlockers} blocker(s) must be resolved first. Use the FixIt suggestions to resolve them.`;
  } else {
    recommendation = `Score too low (${overall}%). Improve configuration across all categories to reach the 60% minimum.`;
  }

  return {
    overall,
    grade,
    canGoLive,
    categories,
    totalBlockers,
    totalWarnings,
    fixItSummary: { open: billingResult?.fixItsOpenAfter ?? billingResult?.fixItsOpenBefore ?? 0 },
    recommendation,
  };
}

// ─── Helper ─────────────────────────────────────────────────────────────

function buildCategory(
  name: string,
  weight: number,
  score: number,
  blockers: string[],
  warnings: string[],
  passed: number,
  total: number,
): GoLiveCategory {
  return {
    name,
    weight,
    score: Math.min(100, Math.max(0, score)),
    weightedScore: Math.round((Math.min(100, Math.max(0, score)) * weight) / 100),
    blockers,
    warnings,
    passedChecks: passed,
    totalChecks: total,
  };
}
