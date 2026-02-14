"""Compliance AI Help Engine — contextual guidance for the Compliance module.

Powers the AI help system that makes compliance manageable for laypersons:
  - Page-specific contextual help & insights
  - Compliance glossary with plain-English explanations
  - Step-by-step workflow guidance (what to do next)
  - Natural language Q&A about compliance concepts
  - Smart recommendations based on compliance state
"""

from __future__ import annotations

import re
import time
from typing import Any, Literal

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════
# Models
# ═══════════════════════════════════════════════════════════════════════════


class ComplianceHelpTip(BaseModel):
    id: str
    level: Literal["info", "warning", "critical", "success"] = "info"
    title: str
    message: str
    actionLabel: str | None = None
    actionHref: str | None = None


class ComplianceGlossaryEntry(BaseModel):
    term: str
    shortDef: str
    longDef: str
    category: str  # "ABDM" | "NABH" | "Schemes" | "General"
    relatedTerms: list[str] = Field(default_factory=list)


class ComplianceWorkflowStep(BaseModel):
    id: str
    order: int
    label: str
    description: str
    href: str
    status: Literal["done", "current", "upcoming", "blocked"] = "upcoming"
    blockedReason: str | None = None


class ComplianceWhatsNext(BaseModel):
    currentPage: str
    overallProgress: int  # 0-100
    steps: list[ComplianceWorkflowStep] = Field(default_factory=list)
    tips: list[ComplianceHelpTip] = Field(default_factory=list)
    generatedAt: float = 0


class ComplianceChatResponse(BaseModel):
    answer: str
    source: Literal["knowledge_base", "contextual", "ollama"] = "knowledge_base"
    relatedTerms: list[ComplianceGlossaryEntry] = Field(default_factory=list)
    suggestedActions: list[ComplianceHelpTip] = Field(default_factory=list)
    followUp: list[str] = Field(default_factory=list)
    durationMs: int = 0


class CompliancePageHelp(BaseModel):
    """Complete help context for a compliance page."""
    pageId: str
    pageTitle: str
    pageDescription: str
    whatIsThis: str  # Plain-English explanation of the page
    howToUse: list[str]  # Step-by-step instructions
    tips: list[ComplianceHelpTip] = Field(default_factory=list)
    relatedGlossary: list[ComplianceGlossaryEntry] = Field(default_factory=list)
    commonQuestions: list[dict[str, str]] = Field(default_factory=list)  # {q, a}
    generatedAt: float = 0


# ═══════════════════════════════════════════════════════════════════════════
# Glossary Database — Plain-English Compliance Terms
# ═══════════════════════════════════════════════════════════════════════════

COMPLIANCE_GLOSSARY: list[ComplianceGlossaryEntry] = [
    # ── ABDM Terms ──
    ComplianceGlossaryEntry(
        term="ABDM",
        shortDef="India's digital health ecosystem",
        longDef="Ayushman Bharat Digital Mission — India's initiative to create a unified digital health infrastructure. It connects hospitals, patients, and insurance through digital health IDs, facility registries, and professional registries.",
        category="ABDM",
        relatedTerms=["ABHA", "HFR", "HPR"],
    ),
    ComplianceGlossaryEntry(
        term="ABHA",
        shortDef="Patient's digital health ID (14-digit)",
        longDef="Ayushman Bharat Health Account — A 14-digit unique ID given to every patient in India's digital health ecosystem. Like an Aadhaar for health records. Your hospital needs ABHA integration to participate in ABDM.",
        category="ABDM",
        relatedTerms=["ABDM", "HFR"],
    ),
    ComplianceGlossaryEntry(
        term="HFR",
        shortDef="Your hospital's digital ID card",
        longDef="Health Facility Registry — Think of it as your hospital's profile in the national directory. It lists your hospital's name, address, specialties, and services. Every hospital must register in HFR to be part of ABDM.",
        category="ABDM",
        relatedTerms=["ABDM", "ABHA", "HPR"],
    ),
    ComplianceGlossaryEntry(
        term="HPR",
        shortDef="Doctor/nurse digital ID registry",
        longDef="Healthcare Professionals Registry — A national database of all doctors, nurses, and healthcare workers. Linking your staff to HPR verifies their credentials digitally and enables them to sign digital prescriptions.",
        category="ABDM",
        relatedTerms=["ABDM", "HFR"],
    ),
    ComplianceGlossaryEntry(
        term="Sandbox",
        shortDef="Test environment (not real data)",
        longDef="A testing environment where you can try ABDM integration without affecting real patient data. Always test in Sandbox first before switching to Production. Mistakes in Sandbox have zero real-world consequences.",
        category="ABDM",
        relatedTerms=["ABHA", "Production"],
    ),

    # ── NABH Terms ──
    ComplianceGlossaryEntry(
        term="NABH",
        shortDef="Hospital quality certification body",
        longDef="National Accreditation Board for Hospitals & Healthcare Providers — India's hospital quality certifier under QCI. NABH accreditation proves your hospital meets national quality standards. It's like an ISO certification but specifically for hospitals.",
        category="NABH",
        relatedTerms=["NABH 6th Edition", "Chapter", "CAPA"],
    ),
    ComplianceGlossaryEntry(
        term="NABH 6th Edition",
        shortDef="Latest hospital quality standards",
        longDef="The newest version of NABH standards organized into 10 chapters covering everything from patient rights to infection control. Each chapter has specific checkpoints your hospital must meet. This is what assessors will check during accreditation.",
        category="NABH",
        relatedTerms=["NABH", "Chapter", "Assessment"],
    ),
    ComplianceGlossaryEntry(
        term="Chapter",
        shortDef="A group of related quality standards",
        longDef="NABH organizes its standards into 10 chapters (e.g., Access & Assessment, Patient Rights, Infection Control). Each chapter contains multiple items that need to be verified. Think of chapters as categories of quality checks.",
        category="NABH",
        relatedTerms=["NABH", "Objective Element", "Standard"],
    ),
    ComplianceGlossaryEntry(
        term="CAPA",
        shortDef="Plan to fix a quality issue",
        longDef="Corrective and Preventive Action — When an audit finding identifies a problem, CAPA is your documented plan to fix it (Corrective = fix the problem now, Preventive = prevent it from happening again). It's like a formal action plan with deadlines.",
        category="NABH",
        relatedTerms=["Finding", "Audit Cycle", "Non-Conformity"],
    ),
    ComplianceGlossaryEntry(
        term="Finding",
        shortDef="A problem discovered during an audit",
        longDef="When an auditor checks your hospital against NABH standards, any gap or issue they identify is called a 'finding'. Findings can be Major (serious, needs immediate action), Minor (small issue, fix within timeline), or Observation (suggestion for improvement).",
        category="NABH",
        relatedTerms=["CAPA", "Audit Cycle", "Non-Conformity"],
    ),
    ComplianceGlossaryEntry(
        term="Audit Cycle",
        shortDef="A scheduled quality review period",
        longDef="A formal period during which your hospital's compliance is reviewed against NABH standards. This can be an internal audit (your team checks) or external audit (NABH assessors check). Each cycle produces findings that need CAPA.",
        category="NABH",
        relatedTerms=["Finding", "CAPA", "NABH"],
    ),
    ComplianceGlossaryEntry(
        term="Non-Conformity",
        shortDef="Failure to meet a standard",
        longDef="When your hospital doesn't meet a specific NABH requirement, it's called a non-conformity. Major non-conformities can block accreditation. Minor ones need to be fixed within a given timeline.",
        category="NABH",
        relatedTerms=["Finding", "CAPA"],
    ),

    # ── Government Scheme Terms ──
    ComplianceGlossaryEntry(
        term="PMJAY",
        shortDef="Free healthcare for 50cr+ Indians",
        longDef="Pradhan Mantri Jan Arogya Yojana (Ayushman Bharat) — India's largest government health insurance scheme covering 50+ crore beneficiaries. If your hospital is empaneled under PMJAY, eligible patients get cashless treatment and the government pays your hospital.",
        category="Schemes",
        relatedTerms=["Empanelment", "Rate Card", "SHA"],
    ),
    ComplianceGlossaryEntry(
        term="CGHS",
        shortDef="Central govt employee health scheme",
        longDef="Central Government Health Scheme — Health coverage for central government employees, pensioners, and their dependents. If your hospital is empaneled under CGHS, these patients can get cashless treatment at your facility.",
        category="Schemes",
        relatedTerms=["Empanelment", "Rate Card", "City Category"],
    ),
    ComplianceGlossaryEntry(
        term="ECHS",
        shortDef="Ex-servicemen health scheme",
        longDef="Ex-Servicemen Contributory Health Scheme — Health coverage for retired armed forces personnel and their dependents. Similar to CGHS but specifically for defense veterans.",
        category="Schemes",
        relatedTerms=["Empanelment", "Rate Card"],
    ),
    ComplianceGlossaryEntry(
        term="Empanelment",
        shortDef="Govt approval to treat scheme patients",
        longDef="Getting your hospital officially approved/listed under a government scheme (PMJAY, CGHS, ECHS). Once empaneled, you can treat patients under that scheme and receive payments from the government. Think of it as getting a license to participate.",
        category="Schemes",
        relatedTerms=["PMJAY", "CGHS", "ECHS", "Rate Card"],
    ),
    ComplianceGlossaryEntry(
        term="Rate Card",
        shortDef="Government's price list for treatments",
        longDef="A standardized price list set by the government for each treatment/procedure under a scheme. These are the maximum amounts the government will pay your hospital. You cannot charge patients more than the rate card amount for scheme-covered treatments.",
        category="Schemes",
        relatedTerms=["Empanelment", "Package", "Mapping"],
    ),
    ComplianceGlossaryEntry(
        term="SHA Code",
        shortDef="State Health Authority procedure code",
        longDef="State Health Authority Code — Each PMJAY procedure has a unique code assigned by the State Health Authority. You need to map your internal service codes to these SHA codes for billing under PMJAY.",
        category="Schemes",
        relatedTerms=["PMJAY", "Rate Card", "Mapping"],
    ),
    ComplianceGlossaryEntry(
        term="Mapping",
        shortDef="Linking your codes to government codes",
        longDef="The process of connecting your hospital's internal procedure/service codes with the government scheme's codes. For example, your 'Knee Replacement' service needs to be mapped to the PMJAY SHA code for knee replacement. Without mapping, you can't bill correctly.",
        category="Schemes",
        relatedTerms=["Rate Card", "SHA Code", "Empanelment"],
    ),

    # ── General Compliance Terms ──
    ComplianceGlossaryEntry(
        term="Workspace",
        shortDef="Your compliance project container",
        longDef="A compliance workspace is like a folder that groups all your compliance work together. It holds your ABDM config, scheme settings, NABH checklists, and evidence. You typically have one workspace per branch. Always start by creating or selecting a workspace.",
        category="General",
        relatedTerms=["Branch", "Evidence"],
    ),
    ComplianceGlossaryEntry(
        term="Evidence",
        shortDef="Proof documents (licenses, certificates, etc.)",
        longDef="Documents that prove your hospital meets compliance requirements. Examples: hospital registration certificate, fire NOC, biomedical waste license, staff qualification certificates. These are uploaded to the Evidence Vault and linked to specific compliance items.",
        category="General",
        relatedTerms=["Evidence Vault", "NABH", "Expiry"],
    ),
    ComplianceGlossaryEntry(
        term="Evidence Vault",
        shortDef="Secure storage for compliance documents",
        longDef="A central, organized repository for all your compliance evidence documents. Upload once, link to multiple compliance items. The vault tracks expiry dates and alerts you before documents expire.",
        category="General",
        relatedTerms=["Evidence", "Workspace"],
    ),
    ComplianceGlossaryEntry(
        term="Maker-Checker",
        shortDef="Two-person approval for sensitive changes",
        longDef="A control mechanism where one person creates/requests a change (Maker) and another person reviews and approves it (Checker). This prevents unauthorized changes to compliance-critical data. For example, changing a rate card needs approval.",
        category="General",
        relatedTerms=["Approval", "RBAC"],
    ),
    ComplianceGlossaryEntry(
        term="Validator",
        shortDef="Automated readiness checker",
        longDef="The Go-Live Validator runs automated checks across all compliance areas (ABDM, Schemes, NABH, Evidence) and tells you what's ready and what still needs work. It gives you a readiness score and lists any blocking issues that must be fixed.",
        category="General",
        relatedTerms=["Readiness Score", "Blocking Gap"],
    ),
    ComplianceGlossaryEntry(
        term="Blocking Gap",
        shortDef="Must-fix issue before going live",
        longDef="A critical compliance issue that must be resolved before your hospital can go live. For example: HFR not registered, no active PMJAY empanelment, expired fire safety certificate. These appear as red items in the Validator.",
        category="General",
        relatedTerms=["Validator", "Warning"],
    ),
    ComplianceGlossaryEntry(
        term="Readiness Score",
        shortDef="How ready you are (0-100%)",
        longDef="A composite score from the Validator that shows how close your hospital is to full compliance. It weighs NABH (40%), Schemes (25%), ABDM (20%), and Evidence (15%). Score above 80 with zero blocking gaps means you're ready to go live.",
        category="General",
        relatedTerms=["Validator", "Blocking Gap"],
    ),
]

_GLOSSARY_BY_TERM = {g.term.lower(): g for g in COMPLIANCE_GLOSSARY}
_GLOSSARY_BY_TERM.update({g.shortDef.lower(): g for g in COMPLIANCE_GLOSSARY})


# ═══════════════════════════════════════════════════════════════════════════
# Page Help Database — What each page does + how to use it
# ═══════════════════════════════════════════════════════════════════════════

_PAGE_HELP: dict[str, dict[str, Any]] = {
    "compliance-dashboard": {
        "title": "Compliance Dashboard",
        "description": "Central overview of your hospital's compliance status",
        "whatIsThis": "This is your compliance command center. It shows a quick summary of your compliance status across all areas — workspaces, pending approvals, expiring documents, and audit cycles. Think of it as a health check for your hospital's regulatory compliance.",
        "howToUse": [
            "Check the stat boxes at the top for a quick overview",
            "Click on any card to go to that specific compliance area",
            "Use 'Run Validator' to get a detailed compliance readiness check",
            "Follow the 'Recommended Setup Order' at the bottom if you're starting fresh",
        ],
        "commonQuestions": [
            {"q": "Where do I start?", "a": "Start by creating a Workspace, then follow the recommended order: ABDM → Schemes → NABH → Evidence → Validator."},
            {"q": "What does each number mean?", "a": "Workspaces = your compliance projects, Approvals = changes waiting for review, Evidence = documents expiring in 30 days, Audit Cycles = active quality audits."},
        ],
        "glossaryTerms": ["Workspace", "Validator", "Evidence", "ABDM", "NABH"],
    },
    "compliance-workspaces": {
        "title": "Compliance Workspaces",
        "description": "Manage your compliance project containers",
        "whatIsThis": "A workspace is like a project folder for compliance. Each branch needs its own workspace. The workspace holds all your compliance configurations — ABDM settings, scheme enrollments, NABH checklists, and linked evidence. Start here before anything else.",
        "howToUse": [
            "Click 'Create Workspace' to start a new compliance project",
            "Give it a meaningful name (e.g., 'Main Hospital 2024 Compliance')",
            "Select the branch this workspace belongs to",
            "Once created, configure ABDM, Schemes, and NABH from the workspace",
            "Change status to ACTIVE when the workspace is fully configured",
        ],
        "commonQuestions": [
            {"q": "How many workspaces do I need?", "a": "Usually one per branch. If you have multiple hospital locations, each needs its own workspace."},
            {"q": "What's the difference between DRAFT and ACTIVE?", "a": "DRAFT means you're still setting things up. ACTIVE means the workspace is configured and being used. Only ACTIVE workspaces count for compliance checks."},
            {"q": "Can I clone a workspace?", "a": "Yes! Use the Clone button to copy a workspace template to a new branch. This saves time when setting up similar branches."},
        ],
        "glossaryTerms": ["Workspace", "Branch"],
    },
    "compliance-evidence": {
        "title": "Evidence Vault",
        "description": "Upload and manage compliance proof documents",
        "whatIsThis": "The Evidence Vault is your secure document storage for all compliance-related files. Upload certificates, licenses, NOCs, and other proof documents here. These documents can be linked to NABH checklist items, scheme requirements, or any compliance item that needs evidence.",
        "howToUse": [
            "Click 'Upload Evidence' to add a new document",
            "Fill in the title, select the document type, and set the expiry date",
            "Upload the PDF, JPG, or PNG file (max 5MB)",
            "After uploading, link the evidence to the relevant compliance items",
            "Check the 'Expiring Soon' filter regularly to renew documents before they expire",
        ],
        "commonQuestions": [
            {"q": "What documents should I upload?", "a": "Hospital registration, fire NOC, biomedical waste authorization, AERB license (if radiology), staff qualification certificates, insurance certificates, and any other regulatory documents."},
            {"q": "What happens when evidence expires?", "a": "Expired evidence shows as a blocking gap in the Validator. You'll get warnings 30 days before expiry. Upload the renewed document and link it to replace the expired one."},
            {"q": "How do I link evidence to a NABH item?", "a": "Open the evidence detail page, click 'Link to Entity', then select the NABH checklist item. One document can be linked to multiple items."},
        ],
        "glossaryTerms": ["Evidence", "Evidence Vault", "Blocking Gap"],
    },
    "compliance-approvals": {
        "title": "Approvals (Maker-Checker)",
        "description": "Review and approve compliance changes",
        "whatIsThis": "The approvals page shows all pending compliance changes that need a second person's review. This is the 'Maker-Checker' system — when someone makes a sensitive change (like updating a rate card or ABDM config), it comes here for approval before taking effect. This prevents accidental or unauthorized changes.",
        "howToUse": [
            "Review the 'Pending' tab for items awaiting your approval",
            "Click on any item to see the full details and proposed changes",
            "Click 'Approve' to accept or 'Reject' with a reason to decline",
            "Check the 'History' tab to see past approval decisions",
        ],
        "commonQuestions": [
            {"q": "Who can approve?", "a": "Users with the COMPLIANCE_APPROVAL_DECIDE permission. Typically this is the compliance officer or hospital administrator. The person who made the change cannot approve their own request."},
            {"q": "What happens if I reject?", "a": "The change is discarded and the maker is notified. They can submit a revised request if needed."},
        ],
        "glossaryTerms": ["Maker-Checker", "Approval"],
    },
    "compliance-abdm": {
        "title": "ABDM Configuration",
        "description": "Set up India's digital health integration",
        "whatIsThis": "ABDM (Ayushman Bharat Digital Mission) is India's digital health ecosystem. This page helps you configure your hospital's connection to ABDM — including ABHA (patient health IDs), HFR (your hospital's digital profile), and HPR (your staff's digital credentials). Think of it as registering your hospital in India's digital health network.",
        "howToUse": [
            "Start with ABHA Config — set up your client ID and secret (from ABDM portal)",
            "Test the connection in Sandbox mode first before going to Production",
            "Fill out your HFR Profile completely — this is your hospital's public profile",
            "Link your doctors and nurses to HPR for digital credential verification",
        ],
        "commonQuestions": [
            {"q": "Is ABDM mandatory?", "a": "Yes, ABDM integration is increasingly required for government empanelment and for NABH accreditation. Start with Sandbox testing, then go live when ready."},
            {"q": "Where do I get ABHA client ID?", "a": "Register at the ABDM Sandbox Portal (sandbox.abdm.gov.in) to get test credentials. For production, apply through the NHA portal."},
            {"q": "What's the difference between Sandbox and Production?", "a": "Sandbox is a safe testing area with fake data. Production connects to real ABDM systems. Always test in Sandbox first!"},
        ],
        "glossaryTerms": ["ABDM", "ABHA", "HFR", "HPR", "Sandbox"],
    },
    "compliance-abdm-abha": {
        "title": "ABHA Configuration",
        "description": "Patient health ID integration settings",
        "whatIsThis": "ABHA (Ayushman Bharat Health Account) is a 14-digit unique health ID for every patient. This page configures your hospital's ABHA integration — the credentials and settings needed to create, verify, and link patient ABHA IDs during registration.",
        "howToUse": [
            "Enter your ABHA Client ID and Client Secret (from ABDM portal)",
            "Select the environment — Sandbox for testing, Production for live",
            "Enable/disable feature toggles (ABHA creation, verification, linking)",
            "Click 'Test Connection' to verify your credentials work",
            "Save the configuration once the test passes",
        ],
        "commonQuestions": [
            {"q": "What if the test fails?", "a": "Check that your client ID and secret are correct. Make sure you're using the right environment (Sandbox credentials won't work in Production and vice versa)."},
        ],
        "glossaryTerms": ["ABHA", "ABDM", "Sandbox"],
    },
    "compliance-abdm-hfr": {
        "title": "HFR Profile",
        "description": "Your hospital's digital identity",
        "whatIsThis": "HFR (Health Facility Registry) is your hospital's digital profile in the national directory. Fill in your hospital's details — name, address, specialties, ownership, beds, etc. A complete HFR profile is required for ABDM integration and improves your Validator score.",
        "howToUse": [
            "Fill in all fields — the completeness bar shows your progress",
            "Required fields: Facility name, type, ownership, address, specialties",
            "Click 'Validate' to check if your profile meets ABDM requirements",
            "Click 'Verify' to submit for ABDM verification once complete",
        ],
        "commonQuestions": [
            {"q": "What's the completeness bar?", "a": "It shows what percentage of HFR fields you've filled. Aim for 100%. Incomplete profiles block ABDM integration."},
        ],
        "glossaryTerms": ["HFR", "ABDM"],
    },
    "compliance-abdm-hpr": {
        "title": "HPR Linkage",
        "description": "Link staff to the national healthcare professional registry",
        "whatIsThis": "HPR (Healthcare Professionals Registry) is a national database of all healthcare workers. This page lets you link your doctors, nurses, and other staff to their HPR IDs. This verifies their credentials digitally and enables features like digital prescriptions.",
        "howToUse": [
            "View the list of staff that need HPR linkage",
            "Click 'Link' next to a staff member to enter their HPR ID",
            "Use 'Bulk Import' to upload a CSV file for multiple staff at once",
            "Click 'Verify' to confirm the HPR link with the national registry",
        ],
        "commonQuestions": [
            {"q": "Where do staff get their HPR ID?", "a": "Healthcare professionals register individually at hpr.abdm.gov.in. Once they have their HPR ID, you can link it here."},
            {"q": "What's Bulk Import?", "a": "Instead of linking one-by-one, prepare a CSV file with staff names and HPR IDs, and upload it to link everyone at once."},
        ],
        "glossaryTerms": ["HPR", "ABDM", "Bulk Import"],
    },
    "compliance-schemes": {
        "title": "Government Schemes",
        "description": "Manage PMJAY, CGHS, ECHS empanelment",
        "whatIsThis": "This page manages your hospital's participation in government health insurance schemes. India has several major schemes — PMJAY (for economically weaker sections), CGHS (for central govt employees), and ECHS (for ex-servicemen). Being empaneled means you can treat these patients and get paid by the government.",
        "howToUse": [
            "Click on a scheme (PMJAY, CGHS, or ECHS) to configure it",
            "For each scheme: enter your empanelment details (registration number, dates)",
            "Set up rate cards with the government's approved prices",
            "Map your internal service codes to the scheme's codes",
            "Use the 'Mappings' section to connect your services to scheme codes",
        ],
        "commonQuestions": [
            {"q": "Do I need all three schemes?", "a": "No, only empanel under schemes relevant to your patient population. PMJAY is most common. CGHS is useful if you're near government offices. ECHS if near military areas."},
            {"q": "What's mapping?", "a": "Mapping connects your internal procedure codes to the government's codes. Without mapping, you can't bill correctly under the scheme."},
        ],
        "glossaryTerms": ["PMJAY", "CGHS", "ECHS", "Empanelment", "Rate Card", "Mapping"],
    },
    "compliance-schemes-pmjay": {
        "title": "PMJAY Configuration",
        "description": "Ayushman Bharat scheme setup",
        "whatIsThis": "PMJAY (Pradhan Mantri Jan Arogya Yojana) provides health coverage to 50+ crore Indians. Configure your hospital's PMJAY empanelment here — including empanelment number, SHA code, rate cards, and service mappings.",
        "howToUse": [
            "Enter your PMJAY empanelment number and validity dates",
            "Set up the SHA (State Health Authority) code for your state",
            "Create rate cards with PMJAY-approved treatment prices",
            "Map your hospital's services to PMJAY package codes",
        ],
        "commonQuestions": [
            {"q": "Where do I get the empanelment number?", "a": "You get this when your hospital is approved by the State Health Authority (SHA). Apply through the PMJAY portal or contact your state's SHA office."},
        ],
        "glossaryTerms": ["PMJAY", "SHA Code", "Empanelment", "Rate Card"],
    },
    "compliance-schemes-cghs": {
        "title": "CGHS Configuration",
        "description": "Central govt employee health scheme setup",
        "whatIsThis": "CGHS (Central Government Health Scheme) provides health coverage to central government employees and pensioners. Configure your hospital's CGHS empanelment, city category, and rate cards here.",
        "howToUse": [
            "Enter your CGHS empanelment number and validity dates",
            "Select your city category (this determines the rate card applicable)",
            "Upload or create the CGHS rate card for your city category",
        ],
        "commonQuestions": [
            {"q": "What's a city category?", "a": "CGHS has different rate cards based on city category (A, B, C). Metro cities are usually Category A with higher rates."},
        ],
        "glossaryTerms": ["CGHS", "Empanelment", "Rate Card"],
    },
    "compliance-schemes-echs": {
        "title": "ECHS Configuration",
        "description": "Ex-servicemen health scheme setup",
        "whatIsThis": "ECHS (Ex-Servicemen Contributory Health Scheme) covers retired defense personnel. Configure your empanelment details here.",
        "howToUse": [
            "Enter your ECHS empanelment number and validity dates",
            "Set up the ECHS rate card",
            "Map your services to ECHS-approved procedure list",
        ],
        "glossaryTerms": ["ECHS", "Empanelment", "Rate Card"],
    },
    "compliance-schemes-mapping": {
        "title": "Service Mapping",
        "description": "Link your services to government scheme codes",
        "whatIsThis": "Mapping connects your hospital's internal service/procedure codes to the government scheme's codes. This is essential for correct billing. Without proper mapping, claims under PMJAY/CGHS/ECHS will be rejected.",
        "howToUse": [
            "View the list of your services and their current mapping status",
            "Click 'Map' next to unmapped services to assign scheme codes",
            "Use the 'Unmapped Only' filter to focus on services that still need mapping",
            "Use 'Auto-Suggest' to let the system recommend likely matches",
            "Review and confirm each suggested mapping",
        ],
        "commonQuestions": [
            {"q": "What happens with unmapped services?", "a": "Unmapped services cannot be billed under government schemes. The Validator flags unmapped services as warnings (>20% unmapped triggers a warning)."},
        ],
        "glossaryTerms": ["Mapping", "Rate Card", "SHA Code"],
    },
    "compliance-nabh": {
        "title": "NABH Readiness",
        "description": "Hospital quality accreditation management",
        "whatIsThis": "NABH (National Accreditation Board for Hospitals) accreditation proves your hospital meets national quality standards. This page shows your readiness across all 10 NABH chapters, including a completion chart, risk heatmap, and quick access to checklists and audits.",
        "howToUse": [
            "Review the chapter completion chart to see your overall progress",
            "Click into each chapter to see its checklist items",
            "Use the Checklist page to work through items one by one",
            "Start an Audit Cycle when you're ready for a formal quality review",
            "Address any Findings with CAPA (corrective action plans)",
        ],
        "commonQuestions": [
            {"q": "How long does NABH accreditation take?", "a": "Typically 6-12 months of preparation, depending on your hospital's current state. The checklist helps you track progress systematically."},
            {"q": "What are the 10 chapters?", "a": "Access & Assessment, Care of Patients, Patient Rights, Infection Control, Management of Medication, Hospital Infection Control, Quality Improvement, Responsibilities of Management, Facility Management & Safety, and Human Resource Management."},
        ],
        "glossaryTerms": ["NABH", "NABH 6th Edition", "Chapter", "CAPA", "Finding", "Audit Cycle"],
    },
    "compliance-nabh-checklist": {
        "title": "NABH Checklist",
        "description": "Chapter-by-chapter quality requirements",
        "whatIsThis": "The NABH Checklist breaks down all quality requirements into 10 chapters with individual items. Each item has a status (Not Started, In Progress, Compliant, Non-Compliant) and can have evidence linked to it. Work through items systematically to prepare for accreditation.",
        "howToUse": [
            "Select a chapter tab to view its items",
            "Click an item to see its details, requirements, and status",
            "Update the status as you work through each item",
            "Link evidence documents from the Evidence Vault",
            "Assign items to responsible staff members",
            "Use the 'Verify' button when an item is ready for review",
        ],
        "commonQuestions": [
            {"q": "What does 'Verify' do?", "a": "Verify marks an item as independently reviewed and confirmed compliant. Only users with verify permission can do this. It's a quality control step."},
            {"q": "Do all items need evidence?", "a": "Not all, but many do. Items that require evidence are marked. The Validator flags items missing required evidence as warnings."},
        ],
        "glossaryTerms": ["NABH", "Chapter", "Evidence", "Non-Conformity"],
    },
    "compliance-nabh-audits": {
        "title": "NABH Audit Cycles",
        "description": "Manage quality audit rounds",
        "whatIsThis": "Audit Cycles are formal quality review periods. You create a cycle, conduct reviews against NABH standards, record findings, and create CAPAs to fix any issues. Run internal audits regularly to prepare for the external NABH assessment.",
        "howToUse": [
            "Click 'Create Audit Cycle' to start a new review period",
            "Set the audit scope (which chapters/areas to review)",
            "During the audit, add findings for any issues discovered",
            "For each finding, create a CAPA with an action plan and deadline",
            "Close the audit cycle when all findings are addressed",
        ],
        "glossaryTerms": ["Audit Cycle", "Finding", "CAPA", "NABH"],
    },
    "compliance-validator": {
        "title": "Go-Live Validator",
        "description": "Automated compliance readiness checker",
        "whatIsThis": "The Validator automatically checks your entire compliance setup and tells you exactly what's ready and what needs work. It runs checks across ABDM, Government Schemes, NABH, and Evidence, producing a readiness score and a list of any issues that need to be fixed.",
        "howToUse": [
            "Click 'Run Validator' to start a fresh compliance check",
            "Review your Readiness Score (aim for 80+ with zero blocking gaps)",
            "Red items (Blocking) must be fixed before going live",
            "Orange items (Warnings) should be addressed but aren't mandatory",
            "Click on any issue to navigate to the page where you can fix it",
            "Re-run the Validator after making fixes to see updated results",
        ],
        "commonQuestions": [
            {"q": "What score do I need?", "a": "Aim for 80+ with zero blocking gaps. The score is weighted: NABH (40%), Schemes (25%), ABDM (20%), Evidence (15%)."},
            {"q": "How often should I run the validator?", "a": "After every major configuration change. At minimum, weekly during setup. Daily as you approach go-live."},
        ],
        "glossaryTerms": ["Validator", "Readiness Score", "Blocking Gap"],
    },
    "compliance-audit-log": {
        "title": "Compliance Audit Log",
        "description": "Immutable record of all compliance changes",
        "whatIsThis": "The Audit Log is an unchangeable record of every action taken in the compliance module. Every configuration change, approval, upload, and status update is logged here with who did it, when, and what changed. This provides an audit trail for regulatory inspectors.",
        "howToUse": [
            "Use filters to narrow down by entity type, action, or date range",
            "Click on a log entry to see the before/after details of a change",
            "Export the log if needed for regulatory review",
        ],
        "commonQuestions": [
            {"q": "Can entries be deleted?", "a": "No. The audit log is immutable — entries cannot be modified or deleted. This is by design for regulatory compliance."},
        ],
        "glossaryTerms": ["Maker-Checker"],
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# Workflow Steps — What-To-Do-Next Engine
# ═══════════════════════════════════════════════════════════════════════════


def compute_workflow_steps(compliance_state: dict[str, Any]) -> list[ComplianceWorkflowStep]:
    """Compute setup workflow steps based on current compliance state.

    compliance_state expected keys:
      hasWorkspace, workspaceStatus, hasAbhaConfig, hfrCompleteness,
      hprLinked, pmjayActive, cghsActive, echsActive, unmappedPercent,
      nabhProgress, evidenceCount, evidenceExpiring, validatorScore,
      hasBlockingGaps
    """
    steps: list[ComplianceWorkflowStep] = []
    s = compliance_state

    # Step 1: Create Workspace
    ws_status = "done" if s.get("hasWorkspace") else "current"
    steps.append(ComplianceWorkflowStep(
        id="create-workspace",
        order=1,
        label="Create Compliance Workspace",
        description="Create a workspace to organize all your compliance work for this branch.",
        href="/compliance/workspaces",
        status=ws_status,
    ))

    # Step 2: Configure ABDM
    if not s.get("hasWorkspace"):
        abdm_status = "upcoming"
    elif s.get("hasAbhaConfig") and (s.get("hfrCompleteness", 0) >= 80):
        abdm_status = "done"
    elif s.get("hasAbhaConfig") or (s.get("hfrCompleteness", 0) > 0):
        abdm_status = "current"
    else:
        abdm_status = "current" if ws_status == "done" else "upcoming"
    steps.append(ComplianceWorkflowStep(
        id="configure-abdm",
        order=2,
        label="Set Up ABDM Integration",
        description="Configure ABHA, register your HFR profile, and link staff to HPR.",
        href="/compliance/abdm",
        status=abdm_status,
    ))

    # Step 3: Government Schemes
    has_any_scheme = s.get("pmjayActive") or s.get("cghsActive") or s.get("echsActive")
    if not s.get("hasWorkspace"):
        scheme_status = "upcoming"
    elif has_any_scheme and s.get("unmappedPercent", 100) < 20:
        scheme_status = "done"
    elif has_any_scheme:
        scheme_status = "current"
    else:
        scheme_status = "current" if abdm_status == "done" else "upcoming"
    steps.append(ComplianceWorkflowStep(
        id="setup-schemes",
        order=3,
        label="Configure Government Schemes",
        description="Set up PMJAY/CGHS/ECHS empanelment, rate cards, and service mappings.",
        href="/compliance/schemes",
        status=scheme_status,
    ))

    # Step 4: Upload Evidence
    has_evidence = (s.get("evidenceCount", 0) >= 5)
    if not s.get("hasWorkspace"):
        ev_status = "upcoming"
    elif has_evidence:
        ev_status = "done"
    else:
        ev_status = "current" if (abdm_status == "done" or scheme_status in ("done", "current")) else "upcoming"
    steps.append(ComplianceWorkflowStep(
        id="upload-evidence",
        order=4,
        label="Upload Evidence Documents",
        description="Upload certificates, licenses, and proof documents to the Evidence Vault.",
        href="/compliance/evidence",
        status=ev_status,
    ))

    # Step 5: NABH Checklist
    nabh_progress = s.get("nabhProgress", 0)
    if not s.get("hasWorkspace"):
        nabh_status = "upcoming"
    elif nabh_progress >= 80:
        nabh_status = "done"
    elif nabh_progress > 0:
        nabh_status = "current"
    else:
        nabh_status = "current" if has_evidence else "upcoming"
    steps.append(ComplianceWorkflowStep(
        id="nabh-checklist",
        order=5,
        label="Complete NABH Checklist",
        description="Work through the 10-chapter NABH checklist and link evidence to each item.",
        href="/compliance/nabh/checklist",
        status=nabh_status,
    ))

    # Step 6: Run Validator
    validator_score = s.get("validatorScore", 0)
    has_blocking = s.get("hasBlockingGaps", True)
    if validator_score >= 80 and not has_blocking:
        val_status = "done"
    elif nabh_progress >= 50 or has_any_scheme:
        val_status = "current"
    else:
        val_status = "upcoming"
    steps.append(ComplianceWorkflowStep(
        id="run-validator",
        order=6,
        label="Run Go-Live Validator",
        description="Check compliance readiness across all areas. Fix any blocking gaps.",
        href="/compliance/validator",
        status=val_status,
    ))

    # Step 7: Activate & Go Live
    if validator_score >= 80 and not has_blocking and s.get("workspaceStatus") == "ACTIVE":
        live_status = "done"
    elif validator_score >= 80 and not has_blocking:
        live_status = "current"
    else:
        live_status = "upcoming"
        if has_blocking:
            steps.append(ComplianceWorkflowStep(
                id="go-live",
                order=7,
                label="Activate & Go Live",
                description="Activate your workspace and go live with full compliance.",
                href="/compliance/workspaces",
                status="blocked",
                blockedReason="Fix all blocking gaps in the Validator first.",
            ))
            return steps

    steps.append(ComplianceWorkflowStep(
        id="go-live",
        order=7,
        label="Activate & Go Live",
        description="Activate your workspace and go live with full compliance.",
        href="/compliance/workspaces",
        status=live_status,
    ))

    return steps


# ═══════════════════════════════════════════════════════════════════════════
# Page Help Generator
# ═══════════════════════════════════════════════════════════════════════════


def get_page_help(page_id: str) -> CompliancePageHelp:
    """Get complete help context for a compliance page."""
    help_data = _PAGE_HELP.get(page_id, {})
    if not help_data:
        return CompliancePageHelp(
            pageId=page_id,
            pageTitle="Compliance",
            pageDescription="Compliance module",
            whatIsThis="This is a page in the Compliance module. Use the navigation to explore different compliance areas.",
            howToUse=["Navigate using the sidebar to explore compliance features."],
            generatedAt=time.time(),
        )

    # Resolve glossary terms
    glossary_terms = help_data.get("glossaryTerms", [])
    related_glossary = [
        g for g in COMPLIANCE_GLOSSARY
        if g.term in glossary_terms
    ]

    return CompliancePageHelp(
        pageId=page_id,
        pageTitle=help_data.get("title", ""),
        pageDescription=help_data.get("description", ""),
        whatIsThis=help_data.get("whatIsThis", ""),
        howToUse=help_data.get("howToUse", []),
        relatedGlossary=related_glossary,
        commonQuestions=help_data.get("commonQuestions", []),
        generatedAt=time.time(),
    )


# ═══════════════════════════════════════════════════════════════════════════
# Compliance Chat Q&A — keyword-based answers about compliance
# ═══════════════════════════════════════════════════════════════════════════


def answer_compliance_question(
    question: str,
    page_context: str | None = None,
    compliance_state: dict[str, Any] | None = None,
) -> ComplianceChatResponse:
    """Answer a compliance question using the knowledge base."""
    start = time.time()
    q = question.lower().strip()

    def ms() -> int:
        return int((time.time() - start) * 1000)

    # ── Glossary lookups ──
    for entry in COMPLIANCE_GLOSSARY:
        term_lower = entry.term.lower()
        if re.search(rf"\bwhat\s+is\s+{re.escape(term_lower)}\b", q) or \
           re.search(rf"\bwhat\s+does\s+{re.escape(term_lower)}\s+mean\b", q) or \
           re.search(rf"\bexplain\s+{re.escape(term_lower)}\b", q) or \
           re.search(rf"\bdefine\s+{re.escape(term_lower)}\b", q) or \
           re.search(rf"\btell\s+me\s+about\s+{re.escape(term_lower)}\b", q):
            related = [g for g in COMPLIANCE_GLOSSARY if g.term in entry.relatedTerms]
            return ComplianceChatResponse(
                answer=f"**{entry.term}** — {entry.longDef}",
                source="knowledge_base",
                relatedTerms=related[:3],
                followUp=[f"What is {t}?" for t in entry.relatedTerms[:3]],
                durationMs=ms(),
            )

    # ── "Where do I start" / "How to begin" ──
    if re.search(r"where.*(start|begin)|how.*(start|begin)|what.*(first|start)|getting started", q):
        return ComplianceChatResponse(
            answer="**Getting Started with Compliance:**\n\n"
                   "1. **Create a Workspace** — Go to Workspaces and create one for your branch\n"
                   "2. **Configure ABDM** — Set up ABHA, HFR profile, and HPR links\n"
                   "3. **Set Up Schemes** — Configure PMJAY/CGHS/ECHS if applicable\n"
                   "4. **Upload Evidence** — Upload certificates and licenses to the Evidence Vault\n"
                   "5. **Complete NABH Checklist** — Work through all 10 chapters\n"
                   "6. **Run Validator** — Check your readiness score\n"
                   "7. **Go Live** — Activate once score is 80+ with no blocking gaps",
            source="knowledge_base",
            suggestedActions=[
                ComplianceHelpTip(id="start-ws", level="info", title="Start Here",
                                  message="Create your first compliance workspace",
                                  actionLabel="Create Workspace", actionHref="/compliance/workspaces"),
            ],
            followUp=[
                "What is ABDM?",
                "What is NABH?",
                "What documents do I need?",
            ],
            durationMs=ms(),
        )

    # ── "What documents do I need" ──
    if re.search(r"what\s+documents?|which\s+documents?|documents?\s+(do|should|need)", q):
        return ComplianceChatResponse(
            answer="**Essential Compliance Documents:**\n\n"
                   "• Hospital Registration Certificate\n"
                   "• Fire Safety NOC (Fire Department)\n"
                   "• Biomedical Waste Authorization\n"
                   "• Clinical Establishment License\n"
                   "• AERB License (if you have radiology/CT/MRI)\n"
                   "• Staff Qualification Certificates\n"
                   "• Insurance Certificates\n"
                   "• Building Stability Certificate\n"
                   "• Pollution Control Board Consent\n\n"
                   "Upload all these to the Evidence Vault and link them to relevant NABH items.",
            source="knowledge_base",
            suggestedActions=[
                ComplianceHelpTip(id="upload-ev", level="info", title="Upload Documents",
                                  message="Go to Evidence Vault to upload your documents",
                                  actionLabel="Evidence Vault", actionHref="/compliance/evidence"),
            ],
            followUp=["How do I upload evidence?", "What is the Evidence Vault?"],
            durationMs=ms(),
        )

    # ── "How to get NABH accreditation" ──
    if re.search(r"nabh\s+accreditation|how.*nabh|nabh.*process|get\s+nabh", q):
        return ComplianceChatResponse(
            answer="**NABH Accreditation Process:**\n\n"
                   "1. **Self-Assessment** — Complete the NABH checklist in this system\n"
                   "2. **Internal Audits** — Run audit cycles to identify gaps\n"
                   "3. **Fix Issues** — Create CAPAs for any findings and implement them\n"
                   "4. **Upload Evidence** — Ensure all checklist items have supporting documents\n"
                   "5. **Application** — Apply to NABH through their portal (qci.org.in)\n"
                   "6. **Assessment** — NABH assessors visit your hospital\n"
                   "7. **Certification** — If you pass, you receive NABH accreditation\n\n"
                   "Use our Checklist page to track your preparation systematically.",
            source="knowledge_base",
            suggestedActions=[
                ComplianceHelpTip(id="nabh-start", level="info", title="Start Preparation",
                                  message="Begin with the NABH Checklist",
                                  actionLabel="NABH Checklist", actionHref="/compliance/nabh/checklist"),
            ],
            followUp=["What are the 10 NABH chapters?", "What is CAPA?", "How long does it take?"],
            durationMs=ms(),
        )

    # ── "How to upload evidence" ──
    if re.search(r"how.*(upload|add)\s+(evidence|document|file)|upload\s+to\s+vault", q):
        return ComplianceChatResponse(
            answer="**How to Upload Evidence:**\n\n"
                   "1. Go to **Evidence Vault** (sidebar → Evidence Vault)\n"
                   "2. Click **'Upload Evidence'** button\n"
                   "3. Fill in the title and select document type\n"
                   "4. Set the expiry date (when the document needs renewal)\n"
                   "5. Choose your file (PDF, JPG, or PNG — max 5MB)\n"
                   "6. Click **'Upload'**\n\n"
                   "After uploading, open the evidence and click **'Link to Entity'** to connect it to NABH items or other compliance requirements.",
            source="knowledge_base",
            suggestedActions=[
                ComplianceHelpTip(id="go-evidence", level="info", title="Go to Evidence Vault",
                                  message="Upload your compliance documents",
                                  actionLabel="Open Vault", actionHref="/compliance/evidence"),
            ],
            followUp=["What documents do I need?", "What is a Blocking Gap?"],
            durationMs=ms(),
        )

    # ── "What is blocking / readiness score" ──
    if re.search(r"blocking\s+gap|readiness\s+score|validator\s+score|what.*score|how.*score", q):
        return ComplianceChatResponse(
            answer="**Understanding Readiness Scores:**\n\n"
                   "The Validator calculates your score based on:\n"
                   "• **NABH** (40% weight) — Checklist completion\n"
                   "• **Schemes** (25%) — Empanelment & mapping status\n"
                   "• **ABDM** (20%) — HFR, ABHA, HPR setup\n"
                   "• **Evidence** (15%) — Document coverage & validity\n\n"
                   "**Blocking Gaps** (🔴) = Must fix before go-live\n"
                   "**Warnings** (🟡) = Should fix but not mandatory\n\n"
                   "Aim for **80+** score with **zero blocking gaps** to go live.",
            source="knowledge_base",
            followUp=["How do I fix blocking gaps?", "How often should I run the validator?"],
            durationMs=ms(),
        )

    # ── "How to fix blocking gaps" ──
    if re.search(r"fix.*blocking|resolve.*gap|clear.*blocker", q):
        return ComplianceChatResponse(
            answer="**Fixing Blocking Gaps:**\n\n"
                   "1. **Run the Validator** — It lists all blocking gaps\n"
                   "2. **Click on each red item** — It links to the page where you can fix it\n"
                   "3. **Common blocking gaps:**\n"
                   "   - HFR incomplete → Complete your HFR Profile\n"
                   "   - No active empanelment → Set up PMJAY/CGHS/ECHS\n"
                   "   - Expired evidence → Upload renewed documents\n"
                   "   - Critical NABH items not started → Begin the checklist\n"
                   "4. **Re-run the Validator** after each fix to see updated status",
            source="knowledge_base",
            suggestedActions=[
                ComplianceHelpTip(id="run-val", level="info", title="Run Validator",
                                  message="Check your current blocking gaps",
                                  actionLabel="Run Validator", actionHref="/compliance/validator"),
            ],
            followUp=["What is the readiness score?", "What is NABH?"],
            durationMs=ms(),
        )

    # ── Scheme-specific questions ──
    if re.search(r"pmjay|ayushman", q):
        entry = _GLOSSARY_BY_TERM.get("pmjay")
        return ComplianceChatResponse(
            answer=f"**PMJAY (Ayushman Bharat)** — {entry.longDef if entry else 'Government health scheme for economically weaker sections.'}\n\n"
                   "To set up PMJAY:\n"
                   "1. Get empanelment from your State Health Authority\n"
                   "2. Enter empanelment details in the PMJAY page\n"
                   "3. Create rate cards with approved prices\n"
                   "4. Map your services to PMJAY codes",
            source="knowledge_base",
            suggestedActions=[
                ComplianceHelpTip(id="pmjay-config", level="info", title="Configure PMJAY",
                                  message="Set up your PMJAY empanelment",
                                  actionLabel="PMJAY Setup", actionHref="/compliance/schemes/pmjay"),
            ],
            followUp=["What is empanelment?", "What is a rate card?", "What is SHA code?"],
            durationMs=ms(),
        )

    if re.search(r"cghs", q):
        entry = _GLOSSARY_BY_TERM.get("cghs")
        return ComplianceChatResponse(
            answer=f"**CGHS** — {entry.longDef if entry else 'Central Government Health Scheme for govt employees.'}\n\n"
                   "Set up CGHS from: Schemes → CGHS page.\nYou'll need your empanelment number and city category.",
            source="knowledge_base",
            followUp=["What is empanelment?", "What is a city category?"],
            durationMs=ms(),
        )

    if re.search(r"echs", q):
        entry = _GLOSSARY_BY_TERM.get("echs")
        return ComplianceChatResponse(
            answer=f"**ECHS** — {entry.longDef if entry else 'Ex-Servicemen health scheme.'}",
            source="knowledge_base",
            followUp=["What is empanelment?", "What is PMJAY?"],
            durationMs=ms(),
        )

    # ── "What should I do on this page" ──
    if page_context and re.search(r"what.*(do|should).*(here|this page|this)|help\s+with\s+this|how.*use\s+this", q):
        help_data = get_page_help(page_context)
        if help_data.whatIsThis:
            steps_text = "\n".join(f"  {i+1}. {s}" for i, s in enumerate(help_data.howToUse))
            return ComplianceChatResponse(
                answer=f"**{help_data.pageTitle}**\n\n{help_data.whatIsThis}\n\n**How to use this page:**\n{steps_text}",
                source="contextual",
                relatedTerms=help_data.relatedGlossary[:3],
                followUp=[faq["q"] for faq in help_data.commonQuestions[:3]],
                durationMs=ms(),
            )

    # ── "What's next" / progress ──
    if compliance_state and re.search(r"what.*(next|should|do)|progress|status|where\s+am\s+i", q):
        steps = compute_workflow_steps(compliance_state)
        current_step = next((s for s in steps if s.status == "current"), None)
        done_count = sum(1 for s in steps if s.status == "done")
        progress = int(done_count / len(steps) * 100) if steps else 0

        if current_step:
            answer = (
                f"**Your Progress: {progress}% ({done_count}/{len(steps)} steps done)**\n\n"
                f"**Next Step: {current_step.label}**\n{current_step.description}\n\n"
                f"Go to: {current_step.href}"
            )
        else:
            answer = f"You've completed {done_count} out of {len(steps)} steps ({progress}%). "
            if progress >= 100:
                answer += "Congratulations! All steps are done. Run the Validator for a final check."
            else:
                answer += "Keep going!"

        return ComplianceChatResponse(
            answer=answer,
            source="contextual",
            suggestedActions=[
                ComplianceHelpTip(id="next-step", level="info", title=current_step.label if current_step else "Validator",
                                  message=current_step.description if current_step else "Run the validator",
                                  actionLabel="Go", actionHref=current_step.href if current_step else "/compliance/validator"),
            ] if current_step else [],
            followUp=["How do I fix blocking gaps?", "What is the readiness score?"],
            durationMs=ms(),
        )

    # ── Fallback ──
    return ComplianceChatResponse(
        answer="I can help you with compliance questions! Try asking:\n\n"
               "• **\"Where do I start?\"** — Get a step-by-step setup guide\n"
               "• **\"What is NABH?\"** — Learn about any compliance term\n"
               "• **\"What documents do I need?\"** — See required documents\n"
               "• **\"What should I do on this page?\"** — Get help with the current page\n"
               "• **\"What's next?\"** — See your progress and next steps\n"
               "• **\"How to get NABH accreditation?\"** — Understand the process\n"
               "• **\"What is PMJAY?\"** — Learn about government schemes",
        source="knowledge_base",
        followUp=[
            "Where do I start?",
            "What is NABH?",
            "What is ABDM?",
            "What documents do I need?",
        ],
        durationMs=ms(),
    )


# ═══════════════════════════════════════════════════════════════════════════
# Compliance Page Insights — for the existing page-insights pipeline
# ═══════════════════════════════════════════════════════════════════════════

from .models import PageInsight as BasePageInsight


def get_compliance_page_insights(
    module: str,
    compliance_state: dict[str, Any] | None = None,
) -> list[BasePageInsight]:
    """Generate insights for compliance pages.
    Called from the main page_insights engine."""
    insights: list[BasePageInsight] = []
    s = compliance_state or {}

    if module == "compliance-workspaces":
        if not s.get("hasWorkspace"):
            insights.append(BasePageInsight(
                id="cw-no-workspace",
                level="warning",
                message="No compliance workspace found for this branch. Create one to start your compliance journey.",
                actionHint="Click 'Create Workspace' to get started.",
            ))
        elif s.get("workspaceStatus") == "DRAFT":
            insights.append(BasePageInsight(
                id="cw-draft-ws",
                level="info",
                message="Your workspace is in DRAFT status. Configure ABDM, Schemes, and NABH before activating.",
                actionHint="Complete setup, then change status to ACTIVE.",
            ))

    elif module == "compliance-evidence":
        exp = s.get("evidenceExpiring", 0)
        if exp > 0:
            insights.append(BasePageInsight(
                id="ce-expiring",
                level="warning",
                message=f"{exp} evidence document(s) expiring in the next 30 days. Renew them to avoid blocking gaps.",
                actionHint="Filter by 'Expiring Soon' to see which documents need renewal.",
                entityCount=exp,
            ))
        if s.get("evidenceCount", 0) == 0:
            insights.append(BasePageInsight(
                id="ce-no-evidence",
                level="info",
                message="No evidence documents uploaded yet. Start by uploading your hospital registration and fire safety NOC.",
                actionHint="Click 'Upload Evidence' to add your first document.",
            ))

    elif module == "compliance-approvals":
        pending = s.get("pendingApprovals", 0)
        if pending > 0:
            insights.append(BasePageInsight(
                id="ca-pending",
                level="warning",
                message=f"{pending} approval(s) pending your review. Delayed approvals slow down compliance progress.",
                actionHint="Review and decide on pending items promptly.",
                entityCount=pending,
            ))

    elif module == "compliance-abdm":
        if not s.get("hasAbhaConfig"):
            insights.append(BasePageInsight(
                id="ab-no-config",
                level="warning",
                message="ABHA integration not configured yet. This is required for ABDM compliance.",
                actionHint="Go to ABHA Config to set up your client credentials.",
            ))
        hfr = s.get("hfrCompleteness", 0)
        if 0 < hfr < 80:
            insights.append(BasePageInsight(
                id="ab-hfr-incomplete",
                level="info",
                message=f"HFR profile is {hfr}% complete. Aim for 100% for best Validator results.",
                actionHint="Fill in the remaining HFR fields.",
            ))

    elif module == "compliance-schemes":
        if not s.get("pmjayActive") and not s.get("cghsActive") and not s.get("echsActive"):
            insights.append(BasePageInsight(
                id="cs-no-schemes",
                level="info",
                message="No government schemes configured yet. Set up at least one scheme to serve government-insured patients.",
                actionHint="Start with PMJAY — it covers the largest patient base.",
            ))
        unmapped = s.get("unmappedPercent", 0)
        if unmapped > 20:
            insights.append(BasePageInsight(
                id="cs-unmapped",
                level="warning",
                message=f"{unmapped}% of services are unmapped to scheme codes. Unmapped services can't be billed under schemes.",
                actionHint="Go to Mappings to map your services.",
            ))

    elif module == "compliance-nabh":
        progress = s.get("nabhProgress", 0)
        if progress == 0:
            insights.append(BasePageInsight(
                id="cn-not-started",
                level="info",
                message="NABH checklist not started yet. Begin with Chapter 1: Access, Assessment and Continuity of Care.",
                actionHint="Go to Checklist to start working through the items.",
            ))
        elif progress < 50:
            insights.append(BasePageInsight(
                id="cn-early",
                level="info",
                message=f"NABH checklist is {progress}% complete. Keep going — focus on CRITICAL items first.",
                actionHint="Prioritize items marked as CRITICAL severity.",
            ))

    elif module == "compliance-validator":
        score = s.get("validatorScore", 0)
        blocking = s.get("blockingGapCount", 0)
        if score > 0 and blocking > 0:
            insights.append(BasePageInsight(
                id="cv-blockers",
                level="critical",
                message=f"{blocking} blocking gap(s) found. These must be resolved before go-live.",
                actionHint="Click on each red item to navigate and fix it.",
                entityCount=blocking,
            ))
        elif score >= 80:
            insights.append(BasePageInsight(
                id="cv-ready",
                level="info",
                message=f"Readiness score is {score}%. You're on track for go-live!",
                actionHint="Activate your workspace when ready.",
            ))

    return insights[:5]
