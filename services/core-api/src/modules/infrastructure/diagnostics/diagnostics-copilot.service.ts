import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "./diagnostics.principal";
import { resolveBranchId } from "./diagnostics.util";

/**
 * AI Copilot Service for Diagnostics Configuration.
 *
 * Provides intelligent suggestions for:
 * - LOINC/SNOMED code mapping
 * - Reference range validation
 * - PCPNDT flag auto-detection
 * - Configuration gap analysis
 * - Panel composition suggestions
 */

// Built-in LOINC mapping dictionary (common lab tests)
const LOINC_MAP: Record<string, { code: string; display: string }[]> = {
  hemoglobin: [{ code: "718-7", display: "Hemoglobin [Mass/volume] in Blood" }],
  hgb: [{ code: "718-7", display: "Hemoglobin [Mass/volume] in Blood" }],
  "complete blood count": [{ code: "57021-8", display: "CBC W Auto Differential panel - Blood" }],
  cbc: [{ code: "57021-8", display: "CBC W Auto Differential panel - Blood" }],
  glucose: [
    { code: "2345-7", display: "Glucose [Mass/volume] in Serum or Plasma" },
    { code: "2339-0", display: "Glucose [Mass/volume] in Blood" },
  ],
  "fasting glucose": [{ code: "1558-6", display: "Fasting glucose [Mass/volume] in Serum or Plasma" }],
  creatinine: [{ code: "2160-0", display: "Creatinine [Mass/volume] in Serum or Plasma" }],
  urea: [{ code: "3094-0", display: "Urea nitrogen [Mass/volume] in Serum or Plasma" }],
  bun: [{ code: "3094-0", display: "Urea nitrogen [Mass/volume] in Serum or Plasma" }],
  cholesterol: [{ code: "2093-3", display: "Cholesterol [Mass/volume] in Serum or Plasma" }],
  triglycerides: [{ code: "2571-8", display: "Triglyceride [Mass/volume] in Serum or Plasma" }],
  hdl: [{ code: "2085-9", display: "HDL Cholesterol [Mass/volume] in Serum or Plasma" }],
  ldl: [{ code: "2089-1", display: "LDL Cholesterol [Mass/volume] in Serum or Plasma" }],
  "lipid profile": [{ code: "57698-3", display: "Lipid panel with direct LDL - Serum or Plasma" }],
  tsh: [{ code: "3016-3", display: "TSH [Units/volume] in Serum or Plasma" }],
  t3: [{ code: "3053-6", display: "Triiodothyronine (T3) [Mass/volume] in Serum or Plasma" }],
  t4: [{ code: "3026-2", display: "Thyroxine (T4) [Mass/volume] in Serum or Plasma" }],
  "thyroid profile": [{ code: "3016-3", display: "TSH [Units/volume] in Serum or Plasma" }],
  sgpt: [{ code: "1742-6", display: "ALT [Enzymatic activity/volume] in Serum or Plasma" }],
  alt: [{ code: "1742-6", display: "ALT [Enzymatic activity/volume] in Serum or Plasma" }],
  sgot: [{ code: "1920-8", display: "AST [Enzymatic activity/volume] in Serum or Plasma" }],
  ast: [{ code: "1920-8", display: "AST [Enzymatic activity/volume] in Serum or Plasma" }],
  "liver function": [{ code: "24325-3", display: "Hepatic function panel - Serum or Plasma" }],
  lft: [{ code: "24325-3", display: "Hepatic function panel - Serum or Plasma" }],
  "kidney function": [{ code: "24362-6", display: "Renal function panel - Serum or Plasma" }],
  kft: [{ code: "24362-6", display: "Renal function panel - Serum or Plasma" }],
  rft: [{ code: "24362-6", display: "Renal function panel - Serum or Plasma" }],
  urine: [{ code: "24356-8", display: "Urinalysis complete panel in Urine" }],
  urinalysis: [{ code: "24356-8", display: "Urinalysis complete panel in Urine" }],
  "blood group": [{ code: "882-1", display: "ABO+Rh group [Type] in Blood" }],
  hba1c: [{ code: "4548-4", display: "Hemoglobin A1c/Hemoglobin.total in Blood" }],
  "glycated hemoglobin": [{ code: "4548-4", display: "Hemoglobin A1c/Hemoglobin.total in Blood" }],
  esr: [{ code: "4537-7", display: "Erythrocyte sedimentation rate" }],
  "platelet count": [{ code: "777-3", display: "Platelets [#/volume] in Blood by Automated count" }],
  wbc: [{ code: "6690-2", display: "Leukocytes [#/volume] in Blood by Automated count" }],
  rbc: [{ code: "789-8", display: "Erythrocytes [#/volume] in Blood by Automated count" }],
  sodium: [{ code: "2951-2", display: "Sodium [Moles/volume] in Serum or Plasma" }],
  potassium: [{ code: "2823-3", display: "Potassium [Moles/volume] in Serum or Plasma" }],
  calcium: [{ code: "17861-6", display: "Calcium [Mass/volume] in Serum or Plasma" }],
  bilirubin: [{ code: "1975-2", display: "Bilirubin.total [Mass/volume] in Serum or Plasma" }],
  albumin: [{ code: "1751-7", display: "Albumin [Mass/volume] in Serum or Plasma" }],
  "total protein": [{ code: "2885-2", display: "Protein [Mass/volume] in Serum or Plasma" }],
  "uric acid": [{ code: "3084-1", display: "Urate [Mass/volume] in Serum or Plasma" }],
  iron: [{ code: "2498-4", display: "Iron [Mass/volume] in Serum or Plasma" }],
  ferritin: [{ code: "2276-4", display: "Ferritin [Mass/volume] in Serum or Plasma" }],
  "vitamin d": [{ code: "1989-3", display: "25-Hydroxyvitamin D3 [Mass/volume] in Serum or Plasma" }],
  "vitamin b12": [{ code: "2132-9", display: "Cobalamin (Vitamin B12) [Mass/volume] in Serum or Plasma" }],
  "c-reactive protein": [{ code: "1988-5", display: "C reactive protein [Mass/volume] in Serum or Plasma" }],
  crp: [{ code: "1988-5", display: "C reactive protein [Mass/volume] in Serum or Plasma" }],
  pt: [{ code: "5902-2", display: "Prothrombin time (PT)" }],
  inr: [{ code: "6301-6", display: "INR in Platelet poor plasma by Coagulation assay" }],
  aptt: [{ code: "3173-2", display: "aPTT in Platelet poor plasma by Coagulation assay" }],
  psa: [{ code: "2857-1", display: "Prostate specific Ag [Mass/volume] in Serum or Plasma" }],
  hiv: [{ code: "68961-2", display: "HIV 1 and 2 tests - Serum or Plasma Qualitative" }],
  hbsag: [{ code: "5196-1", display: "Hepatitis B surface Ag [Presence] in Serum" }],
  "hepatitis b": [{ code: "5196-1", display: "Hepatitis B surface Ag [Presence] in Serum" }],
  "hepatitis c": [{ code: "16128-1", display: "Hepatitis C virus Ab [Presence] in Serum" }],
  dengue: [{ code: "6812-2", display: "Dengue virus IgM Ab [Presence] in Serum" }],
  malaria: [{ code: "32700-7", display: "Plasmodium sp identified in Blood by Light microscopy" }],
  typhoid: [{ code: "5228-2", display: "Widal test" }],
  amylase: [{ code: "1798-8", display: "Amylase [Enzymatic activity/volume] in Serum or Plasma" }],
  lipase: [{ code: "3040-3", display: "Lipase [Enzymatic activity/volume] in Serum or Plasma" }],
};

// SNOMED mapping dictionary
const SNOMED_MAP: Record<string, { code: string; display: string }[]> = {
  hemoglobin: [{ code: "26604007", display: "Complete blood count (procedure)" }],
  cbc: [{ code: "26604007", display: "Complete blood count (procedure)" }],
  "complete blood count": [{ code: "26604007", display: "Complete blood count (procedure)" }],
  glucose: [{ code: "33747003", display: "Glucose measurement (procedure)" }],
  creatinine: [{ code: "70901006", display: "Creatinine measurement (procedure)" }],
  "lipid profile": [{ code: "252150008", display: "Lipid panel (procedure)" }],
  "thyroid profile": [{ code: "61231009", display: "Thyroid function test (procedure)" }],
  "liver function": [{ code: "26958001", display: "Hepatic function panel (procedure)" }],
  urinalysis: [{ code: "27171005", display: "Urinalysis (procedure)" }],
  "chest xray": [{ code: "399208008", display: "Plain chest X-ray (procedure)" }],
  "x-ray": [{ code: "363680008", display: "Radiographic imaging procedure (procedure)" }],
  ultrasound: [{ code: "16310003", display: "Ultrasonography (procedure)" }],
  ecg: [{ code: "29303009", display: "Electrocardiographic procedure (procedure)" }],
  mri: [{ code: "113091000", display: "MRI (procedure)" }],
  "ct scan": [{ code: "77477000", display: "CT scan (procedure)" }],
};

// PCPNDT keywords
const PCPNDT_KEYWORDS = [
  "ultrasound", "usg", "sonography", "anomaly scan",
  "fetal", "obstetric", "ob scan", "nt scan",
  "nuchal translucency", "gender", "sex determination",
];

@Injectable()
export class DiagnosticsCopilotService {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  /**
   * Suggest LOINC codes based on test name
   */
  suggestLoinc(testName: string): { suggestions: { code: string; display: string; confidence: number }[] } {
    const normalized = testName.toLowerCase().trim();
    const suggestions: { code: string; display: string; confidence: number }[] = [];

    // Exact match
    if (LOINC_MAP[normalized]) {
      for (const m of LOINC_MAP[normalized]) {
        suggestions.push({ ...m, confidence: 0.95 });
      }
    }

    // Partial match
    if (suggestions.length === 0) {
      for (const [key, values] of Object.entries(LOINC_MAP)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          for (const m of values) {
            if (!suggestions.some((s) => s.code === m.code)) {
              suggestions.push({ ...m, confidence: 0.7 });
            }
          }
        }
      }
    }

    // Word-level match
    if (suggestions.length === 0) {
      const words = normalized.split(/\s+/);
      for (const word of words) {
        if (word.length < 3) continue;
        for (const [key, values] of Object.entries(LOINC_MAP)) {
          if (key.includes(word)) {
            for (const m of values) {
              if (!suggestions.some((s) => s.code === m.code)) {
                suggestions.push({ ...m, confidence: 0.4 });
              }
            }
          }
        }
      }
    }

    return { suggestions: suggestions.slice(0, 5) };
  }

  /**
   * Suggest SNOMED codes based on test name
   */
  suggestSnomed(testName: string): { suggestions: { code: string; display: string; confidence: number }[] } {
    const normalized = testName.toLowerCase().trim();
    const suggestions: { code: string; display: string; confidence: number }[] = [];

    if (SNOMED_MAP[normalized]) {
      for (const m of SNOMED_MAP[normalized]) {
        suggestions.push({ ...m, confidence: 0.95 });
      }
    }

    if (suggestions.length === 0) {
      for (const [key, values] of Object.entries(SNOMED_MAP)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          for (const m of values) {
            if (!suggestions.some((s) => s.code === m.code)) {
              suggestions.push({ ...m, confidence: 0.7 });
            }
          }
        }
      }
    }

    return { suggestions: suggestions.slice(0, 5) };
  }

  /**
   * Auto-detect PCPNDT requirement for a test name
   */
  detectPcpndt(testName: string): { requiresPcpndt: boolean; matchedKeyword: string | null; confidence: number } {
    const normalized = testName.toLowerCase().trim();
    for (const keyword of PCPNDT_KEYWORDS) {
      if (normalized.includes(keyword)) {
        return { requiresPcpndt: true, matchedKeyword: keyword, confidence: 0.9 };
      }
    }
    return { requiresPcpndt: false, matchedKeyword: null, confidence: 0.95 };
  }

  /**
   * Validate reference ranges for overlaps and gaps
   */
  async validateRanges(
    principal: Principal,
    parameterId: string,
    branchIdInput: string,
  ): Promise<{
    issues: { type: string; message: string; severity: "error" | "warning" }[];
    valid: boolean;
  }> {
    const branchId = resolveBranchId(principal, branchIdInput);
    const ranges = await this.prisma.diagnosticReferenceRange.findMany({
      where: { parameterId, isActive: true },
      orderBy: [{ sex: "asc" }, { ageMinDays: "asc" }],
    });

    const issues: { type: string; message: string; severity: "error" | "warning" }[] = [];

    if (ranges.length === 0) {
      issues.push({ type: "missing", message: "No reference ranges defined", severity: "warning" });
      return { issues, valid: true };
    }

    // Check for overlapping age ranges within same sex group
    const sexGroups = new Map<string, typeof ranges>();
    for (const r of ranges) {
      const key = r.sex ?? "ALL";
      if (!sexGroups.has(key)) sexGroups.set(key, []);
      sexGroups.get(key)!.push(r);
    }

    for (const [sex, group] of sexGroups) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          if (a.ageMinDays != null && a.ageMaxDays != null && b.ageMinDays != null && b.ageMaxDays != null) {
            if (a.ageMinDays <= b.ageMaxDays && b.ageMinDays <= a.ageMaxDays) {
              issues.push({
                type: "overlap",
                message: `Age range overlap for sex=${sex}: [${a.ageMinDays}-${a.ageMaxDays}] and [${b.ageMinDays}-${b.ageMaxDays}]`,
                severity: "error",
              });
            }
          }

          // Check numeric range overlap
          if (a.low != null && a.high != null && b.low != null && b.high != null) {
            if (a.low <= b.high && b.low <= a.high &&
                a.ageMinDays === b.ageMinDays && a.ageMaxDays === b.ageMaxDays) {
              issues.push({
                type: "value-overlap",
                message: `Numeric range overlap for sex=${sex}: [${a.low}-${a.high}] and [${b.low}-${b.high}]`,
                severity: "warning",
              });
            }
          }
        }
      }
    }

    // Check for low > high
    for (const r of ranges) {
      if (r.low != null && r.high != null && r.low > r.high) {
        issues.push({
          type: "inverted",
          message: `Low (${r.low}) > High (${r.high}) for sex=${r.sex ?? "ALL"}`,
          severity: "error",
        });
      }
    }

    return { issues, valid: issues.filter((i) => i.severity === "error").length === 0 };
  }

  /**
   * Analyze configuration gaps for a branch
   */
  async analyzeGaps(
    principal: Principal,
    branchIdInput: string,
  ): Promise<{
    gaps: { category: string; title: string; detail: string; severity: "high" | "medium" | "low" }[];
    stats: {
      totalItems: number;
      itemsWithLoinc: number;
      loincCoverage: number;
      itemsWithSnomed: number;
      labItemsWithParams: number;
      labItemsWithRanges: number;
      itemsWithTemplates: number;
    };
  }> {
    const branchId = resolveBranchId(principal, branchIdInput);
    const items = await this.prisma.diagnosticItem.findMany({
      where: { branchId, isActive: true },
      include: {
        _count: {
          select: { parameters: true, templates: true },
        },
      },
    });

    const gaps: { category: string; title: string; detail: string; severity: "high" | "medium" | "low" }[] = [];

    const totalItems = items.length;
    const labItems = items.filter((i) => i.kind === "LAB");
    const itemsWithLoinc = items.filter((i) => i.loincCode).length;
    const itemsWithSnomed = items.filter((i) => i.snomedCode).length;
    const labItemsWithParams = labItems.filter((i) => i._count.parameters > 0).length;
    const labItemsWithRanges = 0; // Would require deeper query
    const itemsWithTemplates = items.filter((i) => i._count.templates > 0).length;

    const loincCoverage = totalItems > 0 ? Math.round((itemsWithLoinc / totalItems) * 100) : 0;

    // LOINC coverage
    if (loincCoverage < 80) {
      const missing = items.filter((i) => !i.loincCode).map((i) => i.name);
      gaps.push({
        category: "coding",
        title: `LOINC coverage: ${loincCoverage}% (target: 80%)`,
        detail: `${missing.length} items missing LOINC codes: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}`,
        severity: loincCoverage < 50 ? "high" : "medium",
      });
    }

    // SNOMED coverage
    const snomedCoverage = totalItems > 0 ? Math.round((itemsWithSnomed / totalItems) * 100) : 0;
    if (snomedCoverage < 50) {
      gaps.push({
        category: "coding",
        title: `SNOMED coverage: ${snomedCoverage}%`,
        detail: `${totalItems - itemsWithSnomed} items missing SNOMED codes`,
        severity: "low",
      });
    }

    // Lab items without parameters
    const labNoParams = labItems.filter((i) => i._count.parameters === 0);
    if (labNoParams.length > 0) {
      gaps.push({
        category: "parameters",
        title: `${labNoParams.length} lab test(s) without parameters`,
        detail: labNoParams.map((i) => i.name).slice(0, 5).join(", "),
        severity: "high",
      });
    }

    // Items without templates
    const noTemplates = items.filter((i) => i._count.templates === 0);
    if (noTemplates.length > 0) {
      gaps.push({
        category: "templates",
        title: `${noTemplates.length} item(s) without report templates`,
        detail: noTemplates.map((i) => i.name).slice(0, 5).join(", "),
        severity: "medium",
      });
    }

    // PCPNDT detection
    const potentialPcpndt = items.filter((i) => {
      const n = i.name.toLowerCase();
      return PCPNDT_KEYWORDS.some((k) => n.includes(k)) && !i.requiresPcpndt;
    });
    if (potentialPcpndt.length > 0) {
      gaps.push({
        category: "compliance",
        title: `${potentialPcpndt.length} item(s) may require PCPNDT flag`,
        detail: potentialPcpndt.map((i) => i.name).join(", "),
        severity: "high",
      });
    }

    // Lab items without specimen
    const labNoSpecimen = labItems.filter((i) => !i.specimenId);
    if (labNoSpecimen.length > 0) {
      gaps.push({
        category: "specimen",
        title: `${labNoSpecimen.length} lab test(s) without specimen`,
        detail: labNoSpecimen.map((i) => i.name).slice(0, 5).join(", "),
        severity: "high",
      });
    }

    return {
      gaps,
      stats: {
        totalItems,
        itemsWithLoinc,
        loincCoverage,
        itemsWithSnomed,
        labItemsWithParams,
        labItemsWithRanges,
        itemsWithTemplates,
      },
    };
  }

  /**
   * Batch auto-map LOINC codes for items missing them
   */
  async autoMapLoinc(
    principal: Principal,
    branchIdInput: string,
  ): Promise<{ mapped: { itemId: string; name: string; loincCode: string; display: string; confidence: number }[]; skipped: string[] }> {
    const branchId = resolveBranchId(principal, branchIdInput);
    const items = await this.prisma.diagnosticItem.findMany({
      where: { branchId, isActive: true, loincCode: null },
    });

    const mapped: { itemId: string; name: string; loincCode: string; display: string; confidence: number }[] = [];
    const skipped: string[] = [];

    for (const item of items) {
      const result = this.suggestLoinc(item.name);
      if (result.suggestions.length > 0 && result.suggestions[0].confidence >= 0.7) {
        const best = result.suggestions[0];
        mapped.push({
          itemId: item.id,
          name: item.name,
          loincCode: best.code,
          display: best.display,
          confidence: best.confidence,
        });
      } else {
        skipped.push(item.name);
      }
    }

    return { mapped, skipped };
  }

  /**
   * Apply LOINC mappings to items (batch update)
   */
  async applyLoincMappings(
    principal: Principal,
    branchIdInput: string,
    mappings: { itemId: string; loincCode: string }[],
  ): Promise<{ updated: number }> {
    const branchId = resolveBranchId(principal, branchIdInput);
    let updated = 0;

    for (const mapping of mappings) {
      await this.prisma.diagnosticItem.updateMany({
        where: { id: mapping.itemId, branchId },
        data: { loincCode: mapping.loincCode },
      });
      updated++;
    }

    return { updated };
  }
}
