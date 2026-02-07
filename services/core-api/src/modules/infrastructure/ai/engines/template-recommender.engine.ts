/**
 * Template Recommender Engine
 *
 * Recommends SMALL / MEDIUM / LARGE hospital template based on
 * bed count, specialty count, and hospital type.
 */

import * as hospitalProfiles from "../data/hospital-profiles.json";

export type TemplateSize = "SMALL" | "MEDIUM" | "LARGE";

export interface TemplateRecommendation {
  recommended: TemplateSize;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{ size: TemplateSize; reason: string }>;
}

export function recommendTemplate(input: {
  bedCount: number;
  specialtyCount?: number;
  hospitalType?: string;
}): TemplateRecommendation {
  const beds = input.bedCount ?? 0;
  const specs = input.specialtyCount ?? 0;
  const type = (input.hospitalType ?? "").toUpperCase();
  const thresholds = (hospitalProfiles as any).templateThresholds;
  const reasoning: string[] = [];

  // Score-based approach: each factor contributes to a size score
  let sizeScore = 0; // 0=SMALL, 1=MEDIUM, 2=LARGE

  // Bed count is primary factor
  if (beds <= thresholds.SMALL.maxBeds) {
    sizeScore += 0;
    reasoning.push(`Bed count (${beds}) fits SMALL template (≤${thresholds.SMALL.maxBeds}).`);
  } else if (beds <= thresholds.MEDIUM.maxBeds) {
    sizeScore += 1;
    reasoning.push(`Bed count (${beds}) fits MEDIUM template (≤${thresholds.MEDIUM.maxBeds}).`);
  } else {
    sizeScore += 2;
    reasoning.push(`Bed count (${beds}) fits LARGE template (>${thresholds.MEDIUM.maxBeds}).`);
  }

  // Specialty count is secondary factor
  if (specs > 0) {
    if (specs <= thresholds.SMALL.maxSpecialties) {
      reasoning.push(`${specs} specialties → SMALL range.`);
    } else if (specs <= thresholds.MEDIUM.maxSpecialties) {
      sizeScore = Math.max(sizeScore, 1);
      reasoning.push(`${specs} specialties → MEDIUM range.`);
    } else {
      sizeScore = Math.max(sizeScore, 2);
      reasoning.push(`${specs} specialties → LARGE range.`);
    }
  }

  // Hospital type override
  if (type === "CLINIC") {
    sizeScore = 0;
    reasoning.push("Clinic type → SMALL template.");
  } else if (type === "NURSING_HOME") {
    sizeScore = Math.min(sizeScore, 1);
    reasoning.push("Nursing Home → capped at MEDIUM.");
  } else if (type === "SUPER_SPECIALTY" || type === "TEACHING") {
    sizeScore = Math.max(sizeScore, 1);
    reasoning.push(`${type} → at least MEDIUM.`);
  }

  const sizeMap: TemplateSize[] = ["SMALL", "MEDIUM", "LARGE"];
  const recommended = sizeMap[sizeScore];

  // Alternatives
  const alternatives: TemplateRecommendation["alternatives"] = [];
  if (sizeScore > 0) {
    alternatives.push({ size: sizeMap[sizeScore - 1], reason: "Leaner setup with fewer defaults" });
  }
  if (sizeScore < 2) {
    alternatives.push({ size: sizeMap[sizeScore + 1], reason: "More comprehensive setup for growth" });
  }

  // Confidence
  let confidence = 75;
  if (beds > 0) confidence += 10;
  if (specs > 0) confidence += 5;
  if (type) confidence += 5;
  confidence = Math.min(95, confidence);

  return { recommended, confidence, reasoning, alternatives };
}
