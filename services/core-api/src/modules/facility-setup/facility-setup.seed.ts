import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";

/**
 * Facility Setup Seed
 *
 * What this seeds:
 * 1) Master Facility Catalog (existing)
 * 2) Department Master FacilityCatalog entry (DEPARTMENT_MASTER)
 * 3) Specialty Master per branch (SPECIALTY + SUPER_SPECIALTY)
 * 4) Standard Departments per branch (linked to DEPARTMENT_MASTER facility)
 */

type FacilityCategory = "CLINICAL" | "SERVICE" | "SUPPORT";

type SpecialtyKind = "SPECIALTY" | "SUPER_SPECIALTY";

const FACILITY_SEED: Array<{
  code: string;
  name: string;
  category: FacilityCategory;
  sortOrder: number;
}> = [
  // System hidden facility used internally for Dept records (so Dept UI doesn't depend on Facilities)
  { code: "DEPARTMENT_MASTER", name: "Department Master (System)", category: "SUPPORT", sortOrder: 0 },

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
];

const SPECIALTY_SEED: Array<{ code: string; name: string; kind: SpecialtyKind }> = [
  // Core specialties (extendable)
  { code: "GENERAL_MEDICINE", name: "General Medicine", kind: "SPECIALTY" },
  { code: "GENERAL_SURGERY", name: "General Surgery", kind: "SPECIALTY" },
  { code: "OBSTETRICS_GYNECOLOGY", name: "Obstetrics & Gynaecology", kind: "SPECIALTY" },
  { code: "PEDIATRICS", name: "Pediatrics", kind: "SPECIALTY" },
  { code: "ORTHOPEDICS", name: "Orthopedics", kind: "SPECIALTY" },
  { code: "OPHTHALMOLOGY", name: "Ophthalmology", kind: "SPECIALTY" },
  { code: "ENT", name: "ENT (Otorhinolaryngology)", kind: "SPECIALTY" },
  { code: "DERMATOLOGY", name: "Dermatology", kind: "SPECIALTY" },
  { code: "PSYCHIATRY", name: "Psychiatry", kind: "SPECIALTY" },
  { code: "CARDIOLOGY", name: "Cardiology", kind: "SPECIALTY" },
  { code: "NEUROLOGY", name: "Neurology", kind: "SPECIALTY" },
  { code: "NEPHROLOGY", name: "Nephrology", kind: "SPECIALTY" },
  { code: "GASTROENTEROLOGY", name: "Gastroenterology", kind: "SPECIALTY" },
  { code: "PULMONOLOGY", name: "Pulmonology", kind: "SPECIALTY" },
  { code: "UROLOGY", name: "Urology", kind: "SPECIALTY" },
  { code: "ONCOLOGY_MEDICAL", name: "Oncology (Medical)", kind: "SPECIALTY" },
  { code: "ONCOLOGY_SURGICAL", name: "Oncology (Surgical)", kind: "SPECIALTY" },
  { code: "ONCOLOGY_RADIATION", name: "Oncology (Radiation)", kind: "SPECIALTY" },
  { code: "EMERGENCY_MEDICINE", name: "Emergency Medicine", kind: "SPECIALTY" },
  { code: "ANESTHESIOLOGY", name: "Anesthesiology", kind: "SPECIALTY" },
  { code: "RADIOLOGY", name: "Radiology", kind: "SPECIALTY" },
  { code: "PATHOLOGY", name: "Pathology", kind: "SPECIALTY" },
  { code: "CRITICAL_CARE_MEDICINE", name: "Critical Care Medicine", kind: "SPECIALTY" },
  { code: "NEONATOLOGY", name: "Neonatology", kind: "SPECIALTY" },

  // Add breadth (MCI/NMC recognized style)
  { code: "COMMUNITY_MEDICINE", name: "Community Medicine", kind: "SPECIALTY" },
  { code: "FAMILY_MEDICINE", name: "Family Medicine", kind: "SPECIALTY" },
  { code: "INTERNAL_MEDICINE", name: "Internal Medicine", kind: "SPECIALTY" },
  { code: "RESPIRATORY_MEDICINE", name: "Respiratory Medicine", kind: "SPECIALTY" },
  { code: "ENDOCRINOLOGY", name: "Endocrinology", kind: "SPECIALTY" },
  { code: "RHEUMATOLOGY", name: "Rheumatology", kind: "SPECIALTY" },
  { code: "HEMATOLOGY", name: "Hematology", kind: "SPECIALTY" },
  { code: "MEDICAL_GENETICS", name: "Medical Genetics", kind: "SPECIALTY" },
  { code: "GERIATRIC_MEDICINE", name: "Geriatric Medicine", kind: "SPECIALTY" },
  { code: "SPORTS_MEDICINE", name: "Sports Medicine", kind: "SPECIALTY" },
  { code: "PALLIATIVE_MEDICINE", name: "Palliative Medicine", kind: "SPECIALTY" },
  { code: "PAIN_MEDICINE", name: "Pain Medicine", kind: "SPECIALTY" },

  { code: "INFECTIOUS_DISEASES", name: "Infectious Diseases", kind: "SPECIALTY" },
  { code: "TROPICAL_MEDICINE", name: "Tropical Medicine", kind: "SPECIALTY" },

  { code: "NEUROSURGERY", name: "Neurosurgery", kind: "SPECIALTY" },
  { code: "CARDIOTHORACIC_SURGERY", name: "Cardiothoracic Surgery", kind: "SUPER_SPECIALTY" },
  { code: "PLASTIC_SURGERY", name: "Plastic Surgery", kind: "SUPER_SPECIALTY" },
  { code: "PEDIATRIC_SURGERY", name: "Pediatric Surgery", kind: "SUPER_SPECIALTY" },
  { code: "SURGICAL_GASTROENTEROLOGY", name: "Surgical Gastroenterology", kind: "SUPER_SPECIALTY" },

  { code: "NEUROLOGY_SUPER", name: "Neurology (Super-specialty)", kind: "SUPER_SPECIALTY" },
  { code: "NEUROSURGERY_SUPER", name: "Neurosurgery (Super-specialty)", kind: "SUPER_SPECIALTY" },

  // Surgical
  { code: "LAPAROSCOPIC_SURGERY", name: "Laparoscopic Surgery", kind: "SPECIALTY" },
  { code: "VASCULAR_SURGERY", name: "Vascular Surgery", kind: "SUPER_SPECIALTY" },
  { code: "SURGICAL_ONCOLOGY", name: "Surgical Oncology", kind: "SUPER_SPECIALTY" },
  { code: "UROLOGY_SURGERY", name: "Urology (Surgery)", kind: "SPECIALTY" },
  { code: "ORTHOPEDIC_SURGERY", name: "Orthopedic Surgery", kind: "SPECIALTY" },
  { code: "HAND_SURGERY", name: "Hand Surgery", kind: "SUPER_SPECIALTY" },

  // Women & Child
  { code: "REPRODUCTIVE_MEDICINE", name: "Reproductive Medicine", kind: "SUPER_SPECIALTY" },
  { code: "FETAL_MEDICINE", name: "Fetal Medicine", kind: "SUPER_SPECIALTY" },
  { code: "PEDIATRIC_CARDIOLOGY", name: "Pediatric Cardiology", kind: "SUPER_SPECIALTY" },
  { code: "PEDIATRIC_NEUROLOGY", name: "Pediatric Neurology", kind: "SUPER_SPECIALTY" },

  // Imaging
  { code: "DIAGNOSTIC_RADIOLOGY", name: "Diagnostic Radiology", kind: "SPECIALTY" },
  { code: "INTERVENTIONAL_RADIOLOGY", name: "Interventional Radiology", kind: "SUPER_SPECIALTY" },

  // Labs
  { code: "MICROBIOLOGY", name: "Microbiology", kind: "SPECIALTY" },
  { code: "BIOCHEMISTRY", name: "Biochemistry", kind: "SPECIALTY" },
  { code: "IMMUNOLOGY", name: "Immunology", kind: "SPECIALTY" },
  { code: "TRANSFUSION_MEDICINE", name: "Transfusion Medicine", kind: "SPECIALTY" },

  // Others
  { code: "DENTISTRY", name: "Dentistry", kind: "SPECIALTY" },
  { code: "ORAL_MAXILLOFACIAL_SURGERY", name: "Oral & Maxillofacial Surgery", kind: "SUPER_SPECIALTY" },
  { code: "PHYSIOTHERAPY", name: "Physiotherapy", kind: "SPECIALTY" },
  { code: "DIETETICS", name: "Dietetics & Nutrition", kind: "SPECIALTY" },
  { code: "DERMATO_SURGERY", name: "Dermatosurgery", kind: "SUPER_SPECIALTY" },
  { code: "VENEREOLOGY", name: "Venereology", kind: "SPECIALTY" },
  { code: "HEPATOLOGY", name: "Hepatology", kind: "SUPER_SPECIALTY" },
  { code: "GASTROENTEROLOGY_SUPER", name: "Gastroenterology (Super-specialty)", kind: "SUPER_SPECIALTY" },
  { code: "NEPHROLOGY_SUPER", name: "Nephrology (Super-specialty)", kind: "SUPER_SPECIALTY" },
  { code: "UROLOGY_SUPER", name: "Urology (Super-specialty)", kind: "SUPER_SPECIALTY" },

  // Fill to reach 100+ (commonly used hospital directory)
  { code: "ALLERGY_IMMUNOLOGY", name: "Allergy & Immunology", kind: "SPECIALTY" },
  { code: "AUDIOLOGY", name: "Audiology", kind: "SPECIALTY" },
  { code: "CARDIAC_ELECTROPHYSIOLOGY", name: "Cardiac Electrophysiology", kind: "SUPER_SPECIALTY" },
  { code: "DIABETOLOGY", name: "Diabetology", kind: "SPECIALTY" },
  { code: "CLINICAL_PSYCHOLOGY", name: "Clinical Psychology", kind: "SPECIALTY" },
  { code: "NEUROPSYCHIATRY", name: "Neuropsychiatry", kind: "SUPER_SPECIALTY" },
  { code: "SLEEP_MEDICINE", name: "Sleep Medicine", kind: "SUPER_SPECIALTY" },
  { code: "NUCLEAR_MEDICINE", name: "Nuclear Medicine", kind: "SPECIALTY" },
  { code: "RADIATION_ONCOLOGY", name: "Radiation Oncology", kind: "SPECIALTY" },
  { code: "MEDICAL_ONCOLOGY", name: "Medical Oncology", kind: "SPECIALTY" },
  { code: "HEMATO_ONCOLOGY", name: "Hemato-Oncology", kind: "SUPER_SPECIALTY" },
  { code: "TRANSPLANT_SURGERY", name: "Transplant Surgery", kind: "SUPER_SPECIALTY" },
  { code: "TRANSPLANT_MEDICINE", name: "Transplant Medicine", kind: "SUPER_SPECIALTY" },
  { code: "TRAUMA_SURGERY", name: "Trauma Surgery", kind: "SPECIALTY" },
  { code: "TRAUMA_ORTHOPEDICS", name: "Trauma Orthopedics", kind: "SPECIALTY" },
  { code: "SPINE_SURGERY", name: "Spine Surgery", kind: "SUPER_SPECIALTY" },
  { code: "JOINT_REPLACEMENT", name: "Joint Replacement", kind: "SUPER_SPECIALTY" },
  { code: "ARTHROSCOPY_SPORTS", name: "Arthroscopy & Sports Injury", kind: "SUPER_SPECIALTY" },
  { code: "NEUROREHABILITATION", name: "Neurorehabilitation", kind: "SUPER_SPECIALTY" },
  { code: "CARDIAC_REHABILITATION", name: "Cardiac Rehabilitation", kind: "SUPER_SPECIALTY" },
  { code: "PULMONARY_REHABILITATION", name: "Pulmonary Rehabilitation", kind: "SUPER_SPECIALTY" },
  { code: "SPEECH_LANGUAGE_THERAPY", name: "Speech & Language Therapy", kind: "SPECIALTY" },
  { code: "OCCUPATIONAL_THERAPY", name: "Occupational Therapy", kind: "SPECIALTY" },
  { code: "CLINICAL_NUTRITION", name: "Clinical Nutrition", kind: "SPECIALTY" },
  { code: "NEUROANESTHESIA", name: "Neuroanesthesia", kind: "SUPER_SPECIALTY" },
  { code: "CARDIAC_ANESTHESIA", name: "Cardiac Anesthesia", kind: "SUPER_SPECIALTY" },
  { code: "PEDIATRIC_ANESTHESIA", name: "Pediatric Anesthesia", kind: "SUPER_SPECIALTY" },
  { code: "OBSTETRIC_ANESTHESIA", name: "Obstetric Anesthesia", kind: "SUPER_SPECIALTY" },
  { code: "CRITICAL_CARE_ANESTHESIA", name: "Critical Care Anesthesia", kind: "SUPER_SPECIALTY" },
  { code: "NEUROCRITICAL_CARE", name: "Neurocritical Care", kind: "SUPER_SPECIALTY" },
  { code: "CARDIAC_CRITICAL_CARE", name: "Cardiac Critical Care", kind: "SUPER_SPECIALTY" },
  { code: "NEPHROLOGY_DIALYSIS", name: "Nephrology & Dialysis", kind: "SPECIALTY" },
  { code: "INTERVENTIONAL_CARDIOLOGY", name: "Interventional Cardiology", kind: "SUPER_SPECIALTY" },
  { code: "CARDIAC_SURGERY", name: "Cardiac Surgery", kind: "SUPER_SPECIALTY" },
  { code: "THORACIC_SURGERY", name: "Thoracic Surgery", kind: "SUPER_SPECIALTY" },
  { code: "ENDOCRINE_SURGERY", name: "Endocrine Surgery", kind: "SUPER_SPECIALTY" },
  { code: "BREAST_SURGERY", name: "Breast Surgery", kind: "SUPER_SPECIALTY" },
  { code: "COLORECTAL_SURGERY", name: "Colorectal Surgery", kind: "SUPER_SPECIALTY" },
  { code: "HEPATOBILIARY_SURGERY", name: "Hepatobiliary Surgery", kind: "SUPER_SPECIALTY" },
  { code: "PANCREATIC_SURGERY", name: "Pancreatic Surgery", kind: "SUPER_SPECIALTY" },
  { code: "BARIATRIC_SURGERY", name: "Bariatric Surgery", kind: "SUPER_SPECIALTY" },
  { code: "DIABETIC_FOOT", name: "Diabetic Foot Care", kind: "SUPER_SPECIALTY" },
  { code: "WOUND_CARE", name: "Wound Care", kind: "SPECIALTY" },
  { code: "RADIATION_SAFETY", name: "Radiation Safety", kind: "SPECIALTY" },
  { code: "PUBLIC_HEALTH", name: "Public Health", kind: "SPECIALTY" },
  { code: "EPIDEMIOLOGY", name: "Epidemiology", kind: "SPECIALTY" },
  { code: "CLINICAL_RESEARCH", name: "Clinical Research", kind: "SPECIALTY" },
];

const STANDARD_DEPARTMENTS: Array<{
  code: string;
  name: string;
  facilityType: FacilityCategory;
  operatingHours?: any;
}> = [
  { code: "EMERGENCY", name: "Emergency Department", facilityType: "CLINICAL", operatingHours: { type: "24x7" } },
  { code: "OPD", name: "Outpatient Department", facilityType: "CLINICAL", operatingHours: { type: "DAY" } },
  { code: "IPD", name: "Inpatient Department", facilityType: "CLINICAL", operatingHours: { type: "24x7" } },
  { code: "ICU", name: "Intensive Care Unit", facilityType: "CLINICAL", operatingHours: { type: "24x7" } },
  { code: "OT", name: "Operation Theatre", facilityType: "SERVICE", operatingHours: { type: "SCHEDULED" } },
  { code: "LAB", name: "Laboratory", facilityType: "SERVICE", operatingHours: { type: "SCHEDULED" } },
  { code: "RADIOLOGY", name: "Radiology", facilityType: "SERVICE", operatingHours: { type: "SCHEDULED" } },
  { code: "PHARMACY", name: "Pharmacy", facilityType: "SERVICE", operatingHours: { type: "SCHEDULED" } },
  { code: "BLOOD_BANK", name: "Blood Bank", facilityType: "SERVICE", operatingHours: { type: "24x7" } },
  { code: "PHYSIOTHERAPY", name: "Physiotherapy", facilityType: "SERVICE", operatingHours: { type: "DAY" } },
  { code: "DIETARY", name: "Dietary Services", facilityType: "SUPPORT", operatingHours: { type: "DAY" } },
  { code: "CSSD", name: "Central Sterile Supply", facilityType: "SERVICE", operatingHours: { type: "SCHEDULED" } },
  { code: "MRD", name: "Medical Records", facilityType: "SUPPORT", operatingHours: { type: "DAY" } },
  { code: "BILLING", name: "Billing & Accounts", facilityType: "SUPPORT", operatingHours: { type: "DAY" } },
  { code: "ADMIN", name: "Administration", facilityType: "SUPPORT", operatingHours: { type: "DAY" } },
  { code: "HR", name: "Human Resources", facilityType: "SUPPORT", operatingHours: { type: "DAY" } },
  { code: "MAINTENANCE", name: "Maintenance & Engineering", facilityType: "SUPPORT", operatingHours: { type: "DAY" } },
];

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

@Injectable()
export class FacilitySetupSeed implements OnModuleInit {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  async onModuleInit() {
    if (process.env.AUTH_DEV_SEED !== "true") return;
    await this.seed();
  }

  async seed() {
    // 1) Facility Catalog
    for (const f of FACILITY_SEED) {
      await this.prisma.facilityCatalog.upsert({
        where: { code: f.code },
        update: { name: f.name, category: f.category as any, sortOrder: f.sortOrder },
        create: { code: f.code, name: f.name, category: f.category as any, sortOrder: f.sortOrder },
      });
    }

    // 2) Resolve Department Master facilityId
    const deptFacility = await this.prisma.facilityCatalog.findUnique({
      where: { code: "DEPARTMENT_MASTER" },
      select: { id: true },
    });
    if (!deptFacility) return;

    // 3) Seed per-branch specialties + standard departments
    const branches = await this.prisma.branch.findMany({ select: { id: true } });
    for (const b of branches) {
      // Ensure branchFacility enabled for DEPARTMENT_MASTER (so legacy checks do not block)
      await this.prisma.branchFacility.upsert({
        where: { branchId_facilityId: { branchId: b.id, facilityId: deptFacility.id } },
        update: { isEnabled: true },
        create: { branchId: b.id, facilityId: deptFacility.id, isEnabled: true },
      });

      // Specialties
      for (const s of SPECIALTY_SEED) {
        await this.prisma.specialty.upsert({
          where: { branchId_code: { branchId: b.id, code: s.code } },
          update: { name: s.name, kind: s.kind as any, isActive: true },
          create: { branchId: b.id, code: s.code, name: s.name, kind: s.kind as any, isActive: true },
        });
      }

      // Departments (standard)
      for (const d of STANDARD_DEPARTMENTS) {
        const existing = await this.prisma.department.findFirst({
          where: { branchId: b.id, facilityId: deptFacility.id, code: d.code },
          select: { id: true },
        });
        if (existing) {
          await this.prisma.department.update({
            where: { id: existing.id },
            data: {
              name: d.name,
              facilityType: d.facilityType as any,
              operatingHours: d.operatingHours ? (d.operatingHours as any) : null,
              isActive: true,
            },
          });
        } else {
          await this.prisma.department.create({
            data: {
              branchId: b.id,
              facilityId: deptFacility.id,
              code: d.code,
              name: d.name,
              facilityType: d.facilityType as any,
              operatingHours: d.operatingHours ? (d.operatingHours as any) : null,
              isActive: true,
            },
          });
        }
      }
    }
  }
}
