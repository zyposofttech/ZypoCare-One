import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@excelcare/db";

/**
 * Master Facility Catalog Seed
 * - Ensures the Facility Setup UI has items under CLINICAL, SERVICE, SUPPORT
 * - Codes are stable identifiers (do NOT change once used in production)
 * - sortOrder keeps UI ordering consistent
 *
 * NOTE:
 * - Items like Housekeeping / IT / Maintenance / Billing / MRD are SUPPORT (so your Support column is not empty).
 * - Diagnostic and therapy lines are SERVICE.
 * - Patient-facing care units are CLINICAL.
 */

type FacilityCategory = "CLINICAL" | "SERVICE" | "SUPPORT";

const FACILITY_SEED: Array<{
  code: string;
  name: string;
  category: FacilityCategory;
  sortOrder: number;
}> = [
  // =========================
  // CLINICAL (Patient-facing)
  // =========================
  { code: "OPD", name: "OPD (Outpatient Department)", category: "CLINICAL", sortOrder: 1 },
  { code: "IPD_WARDS", name: "IPD Wards", category: "CLINICAL", sortOrder: 2 },
  { code: "EMERGENCY_MEDICINE", name: "Emergency Medicine", category: "CLINICAL", sortOrder: 3 },
  { code: "CRITICAL_CARE", name: "Critical Care (ICU)", category: "CLINICAL", sortOrder: 4 },
  { code: "CCU", name: "Cardiac Care Unit (CCU)", category: "CLINICAL", sortOrder: 5 },
  { code: "NICU", name: "Neonatal ICU (NICU)", category: "CLINICAL", sortOrder: 6 },
  { code: "PICU", name: "Pediatric ICU (PICU)", category: "CLINICAL", sortOrder: 7 },
  { code: "DIALYSIS_UNIT", name: "Dialysis Unit", category: "CLINICAL", sortOrder: 8 },
  { code: "DAY_CARE", name: "Day Care / Day Procedures", category: "CLINICAL", sortOrder: 9 },

  { code: "GENERAL_MEDICINE", name: "General Medicine", category: "CLINICAL", sortOrder: 10 },
  { code: "GENERAL_SURGERY", name: "General Surgery", category: "CLINICAL", sortOrder: 11 },
  { code: "ORTHOPEDICS", name: "Orthopedics", category: "CLINICAL", sortOrder: 12 },
  { code: "PEDIATRICS", name: "Pediatrics", category: "CLINICAL", sortOrder: 13 },
  { code: "OBGYN", name: "Obstetrics & Gynecology", category: "CLINICAL", sortOrder: 14 },

  { code: "CARDIOLOGY", name: "Cardiology", category: "CLINICAL", sortOrder: 15 },
  { code: "NEUROLOGY", name: "Neurology", category: "CLINICAL", sortOrder: 16 },
  { code: "NEUROSURGERY", name: "Neurosurgery", category: "CLINICAL", sortOrder: 17 },
  { code: "NEPHROLOGY", name: "Nephrology", category: "CLINICAL", sortOrder: 18 },
  { code: "UROLOGY", name: "Urology", category: "CLINICAL", sortOrder: 19 },

  { code: "GASTROENTEROLOGY", name: "Gastroenterology", category: "CLINICAL", sortOrder: 20 },
  { code: "PULMONOLOGY", name: "Pulmonology", category: "CLINICAL", sortOrder: 21 },
  { code: "ENDOCRINOLOGY", name: "Endocrinology", category: "CLINICAL", sortOrder: 22 },
  { code: "DERMATOLOGY", name: "Dermatology", category: "CLINICAL", sortOrder: 23 },
  { code: "PSYCHIATRY", name: "Psychiatry", category: "CLINICAL", sortOrder: 24 },

  { code: "ENT", name: "ENT (Otorhinolaryngology)", category: "CLINICAL", sortOrder: 25 },
  { code: "OPHTHALMOLOGY", name: "Ophthalmology", category: "CLINICAL", sortOrder: 26 },
  { code: "DENTISTRY", name: "Dentistry", category: "CLINICAL", sortOrder: 27 },

  { code: "ONCOLOGY", name: "Oncology", category: "CLINICAL", sortOrder: 28 },
  { code: "HEMATOLOGY", name: "Hematology", category: "CLINICAL", sortOrder: 29 },
  { code: "RHEUMATOLOGY", name: "Rheumatology", category: "CLINICAL", sortOrder: 30 },

  { code: "ANESTHESIOLOGY", name: "Anesthesiology", category: "CLINICAL", sortOrder: 31 },
  { code: "PAIN_CLINIC", name: "Pain Clinic", category: "CLINICAL", sortOrder: 32 },
  { code: "INFECTIOUS_DISEASE", name: "Infectious Diseases", category: "CLINICAL", sortOrder: 33 },

  { code: "PLASTIC_SURGERY", name: "Plastic & Reconstructive Surgery", category: "CLINICAL", sortOrder: 34 },
  { code: "GASTRO_SURGERY", name: "Gastrointestinal Surgery", category: "CLINICAL", sortOrder: 35 },
  { code: "VASCULAR_SURGERY", name: "Vascular Surgery", category: "CLINICAL", sortOrder: 36 },

  // =========================
  // SERVICE (Diagnostics + Treatment Services)
  // =========================
  { code: "RADIOLOGY", name: "Radiology & Imaging", category: "SERVICE", sortOrder: 110 },
  { code: "PATHOLOGY", name: "Pathology & Lab Services", category: "SERVICE", sortOrder: 111 },
  { code: "MICROBIOLOGY", name: "Microbiology", category: "SERVICE", sortOrder: 112 },
  { code: "BLOOD_BANK", name: "Blood Bank", category: "SERVICE", sortOrder: 113 },
  { code: "PHARMACY", name: "Pharmacy", category: "SERVICE", sortOrder: 114 },

  { code: "PHYSIOTHERAPY", name: "Physiotherapy & Rehabilitation", category: "SERVICE", sortOrder: 115 },
  { code: "DIETETICS", name: "Dietetics & Nutrition", category: "SERVICE", sortOrder: 116 },
  { code: "ENDOSCOPY", name: "Endoscopy", category: "SERVICE", sortOrder: 117 },
  { code: "CATH_LAB", name: "Cath Lab", category: "SERVICE", sortOrder: 118 },

  { code: "OPERATION_THEATRE", name: "Operation Theatre", category: "SERVICE", sortOrder: 119 },
  { code: "CSSD", name: "CSSD (Central Sterile Supply Department)", category: "SERVICE", sortOrder: 120 },

  { code: "AMBULANCE", name: "Ambulance Services", category: "SERVICE", sortOrder: 121 },
  { code: "TELEMEDICINE", name: "Telemedicine", category: "SERVICE", sortOrder: 122 },
  { code: "HOME_CARE", name: "Home Care / Home Visits", category: "SERVICE", sortOrder: 123 },

  // =========================
  // SUPPORT (Admin + Operations Enablement)
  // =========================
  { code: "RECEPTION", name: "Reception & Front Desk", category: "SUPPORT", sortOrder: 210 },
  { code: "PATIENT_HELPDESK", name: "Patient Helpdesk", category: "SUPPORT", sortOrder: 211 },
  { code: "CALL_CENTER", name: "Call Center", category: "SUPPORT", sortOrder: 212 },

  { code: "BILLING_TPA", name: "Billing & TPA Desk", category: "SUPPORT", sortOrder: 214 },
  { code: "MEDICAL_RECORDS", name: "Medical Records / MRD", category: "SUPPORT", sortOrder: 215 },
  { code: "INSURANCE_COORDINATION", name: "Insurance Coordination", category: "SUPPORT", sortOrder: 216 },

  { code: "HOUSEKEEPING", name: "Housekeeping", category: "SUPPORT", sortOrder: 220 },
  { code: "LAUNDRY_LINEN", name: "Laundry & Linen", category: "SUPPORT", sortOrder: 221 },
  { code: "SECURITY", name: "Security", category: "SUPPORT", sortOrder: 222 },
  { code: "TRANSPORT", name: "Transport / Patient Movement", category: "SUPPORT", sortOrder: 223 },
  { code: "WASTE_MANAGEMENT", name: "Biomedical Waste Management", category: "SUPPORT", sortOrder: 224 },

  { code: "MAINTENANCE", name: "Maintenance", category: "SUPPORT", sortOrder: 230 },
  { code: "BIOMEDICAL", name: "Biomedical Engineering", category: "SUPPORT", sortOrder: 231 },
  { code: "IT_SUPPORT", name: "IT Support", category: "SUPPORT", sortOrder: 232 },
  { code: "FACILITY_ADMIN", name: "Facility Administration", category: "SUPPORT", sortOrder: 233 },

  { code: "STORES_INVENTORY", name: "Stores & Inventory", category: "SUPPORT", sortOrder: 240 },
  { code: "PROCUREMENT", name: "Procurement", category: "SUPPORT", sortOrder: 241 },
  { code: "FINANCE_ACCOUNTS", name: "Finance & Accounts", category: "SUPPORT", sortOrder: 242 },

  { code: "HR_ADMIN", name: "HR & Administration", category: "SUPPORT", sortOrder: 250 },
  { code: "TRAINING_EDUCATION", name: "Training & Education", category: "SUPPORT", sortOrder: 251 },

  { code: "KITCHEN_CAFETERIA", name: "Kitchen / Cafeteria", category: "SUPPORT", sortOrder: 260 },
];

@Injectable()
export class FacilitySetupSeedService implements OnModuleInit {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  async onModuleInit() {
    // Only run in dev seed mode
    if (process.env.AUTH_DEV_SEED !== "true") return;

    for (const f of FACILITY_SEED) {
      await this.prisma.facilityCatalog.upsert({
        where: { code: f.code },
        update: {
          name: f.name,
          category: f.category as any,
          sortOrder: f.sortOrder,
          isActive: true,
        },
        create: {
          code: f.code,
          name: f.name,
          category: f.category as any,
          sortOrder: f.sortOrder,
          isActive: true,
        },
      });
    }
  }
}
