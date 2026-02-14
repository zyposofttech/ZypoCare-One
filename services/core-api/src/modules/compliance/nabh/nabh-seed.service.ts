import { Injectable, Logger } from "@nestjs/common";
import { ComplianceContextService } from "../compliance-context.service";

/**
 * NABH 6th Edition (2025) seed template.
 *
 * Creates a master template with 10 chapters and ~40 representative
 * Measurable Elements (MEs). Call `seed()` from a manual endpoint,
 * CLI command, or test setup.
 */

interface SeedItem {
  chapter: string;
  standardCode: string;
  meCode: string;
  title: string;
  description: string;
  evidenceRequired: boolean;
  riskLevel: "CRITICAL" | "MAJOR" | "MINOR";
}

const NABH_6TH_EDITION_ITEMS: SeedItem[] = [
  // ─── Chapter 1: Access, Assessment and Continuity of Care (AAC) ───
  {
    chapter: "Access, Assessment and Continuity of Care (AAC)",
    standardCode: "AAC.1",
    meCode: "AAC.1.a",
    title: "Defined admission process with documented criteria",
    description:
      "The organisation has a defined and documented process for patient admission including prioritisation criteria for emergency and elective cases.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Access, Assessment and Continuity of Care (AAC)",
    standardCode: "AAC.2",
    meCode: "AAC.2.a",
    title: "Initial assessment completed within defined time frame",
    description:
      "Every patient undergoes an initial assessment by a qualified medical practitioner within the time frame defined by hospital policy.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Access, Assessment and Continuity of Care (AAC)",
    standardCode: "AAC.3",
    meCode: "AAC.3.a",
    title: "Continuity of care during inter-departmental transfers",
    description:
      "Documented handover protocols are followed during patient transfers between departments to ensure continuity of clinical information.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Access, Assessment and Continuity of Care (AAC)",
    standardCode: "AAC.4",
    meCode: "AAC.4.a",
    title: "Discharge planning initiated at admission",
    description:
      "Discharge planning process is initiated at the time of admission and involves the patient, family, and multidisciplinary team.",
    evidenceRequired: false,
    riskLevel: "MAJOR",
  },

  // ─── Chapter 2: Care of Patients (COP) ───
  {
    chapter: "Care of Patients (COP)",
    standardCode: "COP.1",
    meCode: "COP.1.a",
    title: "Uniform care delivery guided by clinical protocols",
    description:
      "Clinical care is delivered uniformly across all departments using evidence-based protocols and standard operating procedures.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Care of Patients (COP)",
    standardCode: "COP.2",
    meCode: "COP.2.a",
    title: "Informed consent obtained before procedures",
    description:
      "Written informed consent is obtained from the patient or legal guardian before all surgical, anaesthetic, and high-risk procedures.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Care of Patients (COP)",
    standardCode: "COP.3",
    meCode: "COP.3.a",
    title: "Pain assessment and management protocol",
    description:
      "All patients are assessed for pain using validated tools and managed according to documented pain management protocols.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Care of Patients (COP)",
    standardCode: "COP.4",
    meCode: "COP.4.a",
    title: "Surgical safety checklist compliance",
    description:
      "The WHO Surgical Safety Checklist (or equivalent) is completed for every surgical procedure with documented compliance audits.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },

  // ─── Chapter 3: Management of Medication (MOM) ───
  {
    chapter: "Management of Medication (MOM)",
    standardCode: "MOM.1",
    meCode: "MOM.1.a",
    title: "Formulary management and review process",
    description:
      "The hospital maintains an approved formulary that is reviewed at least annually by the pharmacy and therapeutics committee.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Management of Medication (MOM)",
    standardCode: "MOM.2",
    meCode: "MOM.2.a",
    title: "High-alert medication identification and safeguards",
    description:
      "High-alert medications are identified, labelled distinctly, and stored separately with additional verification safeguards during dispensing.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Management of Medication (MOM)",
    standardCode: "MOM.3",
    meCode: "MOM.3.a",
    title: "Medication administration follows five-rights principle",
    description:
      "Medication administration follows the five-rights rule: right patient, right drug, right dose, right route, and right time.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Management of Medication (MOM)",
    standardCode: "MOM.4",
    meCode: "MOM.4.a",
    title: "Adverse drug reaction reporting and monitoring",
    description:
      "A system exists for reporting, documenting, and monitoring adverse drug reactions and medication errors with root cause analysis.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },

  // ─── Chapter 4: Patient Rights and Education (PRE) ───
  {
    chapter: "Patient Rights and Education (PRE)",
    standardCode: "PRE.1",
    meCode: "PRE.1.a",
    title: "Patient rights charter displayed and communicated",
    description:
      "A patient rights charter is prominently displayed and communicated to patients and families at the time of admission in their preferred language.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Patient Rights and Education (PRE)",
    standardCode: "PRE.2",
    meCode: "PRE.2.a",
    title: "Grievance redressal mechanism with defined turnaround",
    description:
      "A formal grievance redressal mechanism is established with documented turnaround times and escalation pathways.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Patient Rights and Education (PRE)",
    standardCode: "PRE.3",
    meCode: "PRE.3.a",
    title: "Patient and family education on diagnosis and care plan",
    description:
      "Patients and families receive education on their diagnosis, planned treatment, expected outcomes, and self-care instructions at discharge.",
    evidenceRequired: false,
    riskLevel: "MINOR",
  },
  {
    chapter: "Patient Rights and Education (PRE)",
    standardCode: "PRE.4",
    meCode: "PRE.4.a",
    title: "Privacy and confidentiality of patient information",
    description:
      "Policies and procedures protect patient privacy and confidentiality of medical records in both physical and electronic formats.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },

  // ─── Chapter 5: Hospital Infection Control (HIC) ───
  {
    chapter: "Hospital Infection Control (HIC)",
    standardCode: "HIC.1",
    meCode: "HIC.1.a",
    title: "Infection control programme with designated committee",
    description:
      "An infection control programme is established with a designated infection control committee, infection control officer, and defined scope.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Hospital Infection Control (HIC)",
    standardCode: "HIC.2",
    meCode: "HIC.2.a",
    title: "Hand hygiene compliance monitoring",
    description:
      "Hand hygiene compliance is monitored across all clinical areas using WHO-defined methodology with at least quarterly audits.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Hospital Infection Control (HIC)",
    standardCode: "HIC.3",
    meCode: "HIC.3.a",
    title: "Biomedical waste management per regulatory standards",
    description:
      "Biomedical waste is segregated, transported, treated, and disposed of as per applicable national regulations and standards.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Hospital Infection Control (HIC)",
    standardCode: "HIC.4",
    meCode: "HIC.4.a",
    title: "Surveillance of hospital-associated infections",
    description:
      "Active surveillance is conducted for hospital-associated infections with defined indicators, benchmarking, and trend analysis.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },

  // ─── Chapter 6: Continuous Quality Improvement (CQI) ───
  {
    chapter: "Continuous Quality Improvement (CQI)",
    standardCode: "CQI.1",
    meCode: "CQI.1.a",
    title: "Quality improvement programme with defined indicators",
    description:
      "A hospital-wide quality improvement programme is established with defined quality indicators, targets, and accountability structures.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Continuous Quality Improvement (CQI)",
    standardCode: "CQI.2",
    meCode: "CQI.2.a",
    title: "Incident reporting and adverse event analysis",
    description:
      "A non-punitive incident reporting system captures near misses, adverse events, and sentinel events with root cause analysis.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Continuous Quality Improvement (CQI)",
    standardCode: "CQI.3",
    meCode: "CQI.3.a",
    title: "Patient safety goals monitored and reviewed",
    description:
      "National and international patient safety goals are adopted, monitored quarterly, and reviewed by the quality council.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Continuous Quality Improvement (CQI)",
    standardCode: "CQI.4",
    meCode: "CQI.4.a",
    title: "Clinical audit programme with corrective actions",
    description:
      "Regular clinical audits are conducted with documented findings, corrective actions, and evidence of implementation.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },

  // ─── Chapter 7: Responsibilities of Management (ROM) ───
  {
    chapter: "Responsibilities of Management (ROM)",
    standardCode: "ROM.1",
    meCode: "ROM.1.a",
    title: "Organisational leadership and governance structure",
    description:
      "The governing body, leadership, and management structures are defined with clear roles, responsibilities, and accountability frameworks.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Responsibilities of Management (ROM)",
    standardCode: "ROM.2",
    meCode: "ROM.2.a",
    title: "Strategic and operational planning process",
    description:
      "The organisation has a documented strategic plan with annual operational plans aligned to the mission and vision.",
    evidenceRequired: true,
    riskLevel: "MINOR",
  },
  {
    chapter: "Responsibilities of Management (ROM)",
    standardCode: "ROM.3",
    meCode: "ROM.3.a",
    title: "Budget allocation for quality and safety initiatives",
    description:
      "Dedicated budget is allocated annually for quality improvement, patient safety, and staff training initiatives.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Responsibilities of Management (ROM)",
    standardCode: "ROM.4",
    meCode: "ROM.4.a",
    title: "Ethical framework and compliance mechanism",
    description:
      "An ethics committee exists with documented policies for ethical decision-making, conflict of interest management, and research oversight.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },

  // ─── Chapter 8: Facility Management and Safety (FMS) ───
  {
    chapter: "Facility Management and Safety (FMS)",
    standardCode: "FMS.1",
    meCode: "FMS.1.a",
    title: "Facility inspection and maintenance programme",
    description:
      "A planned preventive maintenance programme covers all physical infrastructure, biomedical equipment, and utility systems.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Facility Management and Safety (FMS)",
    standardCode: "FMS.2",
    meCode: "FMS.2.a",
    title: "Fire safety plan with regular drills",
    description:
      "A comprehensive fire safety plan is in place with fire detection systems, evacuation routes, trained fire wardens, and quarterly drills.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Facility Management and Safety (FMS)",
    standardCode: "FMS.3",
    meCode: "FMS.3.a",
    title: "Disaster and emergency preparedness plan",
    description:
      "A documented disaster and emergency preparedness plan (including mass casualty, epidemic, and natural disaster) is tested annually.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Facility Management and Safety (FMS)",
    standardCode: "FMS.4",
    meCode: "FMS.4.a",
    title: "Safe water, electricity and medical gas supply",
    description:
      "Uninterrupted supply of safe water, reliable electricity with backup, and medical gases is ensured with regular quality testing.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },

  // ─── Chapter 9: Human Resource Management (HRM) ───
  {
    chapter: "Human Resource Management (HRM)",
    standardCode: "HRM.1",
    meCode: "HRM.1.a",
    title: "Staffing plan based on workload and acuity",
    description:
      "Staffing requirements are planned based on patient volume, acuity, and skill-mix requirements across all departments.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Human Resource Management (HRM)",
    standardCode: "HRM.2",
    meCode: "HRM.2.a",
    title: "Credential verification for medical professionals",
    description:
      "Primary source verification of credentials, qualifications, and registration is completed for all medical and nursing staff before granting privileges.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Human Resource Management (HRM)",
    standardCode: "HRM.3",
    meCode: "HRM.3.a",
    title: "Continuous professional development programme",
    description:
      "A structured continuing medical education and professional development programme is available with documented attendance and evaluation.",
    evidenceRequired: true,
    riskLevel: "MINOR",
  },
  {
    chapter: "Human Resource Management (HRM)",
    standardCode: "HRM.4",
    meCode: "HRM.4.a",
    title: "Staff health and safety programme",
    description:
      "An occupational health and safety programme addresses needle-stick injury prevention, vaccination, ergonomics, and workplace hazards.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },

  // ─── Chapter 10: Information Management System (IMS) ───
  {
    chapter: "Information Management System (IMS)",
    standardCode: "IMS.1",
    meCode: "IMS.1.a",
    title: "Integrated health information management system",
    description:
      "An integrated health information management system captures, stores, and retrieves patient and operational data with defined retention policies.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Information Management System (IMS)",
    standardCode: "IMS.2",
    meCode: "IMS.2.a",
    title: "Data security and access control policies",
    description:
      "Data security policies define role-based access controls, audit trails, encryption standards, and breach response procedures for all information systems.",
    evidenceRequired: true,
    riskLevel: "CRITICAL",
  },
  {
    chapter: "Information Management System (IMS)",
    standardCode: "IMS.3",
    meCode: "IMS.3.a",
    title: "Completeness and timeliness of medical records",
    description:
      "Medical records are completed within the defined time frames with documented audits for completeness, legibility, and accuracy.",
    evidenceRequired: true,
    riskLevel: "MAJOR",
  },
  {
    chapter: "Information Management System (IMS)",
    standardCode: "IMS.4",
    meCode: "IMS.4.a",
    title: "Data analytics for clinical and operational decisions",
    description:
      "Data analytics capabilities support clinical outcome tracking, operational efficiency monitoring, and management decision-making.",
    evidenceRequired: false,
    riskLevel: "MINOR",
  },
];

@Injectable()
export class NabhSeedService {
  private readonly logger = new Logger(NabhSeedService.name);

  constructor(private readonly ctx: ComplianceContextService) {}

  /**
   * Seeds the NABH 6th Edition (2025) master template for the given orgId.
   * Idempotent: skips creation if a template with the same name already exists.
   *
   * @returns The created (or existing) template with its item count.
   */
  async seed(orgId: string) {
    const TEMPLATE_NAME = "NABH 6th Edition (2025) — Standard Template";

    // Idempotency check
    const existing = await this.ctx.prisma.nabhTemplate.findFirst({
      where: { orgId, name: TEMPLATE_NAME },
      include: { _count: { select: { items: true } } },
    });

    if (existing) {
      this.logger.log(
        `NABH seed template already exists for org ${orgId} (id=${existing.id}, items=${existing._count.items}). Skipping.`,
      );
      return existing;
    }

    this.logger.log(`Creating NABH 6th Edition seed template for org ${orgId}...`);

    const template = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.nabhTemplate.create({
        data: {
          orgId,
          name: TEMPLATE_NAME,
          isActive: true,
        },
      });

      await tx.nabhTemplateItem.createMany({
        data: NABH_6TH_EDITION_ITEMS.map((item) => ({
          templateId: created.id,
          chapter: item.chapter,
          standardCode: item.standardCode,
          meCode: item.meCode,
          title: item.title,
          description: item.description,
          evidenceRequired: item.evidenceRequired,
          riskLevel: item.riskLevel,
        })),
      });

      return created;
    });

    this.logger.log(
      `NABH seed template created: id=${template.id}, items=${NABH_6TH_EDITION_ITEMS.length}`,
    );

    return {
      ...template,
      _count: { items: NABH_6TH_EDITION_ITEMS.length },
    };
  }

  /**
   * Returns the static item definitions (useful for preview without DB).
   */
  getItemDefinitions(): ReadonlyArray<SeedItem> {
    return NABH_6TH_EDITION_ITEMS;
  }
}
