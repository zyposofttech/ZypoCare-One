
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BranchScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  city: 'city',
  organizationId: 'organizationId',
  isActive: 'isActive',
  legalEntityName: 'legalEntityName',
  address: 'address',
  pinCode: 'pinCode',
  state: 'state',
  country: 'country',
  contactPhone1: 'contactPhone1',
  contactPhone2: 'contactPhone2',
  contactEmail: 'contactEmail',
  gstNumber: 'gstNumber',
  panNumber: 'panNumber',
  clinicalEstRegNumber: 'clinicalEstRegNumber',
  rohiniId: 'rohiniId',
  hfrId: 'hfrId',
  logoUrl: 'logoUrl',
  website: 'website',
  socialLinks: 'socialLinks',
  accreditations: 'accreditations',
  bedCount: 'bedCount',
  establishedDate: 'establishedDate',
  defaultCurrency: 'defaultCurrency',
  timezone: 'timezone',
  fiscalYearStartMonth: 'fiscalYearStartMonth',
  workingHours: 'workingHours',
  emergency24x7: 'emergency24x7',
  multiLanguageSupport: 'multiLanguageSupport',
  supportedLanguages: 'supportedLanguages',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FacilityCatalogScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  category: 'category',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BranchFacilityScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  facilityId: 'facilityId',
  isEnabled: 'isEnabled',
  enabledAt: 'enabledAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  facilityId: 'facilityId',
  code: 'code',
  name: 'name',
  headStaffId: 'headStaffId',
  parentDepartmentId: 'parentDepartmentId',
  isActive: 'isActive',
  deactivatedAt: 'deactivatedAt',
  deactivationReason: 'deactivationReason',
  deactivatedByUserId: 'deactivatedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  facilityType: 'facilityType',
  costCenterCode: 'costCenterCode',
  extensions: 'extensions',
  operatingHours: 'operatingHours'
};

exports.Prisma.DepartmentLocationScalarFieldEnum = {
  id: 'id',
  departmentId: 'departmentId',
  locationNodeId: 'locationNodeId',
  isPrimary: 'isPrimary',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DepartmentDoctorScalarFieldEnum = {
  id: 'id',
  departmentId: 'departmentId',
  staffId: 'staffId',
  isPrimary: 'isPrimary',
  assignedAt: 'assignedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DepartmentSpecialtyScalarFieldEnum = {
  id: 'id',
  departmentId: 'departmentId',
  specialtyId: 'specialtyId',
  isPrimary: 'isPrimary',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SpecialtyScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  kind: 'kind',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffScalarFieldEnum = {
  id: 'id',
  empCode: 'empCode',
  name: 'name',
  designation: 'designation',
  title: 'title',
  firstName: 'firstName',
  middleName: 'middleName',
  lastName: 'lastName',
  displayName: 'displayName',
  dateOfBirth: 'dateOfBirth',
  gender: 'gender',
  bloodGroup: 'bloodGroup',
  maritalStatus: 'maritalStatus',
  primaryPhone: 'primaryPhone',
  secondaryPhone: 'secondaryPhone',
  personalEmail: 'personalEmail',
  officialEmail: 'officialEmail',
  emergencyContact: 'emergencyContact',
  currentAddress: 'currentAddress',
  permanentAddress: 'permanentAddress',
  isSameAsCurrent: 'isSameAsCurrent',
  staffType: 'staffType',
  employmentType: 'employmentType',
  employmentStatus: 'employmentStatus',
  joiningDate: 'joiningDate',
  confirmationDate: 'confirmationDate',
  probationEndDate: 'probationEndDate',
  contractStartDate: 'contractStartDate',
  contractEndDate: 'contractEndDate',
  defaultShiftType: 'defaultShiftType',
  isFullTime: 'isFullTime',
  workingHoursPerWeek: 'workingHoursPerWeek',
  weeklyOffDays: 'weeklyOffDays',
  hasSystemAccess: 'hasSystemAccess',
  isAvailableForAppointment: 'isAvailableForAppointment',
  isAvailableForDuty: 'isAvailableForDuty',
  canPrescribe: 'canPrescribe',
  canAdmitPatients: 'canAdmitPatients',
  canPerformSurgery: 'canPerformSurgery',
  hprVerificationStatus: 'hprVerificationStatus',
  hprLastVerifiedAt: 'hprLastVerifiedAt',
  hprVerificationPayload: 'hprVerificationPayload',
  category: 'category',
  engagementType: 'engagementType',
  status: 'status',
  phone: 'phone',
  email: 'email',
  organizationId: 'organizationId',
  primaryBranchId: 'primaryBranchId',
  homeBranchId: 'homeBranchId',
  reportingToStaffId: 'reportingToStaffId',
  hprId: 'hprId',
  isActive: 'isActive',
  suspendedAt: 'suspendedAt',
  suspendedUntil: 'suspendedUntil',
  suspensionReason: 'suspensionReason',
  notes: 'notes',
  personalDetails: 'personalDetails',
  contactDetails: 'contactDetails',
  employmentDetails: 'employmentDetails',
  medicalDetails: 'medicalDetails',
  systemAccess: 'systemAccess',
  onboardingStatus: 'onboardingStatus',
  onboardingStartedAt: 'onboardingStartedAt',
  onboardingCompletedAt: 'onboardingCompletedAt',
  onboardingCompletedByUserId: 'onboardingCompletedByUserId',
  profilePhotoDocumentId: 'profilePhotoDocumentId',
  signatureDocumentId: 'signatureDocumentId',
  stampDocumentId: 'stampDocumentId',
  isUsgAuthorized: 'isUsgAuthorized',
  usgAuthorizedAt: 'usgAuthorizedAt',
  usgAuthorizedByUserId: 'usgAuthorizedByUserId',
  usgAuthorizationNotes: 'usgAuthorizationNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffAssignmentScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  facilityId: 'facilityId',
  departmentId: 'departmentId',
  specialtyId: 'specialtyId',
  unitId: 'unitId',
  branchEmpCode: 'branchEmpCode',
  designation: 'designation',
  role: 'role',
  assignmentType: 'assignmentType',
  status: 'status',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  isPrimary: 'isPrimary',
  daysAvailable: 'daysAvailable',
  workingHours: 'workingHours',
  opdConfiguration: 'opdConfiguration',
  consultationChargeOverride: 'consultationChargeOverride',
  isActive: 'isActive',
  requiresApproval: 'requiresApproval',
  approvalStatus: 'approvalStatus',
  assignedByUserId: 'assignedByUserId',
  assignedAt: 'assignedAt',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  approvalNotes: 'approvalNotes',
  canAdmitPatients: 'canAdmitPatients',
  canPerformSurgery: 'canPerformSurgery',
  hasOTPrivileges: 'hasOTPrivileges',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserRoleBindingScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  branchId: 'branchId',
  roleVersionId: 'roleVersionId',
  staffAssignmentId: 'staffAssignmentId',
  isPrimary: 'isPrimary',
  isActive: 'isActive',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffCredentialScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  type: 'type',
  authority: 'authority',
  registrationNumber: 'registrationNumber',
  validFrom: 'validFrom',
  validTo: 'validTo',
  status: 'status',
  isCritical: 'isCritical',
  renewalRequired: 'renewalRequired',
  renewalWindowDays: 'renewalWindowDays',
  lastStatusComputedAt: 'lastStatusComputedAt',
  verificationStatus: 'verificationStatus',
  verifiedAt: 'verifiedAt',
  verifiedByUserId: 'verifiedByUserId',
  documentUrl: 'documentUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffIdentifierScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  type: 'type',
  valueHash: 'valueHash',
  valueLast4: 'valueLast4',
  issuedBy: 'issuedBy',
  issuedAt: 'issuedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffDocumentScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  staffAssignmentId: 'staffAssignmentId',
  type: 'type',
  title: 'title',
  description: 'description',
  refNo: 'refNo',
  issuedBy: 'issuedBy',
  issuedAt: 'issuedAt',
  validFrom: 'validFrom',
  validTo: 'validTo',
  fileUrl: 'fileUrl',
  fileMime: 'fileMime',
  fileSizeBytes: 'fileSizeBytes',
  checksum: 'checksum',
  tags: 'tags',
  isActive: 'isActive',
  uploadedByUserId: 'uploadedByUserId',
  verificationStatus: 'verificationStatus',
  verifiedAt: 'verifiedAt',
  verifiedByUserId: 'verifiedByUserId',
  verificationNotes: 'verificationNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffCredentialEvidenceScalarFieldEnum = {
  id: 'id',
  staffCredentialId: 'staffCredentialId',
  staffDocumentId: 'staffDocumentId',
  createdAt: 'createdAt'
};

exports.Prisma.StaffCredentialAlertScalarFieldEnum = {
  id: 'id',
  staffCredentialId: 'staffCredentialId',
  stage: 'stage',
  scheduledAt: 'scheduledAt',
  status: 'status',
  sentAt: 'sentAt',
  outboxEventId: 'outboxEventId',
  error: 'error',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApprovalRequestScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  branchId: 'branchId',
  status: 'status',
  currentStep: 'currentStep',
  createdByUserId: 'createdByUserId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApprovalStepScalarFieldEnum = {
  id: 'id',
  approvalRequestId: 'approvalRequestId',
  stepOrder: 'stepOrder',
  approverKind: 'approverKind',
  approverRoleCode: 'approverRoleCode',
  approverUserId: 'approverUserId',
  status: 'status',
  actedAt: 'actedAt',
  actedByUserId: 'actedByUserId',
  remarks: 'remarks',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffRosterScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  status: 'status',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffRosterEntryScalarFieldEnum = {
  id: 'id',
  rosterId: 'rosterId',
  startAt: 'startAt',
  endAt: 'endAt',
  shiftType: 'shiftType',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffAttendanceScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  date: 'date',
  status: 'status',
  checkInAt: 'checkInAt',
  checkOutAt: 'checkOutAt',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffLeaveRequestScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  leaveType: 'leaveType',
  startDate: 'startDate',
  endDate: 'endDate',
  reason: 'reason',
  status: 'status',
  reportingManagerApproval: 'reportingManagerApproval',
  reportingManagerApprovedByUserId: 'reportingManagerApprovedByUserId',
  reportingManagerApprovedAt: 'reportingManagerApprovedAt',
  hrApproval: 'hrApproval',
  hrApprovedByUserId: 'hrApprovedByUserId',
  hrApprovedAt: 'hrApprovedAt',
  meta: 'meta',
  approvalRequestId: 'approvalRequestId',
  submittedAt: 'submittedAt',
  decidedAt: 'decidedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffTrainingRecordScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  programName: 'programName',
  provider: 'provider',
  status: 'status',
  completedAt: 'completedAt',
  score: 'score',
  evidenceDocumentId: 'evidenceDocumentId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffSeparationScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  separationDate: 'separationDate',
  reason: 'reason',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffHealthRecordScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  recordedAt: 'recordedAt',
  meta: 'meta'
};

exports.Prisma.StaffProviderProfileScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  isActive: 'isActive',
  providerCode: 'providerCode',
  displayName: 'displayName',
  departmentId: 'departmentId',
  specialtyId: 'specialtyId',
  consultationModes: 'consultationModes',
  schedulingProfile: 'schedulingProfile',
  billingProfile: 'billingProfile',
  clinicalProfile: 'clinicalProfile',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffPrivilegeGrantScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  staffAssignmentId: 'staffAssignmentId',
  area: 'area',
  action: 'action',
  targetType: 'targetType',
  targetId: 'targetId',
  targetMeta: 'targetMeta',
  status: 'status',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  grantedByUserId: 'grantedByUserId',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffOnboardingItemScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  branchId: 'branchId',
  type: 'type',
  title: 'title',
  description: 'description',
  status: 'status',
  isRequired: 'isRequired',
  dueAt: 'dueAt',
  completedAt: 'completedAt',
  completedByUserId: 'completedByUserId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffCompliancePackScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  category: 'category',
  roleTemplateId: 'roleTemplateId',
  branchId: 'branchId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffComplianceRequirementScalarFieldEnum = {
  id: 'id',
  packId: 'packId',
  kind: 'kind',
  title: 'title',
  isMandatory: 'isMandatory',
  documentType: 'documentType',
  credentialType: 'credentialType',
  identifierType: 'identifierType',
  renewalRequired: 'renewalRequired',
  renewalWindowDays: 'renewalWindowDays',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffComplianceAssignmentScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  packId: 'packId',
  branchId: 'branchId',
  status: 'status',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  assignedByUserId: 'assignedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffMergeLogScalarFieldEnum = {
  id: 'id',
  sourceStaffId: 'sourceStaffId',
  targetStaffId: 'targetStaffId',
  reason: 'reason',
  notes: 'notes',
  mergedByUserId: 'mergedByUserId',
  mergedAt: 'mergedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  role: 'role',
  phone: 'phone',
  branchId: 'branchId',
  staffId: 'staffId',
  isActive: 'isActive',
  source: 'source',
  authzVersion: 'authzVersion',
  passwordHash: 'passwordHash',
  mustChangePassword: 'mustChangePassword',
  passwordResetToken: 'passwordResetToken',
  passwordResetExpires: 'passwordResetExpires',
  roleVersionId: 'roleVersionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  uhid: 'uhid',
  name: 'name',
  gender: 'gender',
  dob: 'dob',
  phone: 'phone',
  email: 'email',
  address: 'address',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EncounterScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  patientId: 'patientId',
  type: 'type',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WardScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  specialty: 'specialty',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoomScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  wardId: 'wardId',
  code: 'code',
  name: 'name',
  floor: 'floor',
  type: 'type',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BedScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  roomId: 'roomId',
  code: 'code',
  state: 'state',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  encounterId: 'encounterId',
  patientId: 'patientId',
  bedId: 'bedId',
  admittedAt: 'admittedAt',
  dischargedAt: 'dischargedAt',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  category: 'category',
  location: 'location',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaxCodeScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  taxType: 'taxType',
  ratePercent: 'ratePercent',
  components: 'components',
  hsnSac: 'hsnSac',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayerScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  shortName: 'shortName',
  displayName: 'displayName',
  kind: 'kind',
  status: 'status',
  isActive: 'isActive',
  irdaiRegistration: 'irdaiRegistration',
  licenseNumber: 'licenseNumber',
  licenseValidTill: 'licenseValidTill',
  panNumber: 'panNumber',
  gstinNumber: 'gstinNumber',
  cinNumber: 'cinNumber',
  addresses: 'addresses',
  contacts: 'contacts',
  portalUrl: 'portalUrl',
  creditDays: 'creditDays',
  creditLimit: 'creditLimit',
  gracePeriodDays: 'gracePeriodDays',
  interestRate: 'interestRate',
  earlyPaymentDiscount: 'earlyPaymentDiscount',
  settlementTerms: 'settlementTerms',
  requiresPreauth: 'requiresPreauth',
  preauthThreshold: 'preauthThreshold',
  supportingDocs: 'supportingDocs',
  claimSubmissionMethod: 'claimSubmissionMethod',
  networkType: 'networkType',
  empanelmentLevel: 'empanelmentLevel',
  roomRentLimit: 'roomRentLimit',
  icuRentLimit: 'icuRentLimit',
  apiEndpoint: 'apiEndpoint',
  authMethod: 'authMethod',
  webhookUrl: 'webhookUrl',
  empanelmentStartDate: 'empanelmentStartDate',
  empanelmentEndDate: 'empanelmentEndDate',
  autoRenewal: 'autoRenewal',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayerContractScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  payerId: 'payerId',
  code: 'code',
  name: 'name',
  description: 'description',
  status: 'status',
  priority: 'priority',
  startAt: 'startAt',
  endAt: 'endAt',
  pricingStrategy: 'pricingStrategy',
  globalDiscountPercent: 'globalDiscountPercent',
  emergencyLoadingPercent: 'emergencyLoadingPercent',
  afterHoursLoadingPercent: 'afterHoursLoadingPercent',
  weekendLoadingPercent: 'weekendLoadingPercent',
  statLoadingPercent: 'statLoadingPercent',
  copaymentRules: 'copaymentRules',
  excludedServiceIds: 'excludedServiceIds',
  excludedCategories: 'excludedCategories',
  approvalStatus: 'approvalStatus',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  gracePeriodDays: 'gracePeriodDays',
  autoRenewal: 'autoRenewal',
  terms: 'terms',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TariffPlanScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  kind: 'kind',
  planStatus: 'planStatus',
  code: 'code',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  isDefault: 'isDefault',
  status: 'status',
  payerType: 'payerType',
  payerId: 'payerId',
  contractId: 'contractId',
  currency: 'currency',
  isTaxInclusive: 'isTaxInclusive',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceCatalogItemScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  category: 'category',
  unit: 'unit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TariffRateScalarFieldEnum = {
  id: 'id',
  tariffPlanId: 'tariffPlanId',
  chargeMasterItemId: 'chargeMasterItemId',
  serviceCode: 'serviceCode',
  rateAmount: 'rateAmount',
  currency: 'currency',
  taxCodeId: 'taxCodeId',
  isTaxInclusive: 'isTaxInclusive',
  rules: 'rules',
  notes: 'notes',
  isActive: 'isActive',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  version: 'version',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConsentRecordScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  scope: 'scope',
  purpose: 'purpose',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.RtbfRequestScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  reason: 'reason',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StatutoryCaseScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  patientId: 'patientId',
  program: 'program',
  disease: 'disease',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditEventScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  actorUserId: 'actorUserId',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  meta: 'meta',
  createdAt: 'createdAt'
};

exports.Prisma.OutboxEventScalarFieldEnum = {
  id: 'id',
  topic: 'topic',
  key: 'key',
  payload: 'payload',
  status: 'status',
  attempts: 'attempts',
  availableAt: 'availableAt',
  lockedAt: 'lockedAt',
  sentAt: 'sentAt',
  error: 'error',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  category: 'category',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleTemplateScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  scope: 'scope',
  description: 'description',
  isSystem: 'isSystem',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleTemplateVersionScalarFieldEnum = {
  id: 'id',
  roleTemplateId: 'roleTemplateId',
  version: 'version',
  status: 'status',
  notes: 'notes',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleTemplatePermissionScalarFieldEnum = {
  id: 'id',
  roleVersionId: 'roleVersionId',
  permissionId: 'permissionId',
  allowed: 'allowed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PolicyDefinitionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PolicyVersionScalarFieldEnum = {
  id: 'id',
  policyId: 'policyId',
  scope: 'scope',
  branchId: 'branchId',
  version: 'version',
  status: 'status',
  effectiveAt: 'effectiveAt',
  notes: 'notes',
  payload: 'payload',
  applyToAllBranches: 'applyToAllBranches',
  createdByUserId: 'createdByUserId',
  submittedAt: 'submittedAt',
  submittedByUserId: 'submittedByUserId',
  approvedAt: 'approvedAt',
  approvedByUserId: 'approvedByUserId',
  approvalNote: 'approvalNote',
  rejectedAt: 'rejectedAt',
  rejectedByUserId: 'rejectedByUserId',
  rejectionReason: 'rejectionReason',
  retiredAt: 'retiredAt',
  retiredByUserId: 'retiredByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PolicyVersionBranchScalarFieldEnum = {
  id: 'id',
  policyVersionId: 'policyVersionId',
  branchId: 'branchId',
  createdAt: 'createdAt'
};

exports.Prisma.LocationNodeScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  kind: 'kind',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LocationNodeRevisionScalarFieldEnum = {
  id: 'id',
  nodeId: 'nodeId',
  code: 'code',
  name: 'name',
  isActive: 'isActive',
  gpsLat: 'gpsLat',
  gpsLng: 'gpsLng',
  floorNumber: 'floorNumber',
  wheelchairAccess: 'wheelchairAccess',
  stretcherAccess: 'stretcherAccess',
  emergencyExit: 'emergencyExit',
  fireZone: 'fireZone',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.UnitTypeCatalogScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  category: 'category',
  usesRoomsDefault: 'usesRoomsDefault',
  schedulableByDefault: 'schedulableByDefault',
  bedBasedDefault: 'bedBasedDefault',
  requiresPreAuthDefault: 'requiresPreAuthDefault',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  defaultOperatingHours: 'defaultOperatingHours',
  standardEquipment: 'standardEquipment',
  isSystemDefined: 'isSystemDefined'
};

exports.Prisma.BranchUnitTypeScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  unitTypeId: 'unitTypeId',
  isEnabled: 'isEnabled',
  enabledAt: 'enabledAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnitScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  locationNodeId: 'locationNodeId',
  departmentId: 'departmentId',
  unitTypeId: 'unitTypeId',
  code: 'code',
  name: 'name',
  totalRoomCount: 'totalRoomCount',
  totalBedCapacity: 'totalBedCapacity',
  commissioningDate: 'commissioningDate',
  floorNumber: 'floorNumber',
  wingZone: 'wingZone',
  inchargeStaffId: 'inchargeStaffId',
  nursingStation: 'nursingStation',
  usesRooms: 'usesRooms',
  isActive: 'isActive',
  deactivatedAt: 'deactivatedAt',
  deactivationReason: 'deactivationReason',
  deactivatedByUserId: 'deactivatedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnitRoomScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  unitId: 'unitId',
  code: 'code',
  roomNumber: 'roomNumber',
  name: 'name',
  roomType: 'roomType',
  areaSqFt: 'areaSqFt',
  hasAttachedBathroom: 'hasAttachedBathroom',
  hasAC: 'hasAC',
  hasTV: 'hasTV',
  hasOxygen: 'hasOxygen',
  hasSuction: 'hasSuction',
  hasVentilator: 'hasVentilator',
  hasMonitor: 'hasMonitor',
  hasCallButton: 'hasCallButton',
  maxOccupancy: 'maxOccupancy',
  currentOccupancy: 'currentOccupancy',
  pricingTier: 'pricingTier',
  baseChargePerDay: 'baseChargePerDay',
  isIsolation: 'isIsolation',
  isolationType: 'isolationType',
  isActive: 'isActive',
  isAvailable: 'isAvailable',
  maintenanceStatus: 'maintenanceStatus',
  lastCleanedAt: 'lastCleanedAt',
  deactivatedAt: 'deactivatedAt',
  deactivationReason: 'deactivationReason',
  deactivatedByUserId: 'deactivatedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnitResourceScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  unitId: 'unitId',
  roomId: 'roomId',
  resourceType: 'resourceType',
  code: 'code',
  assetTag: 'assetTag',
  name: 'name',
  resourceCategory: 'resourceCategory',
  manufacturer: 'manufacturer',
  model: 'model',
  serialNumber: 'serialNumber',
  hasMonitor: 'hasMonitor',
  hasOxygenSupply: 'hasOxygenSupply',
  hasSuction: 'hasSuction',
  hasVentilatorSupport: 'hasVentilatorSupport',
  isPowerRequired: 'isPowerRequired',
  state: 'state',
  isActive: 'isActive',
  assignedPatientId: 'assignedPatientId',
  isSchedulable: 'isSchedulable',
  slotDurationMinutes: 'slotDurationMinutes',
  lastMaintenanceDate: 'lastMaintenanceDate',
  nextMaintenanceDate: 'nextMaintenanceDate',
  warrantyExpiryDate: 'warrantyExpiryDate',
  commissionedAt: 'commissionedAt',
  reservedReason: 'reservedReason',
  blockedReason: 'blockedReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deactivatedAt: 'deactivatedAt',
  deactivationReason: 'deactivationReason',
  deactivatedByUserId: 'deactivatedByUserId'
};

exports.Prisma.BranchInfraConfigScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  housekeepingGateEnabled: 'housekeepingGateEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EquipmentAssetScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  category: 'category',
  make: 'make',
  model: 'model',
  serial: 'serial',
  ownerDepartmentId: 'ownerDepartmentId',
  unitId: 'unitId',
  roomId: 'roomId',
  locationNodeId: 'locationNodeId',
  operationalStatus: 'operationalStatus',
  amcVendor: 'amcVendor',
  amcValidFrom: 'amcValidFrom',
  amcValidTo: 'amcValidTo',
  warrantyValidTo: 'warrantyValidTo',
  pmFrequencyDays: 'pmFrequencyDays',
  nextPmDueAt: 'nextPmDueAt',
  aerbLicenseNo: 'aerbLicenseNo',
  aerbValidTo: 'aerbValidTo',
  pcpndtRegNo: 'pcpndtRegNo',
  pcpndtValidTo: 'pcpndtValidTo',
  isSchedulable: 'isSchedulable',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DowntimeTicketScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  reason: 'reason',
  notes: 'notes',
  status: 'status',
  openedAt: 'openedAt',
  closedAt: 'closedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChargeMasterItemScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  category: 'category',
  unit: 'unit',
  chargeUnit: 'chargeUnit',
  taxCodeId: 'taxCodeId',
  isTaxInclusive: 'isTaxInclusive',
  hsnSac: 'hsnSac',
  billingPolicy: 'billingPolicy',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceItemScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  category: 'category',
  unit: 'unit',
  type: 'type',
  departmentId: 'departmentId',
  externalId: 'externalId',
  procedureKind: 'procedureKind',
  anesthesiaClass: 'anesthesiaClass',
  isOrderable: 'isOrderable',
  isActive: 'isActive',
  isBillable: 'isBillable',
  lifecycleStatus: 'lifecycleStatus',
  createdByUserId: 'createdByUserId',
  updatedByUserId: 'updatedByUserId',
  submittedByUserId: 'submittedByUserId',
  submittedAt: 'submittedAt',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  publishedByUserId: 'publishedByUserId',
  publishedAt: 'publishedAt',
  consentRequired: 'consentRequired',
  preparationText: 'preparationText',
  instructionsText: 'instructionsText',
  contraindicationsText: 'contraindicationsText',
  minAgeYears: 'minAgeYears',
  maxAgeYears: 'maxAgeYears',
  genderRestriction: 'genderRestriction',
  cooldownMins: 'cooldownMins',
  requiresAppointment: 'requiresAppointment',
  estimatedDurationMins: 'estimatedDurationMins',
  prepMins: 'prepMins',
  recoveryMins: 'recoveryMins',
  tatMinsRoutine: 'tatMinsRoutine',
  tatMinsStat: 'tatMinsStat',
  chargeUnit: 'chargeUnit',
  taxApplicability: 'taxApplicability',
  taxCodeId: 'taxCodeId',
  billingPolicy: 'billingPolicy',
  shortName: 'shortName',
  displayName: 'displayName',
  description: 'description',
  searchAliases: 'searchAliases',
  specialtyId: 'specialtyId',
  subCategory: 'subCategory',
  requiresScheduling: 'requiresScheduling',
  statAvailable: 'statAvailable',
  defaultTatHours: 'defaultTatHours',
  basePrice: 'basePrice',
  costPrice: 'costPrice',
  allowDiscount: 'allowDiscount',
  maxDiscountPercent: 'maxDiscountPercent',
  effectiveFrom: 'effectiveFrom',
  effectiveTill: 'effectiveTill',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceItemAliasScalarFieldEnum = {
  id: 'id',
  serviceItemId: 'serviceItemId',
  alias: 'alias',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceItemContextScalarFieldEnum = {
  id: 'id',
  serviceItemId: 'serviceItemId',
  context: 'context',
  isEnabled: 'isEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceItemResourceRequirementScalarFieldEnum = {
  id: 'id',
  serviceItemId: 'serviceItemId',
  resourceType: 'resourceType',
  quantity: 'quantity',
  constraints: 'constraints',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceItemClinicalRuleScalarFieldEnum = {
  id: 'id',
  serviceItemId: 'serviceItemId',
  ruleType: 'ruleType',
  payload: 'payload',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceSeriesPolicyScalarFieldEnum = {
  id: 'id',
  serviceItemId: 'serviceItemId',
  totalSessions: 'totalSessions',
  maxSessionsPerDay: 'maxSessionsPerDay',
  expiryDays: 'expiryDays',
  scheduleTemplate: 'scheduleTemplate',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceItemVersionScalarFieldEnum = {
  id: 'id',
  serviceItemId: 'serviceItemId',
  version: 'version',
  status: 'status',
  snapshot: 'snapshot',
  createdByUserId: 'createdByUserId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceChargeMappingScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  serviceItemId: 'serviceItemId',
  chargeMasterItemId: 'chargeMasterItemId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceCatalogueScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  description: 'description',
  scope: 'scope',
  channel: 'channel',
  departmentId: 'departmentId',
  context: 'context',
  payerGroup: 'payerGroup',
  filterRules: 'filterRules',
  visibility: 'visibility',
  status: 'status',
  version: 'version',
  createdByUserId: 'createdByUserId',
  updatedByUserId: 'updatedByUserId',
  submittedByUserId: 'submittedByUserId',
  submittedAt: 'submittedAt',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  publishedByUserId: 'publishedByUserId',
  publishedAt: 'publishedAt',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceCatalogueItemScalarFieldEnum = {
  id: 'id',
  catalogueId: 'catalogueId',
  serviceItemId: 'serviceItemId',
  sortOrder: 'sortOrder',
  isVisible: 'isVisible',
  overrides: 'overrides',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceCatalogueVersionScalarFieldEnum = {
  id: 'id',
  catalogueId: 'catalogueId',
  version: 'version',
  status: 'status',
  snapshot: 'snapshot',
  createdByUserId: 'createdByUserId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServicePackageScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  description: 'description',
  status: 'status',
  version: 'version',
  pricingMode: 'pricingMode',
  pricingValue: 'pricingValue',
  pricingPolicy: 'pricingPolicy',
  billingChargeMasterItemId: 'billingChargeMasterItemId',
  chargeUnit: 'chargeUnit',
  taxCodeId: 'taxCodeId',
  isTaxInclusive: 'isTaxInclusive',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  durationDays: 'durationDays',
  allowComponentAddition: 'allowComponentAddition',
  allowComponentRemoval: 'allowComponentRemoval',
  allowQuantityChange: 'allowQuantityChange',
  overUtilizationPolicy: 'overUtilizationPolicy',
  underUtilizationRefund: 'underUtilizationRefund',
  minAge: 'minAge',
  maxAge: 'maxAge',
  genderRestriction: 'genderRestriction',
  applicablePayerIds: 'applicablePayerIds',
  requiresPreauth: 'requiresPreauth',
  createdByUserId: 'createdByUserId',
  updatedByUserId: 'updatedByUserId',
  submittedByUserId: 'submittedByUserId',
  submittedAt: 'submittedAt',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  publishedByUserId: 'publishedByUserId',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServicePackageComponentScalarFieldEnum = {
  id: 'id',
  packageId: 'packageId',
  componentType: 'componentType',
  serviceItemId: 'serviceItemId',
  diagnosticItemId: 'diagnosticItemId',
  chargeMasterItemId: 'chargeMasterItemId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  isIncluded: 'isIncluded',
  condition: 'condition',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServicePackageVersionScalarFieldEnum = {
  id: 'id',
  packageId: 'packageId',
  version: 'version',
  status: 'status',
  snapshot: 'snapshot',
  createdByUserId: 'createdByUserId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderSetScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  description: 'description',
  departmentId: 'departmentId',
  context: 'context',
  channel: 'channel',
  status: 'status',
  version: 'version',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdByUserId: 'createdByUserId',
  updatedByUserId: 'updatedByUserId',
  submittedByUserId: 'submittedByUserId',
  submittedAt: 'submittedAt',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  publishedByUserId: 'publishedByUserId',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderSetItemScalarFieldEnum = {
  id: 'id',
  orderSetId: 'orderSetId',
  itemType: 'itemType',
  serviceItemId: 'serviceItemId',
  diagnosticItemId: 'diagnosticItemId',
  packageId: 'packageId',
  quantity: 'quantity',
  isOptional: 'isOptional',
  rules: 'rules',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderSetVersionScalarFieldEnum = {
  id: 'id',
  orderSetId: 'orderSetId',
  version: 'version',
  status: 'status',
  snapshot: 'snapshot',
  createdByUserId: 'createdByUserId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StandardCodeSetScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  system: 'system',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StandardCodeEntryScalarFieldEnum = {
  id: 'id',
  codeSetId: 'codeSetId',
  code: 'code',
  display: 'display',
  category: 'category',
  attributes: 'attributes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceItemStandardMappingScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  serviceItemId: 'serviceItemId',
  entryId: 'entryId',
  isPrimary: 'isPrimary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceAvailabilityCalendarScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  serviceItemId: 'serviceItemId',
  name: 'name',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceAvailabilityRuleScalarFieldEnum = {
  id: 'id',
  calendarId: 'calendarId',
  dayOfWeek: 'dayOfWeek',
  startMinute: 'startMinute',
  endMinute: 'endMinute',
  capacity: 'capacity',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServiceBlackoutScalarFieldEnum = {
  id: 'id',
  calendarId: 'calendarId',
  from: 'from',
  to: 'to',
  reason: 'reason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExternalDirectorySourceScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  systemType: 'systemType',
  name: 'name',
  meta: 'meta',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExternalDirectoryEntryScalarFieldEnum = {
  id: 'id',
  sourceId: 'sourceId',
  externalCode: 'externalCode',
  name: 'name',
  kind: 'kind',
  payload: 'payload',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExternalDirectoryMappingScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  sourceId: 'sourceId',
  entryId: 'entryId',
  serviceItemId: 'serviceItemId',
  status: 'status',
  isPrimary: 'isPrimary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServicePriceHistoryScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  serviceItemId: 'serviceItemId',
  chargeMasterItemId: 'chargeMasterItemId',
  tariffRateId: 'tariffRateId',
  oldPrice: 'oldPrice',
  newPrice: 'newPrice',
  changeAmount: 'changeAmount',
  changePercent: 'changePercent',
  changeReason: 'changeReason',
  effectiveFrom: 'effectiveFrom',
  effectiveTill: 'effectiveTill',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContractServiceRateScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  serviceItemId: 'serviceItemId',
  packageId: 'packageId',
  chargeMasterItemId: 'chargeMasterItemId',
  category: 'category',
  rateType: 'rateType',
  fixedPrice: 'fixedPrice',
  percentageOfBase: 'percentageOfBase',
  discountPercent: 'discountPercent',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  version: 'version',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GovernmentSchemeConfigScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  schemeType: 'schemeType',
  schemeName: 'schemeName',
  schemeCode: 'schemeCode',
  registrationNumber: 'registrationNumber',
  registrationDate: 'registrationDate',
  validTill: 'validTill',
  shaCode: 'shaCode',
  nhaCode: 'nhaCode',
  nhaHospitalCode: 'nhaHospitalCode',
  empaneledSpecialtyIds: 'empaneledSpecialtyIds',
  preauthRequired: 'preauthRequired',
  preauthAutoApprovalLimit: 'preauthAutoApprovalLimit',
  verificationMethod: 'verificationMethod',
  packageMapping: 'packageMapping',
  claimSubmissionUrl: 'claimSubmissionUrl',
  claimSubmissionMethod: 'claimSubmissionMethod',
  claimSubmissionWindowDays: 'claimSubmissionWindowDays',
  claimProcessingTimeDays: 'claimProcessingTimeDays',
  requiredDocuments: 'requiredDocuments',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientPricingTierScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  kind: 'kind',
  name: 'name',
  code: 'code',
  description: 'description',
  assignmentRules: 'assignmentRules',
  defaultDiscountPercent: 'defaultDiscountPercent',
  defaultMarkupPercent: 'defaultMarkupPercent',
  maxDiscountCap: 'maxDiscountCap',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientPricingTierRateScalarFieldEnum = {
  id: 'id',
  tierId: 'tierId',
  serviceItemId: 'serviceItemId',
  chargeMasterItemId: 'chargeMasterItemId',
  rateAmount: 'rateAmount',
  discountPercent: 'discountPercent',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FixItTaskScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  type: 'type',
  status: 'status',
  severity: 'severity',
  entityType: 'entityType',
  entityId: 'entityId',
  title: 'title',
  details: 'details',
  serviceItemId: 'serviceItemId',
  assignedToUserId: 'assignedToUserId',
  resolvedAt: 'resolvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BulkImportJobScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  entityType: 'entityType',
  status: 'status',
  fileName: 'fileName',
  payload: 'payload',
  errors: 'errors',
  totalRows: 'totalRows',
  validRows: 'validRows',
  invalidRows: 'invalidRows',
  committedAt: 'committedAt',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProcedureBookingScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  unitId: 'unitId',
  resourceId: 'resourceId',
  patientId: 'patientId',
  departmentId: 'departmentId',
  startAt: 'startAt',
  endAt: 'endAt',
  status: 'status',
  consentOk: 'consentOk',
  anesthesiaOk: 'anesthesiaOk',
  checklistOk: 'checklistOk',
  createdByUserId: 'createdByUserId',
  cancelledAt: 'cancelledAt',
  createdAt: 'createdAt'
};

exports.Prisma.GoLiveReportScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  score: 'score',
  blockers: 'blockers',
  warnings: 'warnings',
  snapshot: 'snapshot',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.OtSuiteScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  locationNodeId: 'locationNodeId',
  code: 'code',
  name: 'name',
  status: 'status',
  config: 'config',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OtSpaceScalarFieldEnum = {
  id: 'id',
  suiteId: 'suiteId',
  type: 'type',
  code: 'code',
  name: 'name',
  locationNodeId: 'locationNodeId',
  notes: 'notes',
  meta: 'meta',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OtTheatreScalarFieldEnum = {
  id: 'id',
  spaceId: 'spaceId',
  theatreType: 'theatreType',
  airflow: 'airflow',
  pressure: 'pressure',
  isoClass: 'isoClass',
  meta: 'meta',
  specialtyCodes: 'specialtyCodes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OtRecoveryBayScalarFieldEnum = {
  id: 'id',
  spaceId: 'spaceId',
  bedCount: 'bedCount',
  monitorCount: 'monitorCount',
  oxygenPoints: 'oxygenPoints',
  meta: 'meta',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OtTableScalarFieldEnum = {
  id: 'id',
  theatreId: 'theatreId',
  code: 'code',
  name: 'name',
  isPrimary: 'isPrimary',
  manufacturer: 'manufacturer',
  model: 'model',
  serialNo: 'serialNo',
  installedAt: 'installedAt',
  meta: 'meta',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OtEquipmentScalarFieldEnum = {
  id: 'id',
  suiteId: 'suiteId',
  spaceId: 'spaceId',
  category: 'category',
  name: 'name',
  qty: 'qty',
  manufacturer: 'manufacturer',
  model: 'model',
  serialNo: 'serialNo',
  lastServiceAt: 'lastServiceAt',
  nextServiceAt: 'nextServiceAt',
  maintenanceIntervalDays: 'maintenanceIntervalDays',
  meta: 'meta',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticSectionScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticCategoryScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  sectionId: 'sectionId',
  code: 'code',
  name: 'name',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SpecimenTypeScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  container: 'container',
  minVolumeMl: 'minVolumeMl',
  handlingNotes: 'handlingNotes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticItemScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  kind: 'kind',
  sectionId: 'sectionId',
  categoryId: 'categoryId',
  specimenId: 'specimenId',
  tatMinsRoutine: 'tatMinsRoutine',
  tatMinsStat: 'tatMinsStat',
  requiresAppointment: 'requiresAppointment',
  preparationText: 'preparationText',
  consentRequired: 'consentRequired',
  serviceItemId: 'serviceItemId',
  isPanel: 'isPanel',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticPanelItemScalarFieldEnum = {
  id: 'id',
  panelId: 'panelId',
  itemId: 'itemId',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticParameterScalarFieldEnum = {
  id: 'id',
  testId: 'testId',
  code: 'code',
  name: 'name',
  dataType: 'dataType',
  unit: 'unit',
  precision: 'precision',
  allowedText: 'allowedText',
  criticalLow: 'criticalLow',
  criticalHigh: 'criticalHigh',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticReferenceRangeScalarFieldEnum = {
  id: 'id',
  parameterId: 'parameterId',
  sex: 'sex',
  ageMinDays: 'ageMinDays',
  ageMaxDays: 'ageMaxDays',
  low: 'low',
  high: 'high',
  textRange: 'textRange',
  notes: 'notes',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticTemplateScalarFieldEnum = {
  id: 'id',
  itemId: 'itemId',
  kind: 'kind',
  name: 'name',
  body: 'body',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticServicePointScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  locationNodeId: 'locationNodeId',
  unitId: 'unitId',
  code: 'code',
  name: 'name',
  type: 'type',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticServicePointRoomScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  servicePointId: 'servicePointId',
  roomId: 'roomId',
  modality: 'modality',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticServicePointResourceScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  servicePointId: 'servicePointId',
  resourceId: 'resourceId',
  modality: 'modality',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticServicePointEquipmentScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  servicePointId: 'servicePointId',
  equipmentId: 'equipmentId',
  modality: 'modality',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticCapabilityScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  diagnosticItemId: 'diagnosticItemId',
  servicePointId: 'servicePointId',
  modality: 'modality',
  defaultDurationMins: 'defaultDurationMins',
  isPrimary: 'isPrimary',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticCapabilityRoomScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  capabilityId: 'capabilityId',
  roomId: 'roomId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticCapabilityResourceScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  capabilityId: 'capabilityId',
  resourceId: 'resourceId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticCapabilityEquipmentScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  capabilityId: 'capabilityId',
  equipmentId: 'equipmentId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticPackScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  labType: 'labType',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiagnosticPackVersionScalarFieldEnum = {
  id: 'id',
  packId: 'packId',
  version: 'version',
  status: 'status',
  notes: 'notes',
  payload: 'payload',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EquipmentAssetRevisionScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  code: 'code',
  name: 'name',
  category: 'category',
  make: 'make',
  model: 'model',
  serial: 'serial',
  ownerDepartmentId: 'ownerDepartmentId',
  operationalStatus: 'operationalStatus',
  isSchedulable: 'isSchedulable',
  amcVendor: 'amcVendor',
  amcValidFrom: 'amcValidFrom',
  amcValidTo: 'amcValidTo',
  warrantyValidTo: 'warrantyValidTo',
  pmFrequencyDays: 'pmFrequencyDays',
  nextPmDueAt: 'nextPmDueAt',
  aerbLicenseNo: 'aerbLicenseNo',
  aerbValidTo: 'aerbValidTo',
  pcpndtRegNo: 'pcpndtRegNo',
  pcpndtValidTo: 'pcpndtValidTo',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.EquipmentPlacementScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  branchId: 'branchId',
  locationNodeId: 'locationNodeId',
  unitId: 'unitId',
  roomId: 'roomId',
  resourceId: 'resourceId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.EquipmentMovementScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  branchId: 'branchId',
  reason: 'reason',
  notes: 'notes',
  fromLocationNodeId: 'fromLocationNodeId',
  fromUnitId: 'fromUnitId',
  fromRoomId: 'fromRoomId',
  fromResourceId: 'fromResourceId',
  toLocationNodeId: 'toLocationNodeId',
  toUnitId: 'toUnitId',
  toRoomId: 'toRoomId',
  toResourceId: 'toResourceId',
  movedAt: 'movedAt',
  movedByUserId: 'movedByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.EquipmentDocumentScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  assetId: 'assetId',
  type: 'type',
  title: 'title',
  fileUrl: 'fileUrl',
  fileMime: 'fileMime',
  fileSize: 'fileSize',
  checksum: 'checksum',
  refNo: 'refNo',
  issuedAt: 'issuedAt',
  validFrom: 'validFrom',
  validTo: 'validTo',
  meta: 'meta',
  uploadedByUserId: 'uploadedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EquipmentContractScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  assetId: 'assetId',
  type: 'type',
  contractNo: 'contractNo',
  vendorName: 'vendorName',
  vendorContact: 'vendorContact',
  startAt: 'startAt',
  endAt: 'endAt',
  terms: 'terms',
  isActive: 'isActive',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EquipmentMaintenanceTaskScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  assetId: 'assetId',
  type: 'type',
  status: 'status',
  dueAt: 'dueAt',
  scheduledFor: 'scheduledFor',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  downtimeTicketId: 'downtimeTicketId',
  performedByVendor: 'performedByVendor',
  performedByStaffId: 'performedByStaffId',
  checklist: 'checklist',
  measurements: 'measurements',
  outcomeNotes: 'outcomeNotes',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EquipmentComplianceEvidenceScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  assetId: 'assetId',
  complianceCode: 'complianceCode',
  evidenceType: 'evidenceType',
  documentId: 'documentId',
  status: 'status',
  verifiedAt: 'verifiedAt',
  verifiedByUserId: 'verifiedByUserId',
  notes: 'notes',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GovernedChangeRequestScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  entity: 'entity',
  entityId: 'entityId',
  action: 'action',
  payload: 'payload',
  effectiveAt: 'effectiveAt',
  status: 'status',
  createdByUserId: 'createdByUserId',
  submittedAt: 'submittedAt',
  submittedByUserId: 'submittedByUserId',
  approvedAt: 'approvedAt',
  approvedByUserId: 'approvedByUserId',
  approvalNote: 'approvalNote',
  rejectedAt: 'rejectedAt',
  rejectedByUserId: 'rejectedByUserId',
  rejectionReason: 'rejectionReason',
  appliedAt: 'appliedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PharmacyStoreScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  storeCode: 'storeCode',
  storeName: 'storeName',
  storeType: 'storeType',
  parentStoreId: 'parentStoreId',
  locationNodeId: 'locationNodeId',
  pharmacistInChargeId: 'pharmacistInChargeId',
  drugLicenseNumber: 'drugLicenseNumber',
  drugLicenseExpiry: 'drugLicenseExpiry',
  is24x7: 'is24x7',
  canDispense: 'canDispense',
  canIndent: 'canIndent',
  canReceiveStock: 'canReceiveStock',
  canReturnVendor: 'canReturnVendor',
  operatingHours: 'operatingHours',
  autoIndentEnabled: 'autoIndentEnabled',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DrugMasterScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  drugCode: 'drugCode',
  genericName: 'genericName',
  brandName: 'brandName',
  manufacturer: 'manufacturer',
  category: 'category',
  dosageForm: 'dosageForm',
  strength: 'strength',
  route: 'route',
  therapeuticClass: 'therapeuticClass',
  pharmacologicalClass: 'pharmacologicalClass',
  scheduleClass: 'scheduleClass',
  isNarcotic: 'isNarcotic',
  isPsychotropic: 'isPsychotropic',
  isControlled: 'isControlled',
  isAntibiotic: 'isAntibiotic',
  isHighAlert: 'isHighAlert',
  isLasa: 'isLasa',
  mrp: 'mrp',
  purchasePrice: 'purchasePrice',
  hsnCode: 'hsnCode',
  gstRate: 'gstRate',
  packSize: 'packSize',
  defaultDosage: 'defaultDosage',
  maxDailyDose: 'maxDailyDose',
  contraindications: 'contraindications',
  formularyStatus: 'formularyStatus',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  drugCategoryNodeId: 'drugCategoryNodeId'
};

exports.Prisma.DrugInteractionScalarFieldEnum = {
  id: 'id',
  drugAId: 'drugAId',
  drugBId: 'drugBId',
  severity: 'severity',
  description: 'description',
  recommendation: 'recommendation',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FormularyScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  version: 'version',
  effectiveDate: 'effectiveDate',
  status: 'status',
  publishedAt: 'publishedAt',
  publishedByUserId: 'publishedByUserId',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FormularyItemScalarFieldEnum = {
  id: 'id',
  formularyId: 'formularyId',
  drugMasterId: 'drugMasterId',
  tier: 'tier',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TherapeuticSubstitutionScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  sourceDrugId: 'sourceDrugId',
  targetDrugId: 'targetDrugId',
  notes: 'notes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PharmSupplierScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  supplierCode: 'supplierCode',
  supplierName: 'supplierName',
  gstin: 'gstin',
  drugLicenseNumber: 'drugLicenseNumber',
  drugLicenseExpiry: 'drugLicenseExpiry',
  contactPerson: 'contactPerson',
  phone: 'phone',
  email: 'email',
  address: 'address',
  paymentTermsDays: 'paymentTermsDays',
  discountTerms: 'discountTerms',
  deliveryLeadTimeDays: 'deliveryLeadTimeDays',
  productCategories: 'productCategories',
  rating: 'rating',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupplierStoreMappingScalarFieldEnum = {
  id: 'id',
  supplierId: 'supplierId',
  pharmacyStoreId: 'pharmacyStoreId',
  createdAt: 'createdAt'
};

exports.Prisma.SupplierDrugMappingScalarFieldEnum = {
  id: 'id',
  supplierId: 'supplierId',
  drugMasterId: 'drugMasterId',
  supplierPrice: 'supplierPrice',
  leadTimeDays: 'leadTimeDays',
  isPreferred: 'isPreferred',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryConfigScalarFieldEnum = {
  id: 'id',
  pharmacyStoreId: 'pharmacyStoreId',
  drugMasterId: 'drugMasterId',
  minimumStock: 'minimumStock',
  maximumStock: 'maximumStock',
  reorderLevel: 'reorderLevel',
  reorderQuantity: 'reorderQuantity',
  safetyStock: 'safetyStock',
  abcClass: 'abcClass',
  vedClass: 'vedClass',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoreIndentMappingScalarFieldEnum = {
  id: 'id',
  requestingStoreId: 'requestingStoreId',
  supplyingStoreId: 'supplyingStoreId',
  approvalRole: 'approvalRole',
  slaDurationMinutes: 'slaDurationMinutes',
  isEmergencyOverride: 'isEmergencyOverride',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NarcoticsRegisterScalarFieldEnum = {
  id: 'id',
  pharmacyStoreId: 'pharmacyStoreId',
  drugMasterId: 'drugMasterId',
  transactionType: 'transactionType',
  quantity: 'quantity',
  batchNumber: 'batchNumber',
  balanceBefore: 'balanceBefore',
  balanceAfter: 'balanceAfter',
  witnessName: 'witnessName',
  witnessSignature: 'witnessSignature',
  notes: 'notes',
  performedByUserId: 'performedByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.DrugLicenseHistoryScalarFieldEnum = {
  id: 'id',
  pharmacyStoreId: 'pharmacyStoreId',
  licenseNumber: 'licenseNumber',
  validFrom: 'validFrom',
  validTo: 'validTo',
  documentUrl: 'documentUrl',
  uploadedByUserId: 'uploadedByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.DrugCategoryNodeScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  parentId: 'parentId',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientInsurancePolicyScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  patientId: 'patientId',
  payerId: 'payerId',
  contractId: 'contractId',
  policyNumber: 'policyNumber',
  memberId: 'memberId',
  groupId: 'groupId',
  employerName: 'employerName',
  planName: 'planName',
  relationship: 'relationship',
  status: 'status',
  validFrom: 'validFrom',
  validTo: 'validTo',
  sumInsured: 'sumInsured',
  balanceRemaining: 'balanceRemaining',
  cardNumber: 'cardNumber',
  cardImageUrl: 'cardImageUrl',
  verifiedAt: 'verifiedAt',
  verifiedByUserId: 'verifiedByUserId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InsuranceCaseScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  caseNumber: 'caseNumber',
  patientId: 'patientId',
  encounterId: 'encounterId',
  admissionId: 'admissionId',
  policyId: 'policyId',
  payerId: 'payerId',
  contractId: 'contractId',
  schemeConfigId: 'schemeConfigId',
  caseType: 'caseType',
  status: 'status',
  treatingDoctorId: 'treatingDoctorId',
  primaryDiagnosis: 'primaryDiagnosis',
  procedures: 'procedures',
  packageCode: 'packageCode',
  packageName: 'packageName',
  estimatedAmount: 'estimatedAmount',
  approvedAmount: 'approvedAmount',
  claimedAmount: 'claimedAmount',
  settledAmount: 'settledAmount',
  assignedToUserId: 'assignedToUserId',
  slaDeadline: 'slaDeadline',
  escalatedAt: 'escalatedAt',
  notes: 'notes',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PreauthRequestScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  insuranceCaseId: 'insuranceCaseId',
  requestNumber: 'requestNumber',
  version: 'version',
  status: 'status',
  requestedAmount: 'requestedAmount',
  approvedAmount: 'approvedAmount',
  packageCode: 'packageCode',
  procedureSummary: 'procedureSummary',
  clinicalNotes: 'clinicalNotes',
  primaryDiagnosisCode: 'primaryDiagnosisCode',
  primaryDiagnosisDesc: 'primaryDiagnosisDesc',
  secondaryDiagnosisCodes: 'secondaryDiagnosisCodes',
  procedureCodes: 'procedureCodes',
  hbpPackageCode: 'hbpPackageCode',
  implantDetails: 'implantDetails',
  investigationSummary: 'investigationSummary',
  otNotes: 'otNotes',
  submittedAt: 'submittedAt',
  submittedByUserId: 'submittedByUserId',
  approvedAt: 'approvedAt',
  approvedByUserId: 'approvedByUserId',
  rejectedAt: 'rejectedAt',
  rejectionReason: 'rejectionReason',
  validTill: 'validTill',
  enhancementAmount: 'enhancementAmount',
  enhancementReason: 'enhancementReason',
  gatewayRefId: 'gatewayRefId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PreauthQueryScalarFieldEnum = {
  id: 'id',
  preauthId: 'preauthId',
  queryText: 'queryText',
  querySource: 'querySource',
  queriedAt: 'queriedAt',
  queriedByUserId: 'queriedByUserId',
  responseText: 'responseText',
  respondedAt: 'respondedAt',
  respondedByUserId: 'respondedByUserId',
  deadline: 'deadline',
  attachmentUrls: 'attachmentUrls',
  meta: 'meta',
  createdAt: 'createdAt'
};

exports.Prisma.ClaimScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  insuranceCaseId: 'insuranceCaseId',
  claimNumber: 'claimNumber',
  claimType: 'claimType',
  version: 'version',
  status: 'status',
  totalAmount: 'totalAmount',
  approvedAmount: 'approvedAmount',
  deductedAmount: 'deductedAmount',
  paidAmount: 'paidAmount',
  submittedAt: 'submittedAt',
  submittedByUserId: 'submittedByUserId',
  acknowledgedAt: 'acknowledgedAt',
  approvedAt: 'approvedAt',
  approvedByUserId: 'approvedByUserId',
  rejectedAt: 'rejectedAt',
  rejectionReason: 'rejectionReason',
  paidAt: 'paidAt',
  gatewayRefId: 'gatewayRefId',
  resubmissionOfId: 'resubmissionOfId',
  notes: 'notes',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClaimLineItemScalarFieldEnum = {
  id: 'id',
  claimId: 'claimId',
  serviceItemId: 'serviceItemId',
  chargeMasterItemId: 'chargeMasterItemId',
  description: 'description',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalPrice: 'totalPrice',
  icdCode: 'icdCode',
  icdDescription: 'icdDescription',
  cptCode: 'cptCode',
  cptDescription: 'cptDescription',
  snomedCode: 'snomedCode',
  modifiers: 'modifiers',
  placeOfService: 'placeOfService',
  diagnosisRef: 'diagnosisRef',
  approvedQuantity: 'approvedQuantity',
  approvedUnitPrice: 'approvedUnitPrice',
  approvedTotal: 'approvedTotal',
  deniedAmount: 'deniedAmount',
  denialReasonCode: 'denialReasonCode',
  denialNotes: 'denialNotes',
  packageCode: 'packageCode',
  hsnSac: 'hsnSac',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClaimDeductionScalarFieldEnum = {
  id: 'id',
  claimId: 'claimId',
  reasonCode: 'reasonCode',
  reasonCategory: 'reasonCategory',
  description: 'description',
  amount: 'amount',
  isDisputed: 'isDisputed',
  disputeNotes: 'disputeNotes',
  createdAt: 'createdAt'
};

exports.Prisma.ClaimVersionScalarFieldEnum = {
  id: 'id',
  claimId: 'claimId',
  versionNumber: 'versionNumber',
  snapshot: 'snapshot',
  createdAt: 'createdAt',
  createdByUserId: 'createdByUserId',
  changeReason: 'changeReason'
};

exports.Prisma.InsuranceDocumentScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  title: 'title',
  fileUrl: 'fileUrl',
  fileMime: 'fileMime',
  fileSizeBytes: 'fileSizeBytes',
  checksum: 'checksum',
  docRole: 'docRole',
  version: 'version',
  uploadedAt: 'uploadedAt',
  uploadedByUserId: 'uploadedByUserId',
  verifiedAt: 'verifiedAt',
  verifiedByUserId: 'verifiedByUserId',
  tags: 'tags',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InsuranceDocumentLinkScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  entityType: 'entityType',
  entityId: 'entityId',
  isRequired: 'isRequired',
  insuranceCaseId: 'insuranceCaseId',
  preauthRequestId: 'preauthRequestId',
  claimId: 'claimId',
  policyId: 'policyId',
  createdAt: 'createdAt'
};

exports.Prisma.PayerIntegrationConfigScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  payerId: 'payerId',
  integrationMode: 'integrationMode',
  hcxParticipantCode: 'hcxParticipantCode',
  hcxEndpointUrl: 'hcxEndpointUrl',
  hcxAuthConfig: 'hcxAuthConfig',
  apiBaseUrl: 'apiBaseUrl',
  apiAuthMethod: 'apiAuthMethod',
  apiAuthConfig: 'apiAuthConfig',
  sftpHost: 'sftpHost',
  sftpPort: 'sftpPort',
  sftpPath: 'sftpPath',
  sftpAuthConfig: 'sftpAuthConfig',
  portalUrl: 'portalUrl',
  portalNotes: 'portalNotes',
  webhookSecret: 'webhookSecret',
  webhookUrl: 'webhookUrl',
  retryMaxAttempts: 'retryMaxAttempts',
  retryBackoffMs: 'retryBackoffMs',
  pollingIntervalMs: 'pollingIntervalMs',
  isActive: 'isActive',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentAdviceScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  claimId: 'claimId',
  adviceNumber: 'adviceNumber',
  utrNumber: 'utrNumber',
  paymentDate: 'paymentDate',
  amount: 'amount',
  paymentMode: 'paymentMode',
  status: 'status',
  bankReference: 'bankReference',
  shortPaymentReason: 'shortPaymentReason',
  reconciledAt: 'reconciledAt',
  reconciledByUserId: 'reconciledByUserId',
  meta: 'meta',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GatewayTransactionScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  payerIntegrationConfigId: 'payerIntegrationConfigId',
  txType: 'txType',
  txStatus: 'txStatus',
  entityType: 'entityType',
  entityId: 'entityId',
  requestPayload: 'requestPayload',
  responsePayload: 'responsePayload',
  externalRefId: 'externalRefId',
  sentAt: 'sentAt',
  respondedAt: 'respondedAt',
  attempts: 'attempts',
  lastError: 'lastError',
  nextRetryAt: 'nextRetryAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayerDocumentTemplateScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  payerId: 'payerId',
  name: 'name',
  scope: 'scope',
  caseTypes: 'caseTypes',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayerDocumentRuleScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  docRole: 'docRole',
  label: 'label',
  description: 'description',
  isRequired: 'isRequired',
  requiredAt: 'requiredAt',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplianceWorkspaceScalarFieldEnum = {
  id: 'id',
  orgId: 'orgId',
  branchId: 'branchId',
  type: 'type',
  name: 'name',
  status: 'status',
  readinessScore: 'readinessScore',
  lastComputedAt: 'lastComputedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AbdmConfigScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  environment: 'environment',
  clientId: 'clientId',
  clientSecretEnc: 'clientSecretEnc',
  callbackUrls: 'callbackUrls',
  featureTogglesJson: 'featureTogglesJson',
  status: 'status',
  lastTestedAt: 'lastTestedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HfrFacilityProfileScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  facilityName: 'facilityName',
  ownershipType: 'ownershipType',
  facilityType: 'facilityType',
  systemsOfMedicine: 'systemsOfMedicine',
  servicesOffered: 'servicesOffered',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  latitude: 'latitude',
  longitude: 'longitude',
  contactPhone: 'contactPhone',
  contactEmail: 'contactEmail',
  hfrId: 'hfrId',
  verificationStatus: 'verificationStatus',
  verificationNotes: 'verificationNotes',
  lastSyncedAt: 'lastSyncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HprProfessionalLinkScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  staffId: 'staffId',
  hprId: 'hprId',
  category: 'category',
  registrationStatus: 'registrationStatus',
  verifiedAt: 'verifiedAt',
  verifiedByStaffId: 'verifiedByStaffId',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchemeEmpanelmentScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  scheme: 'scheme',
  empanelmentNumber: 'empanelmentNumber',
  shaCode: 'shaCode',
  state: 'state',
  cityCategory: 'cityCategory',
  status: 'status',
  govSchemeConfigId: 'govSchemeConfigId',
  lastSyncedAt: 'lastSyncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchemeRateCardScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  scheme: 'scheme',
  version: 'version',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchemeRateCardItemScalarFieldEnum = {
  id: 'id',
  rateCardId: 'rateCardId',
  code: 'code',
  name: 'name',
  rate: 'rate',
  inclusions: 'inclusions',
  exclusions: 'exclusions',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchemeMappingScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  scheme: 'scheme',
  externalCode: 'externalCode',
  externalName: 'externalName',
  internalServiceId: 'internalServiceId',
  internalTariffItemId: 'internalTariffItemId',
  rules: 'rules',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchemeApiCredentialScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  scheme: 'scheme',
  apiKeyEnc: 'apiKeyEnc',
  apiSecretEnc: 'apiSecretEnc',
  baseUrl: 'baseUrl',
  environment: 'environment',
  status: 'status',
  lastTestedAt: 'lastTestedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NabhTemplateScalarFieldEnum = {
  id: 'id',
  orgId: 'orgId',
  name: 'name',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NabhTemplateItemScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  chapter: 'chapter',
  standardCode: 'standardCode',
  meCode: 'meCode',
  title: 'title',
  description: 'description',
  evidenceRequired: 'evidenceRequired',
  riskLevel: 'riskLevel',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NabhWorkspaceItemScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  chapter: 'chapter',
  standardCode: 'standardCode',
  meCode: 'meCode',
  title: 'title',
  description: 'description',
  status: 'status',
  riskLevel: 'riskLevel',
  evidenceRequired: 'evidenceRequired',
  ownerStaffId: 'ownerStaffId',
  dueDate: 'dueDate',
  notes: 'notes',
  verifiedAt: 'verifiedAt',
  verifiedByStaffId: 'verifiedByStaffId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EvidenceArtifactScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  title: 'title',
  tags: 'tags',
  status: 'status',
  fileKey: 'fileKey',
  fileName: 'fileName',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  expiresAt: 'expiresAt',
  uploadedByStaffId: 'uploadedByStaffId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EvidenceLinkScalarFieldEnum = {
  id: 'id',
  evidenceId: 'evidenceId',
  targetType: 'targetType',
  targetId: 'targetId',
  createdAt: 'createdAt'
};

exports.Prisma.AuditCycleScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  auditorStaffIds: 'auditorStaffIds',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditFindingScalarFieldEnum = {
  id: 'id',
  auditId: 'auditId',
  itemId: 'itemId',
  severity: 'severity',
  description: 'description',
  recommendedAction: 'recommendedAction',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CapaActionScalarFieldEnum = {
  id: 'id',
  findingId: 'findingId',
  ownerStaffId: 'ownerStaffId',
  dueDate: 'dueDate',
  actionPlan: 'actionPlan',
  status: 'status',
  closureNotes: 'closureNotes',
  closedAt: 'closedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplianceApprovalScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  status: 'status',
  changeType: 'changeType',
  entityType: 'entityType',
  entityId: 'entityId',
  payloadDraft: 'payloadDraft',
  notes: 'notes',
  requestedByStaffId: 'requestedByStaffId',
  decidedByStaffId: 'decidedByStaffId',
  decidedAt: 'decidedAt',
  decisionNotes: 'decisionNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComplianceAuditLogScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  entityType: 'entityType',
  entityId: 'entityId',
  action: 'action',
  before: 'before',
  after: 'after',
  actorStaffId: 'actorStaffId',
  actorIp: 'actorIp',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.BloodBankFacilityScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  facilityType: 'facilityType',
  drugLicenseNo: 'drugLicenseNo',
  sbtcRegNo: 'sbtcRegNo',
  nacoId: 'nacoId',
  licenseValidTo: 'licenseValidTo',
  operatingHours: 'operatingHours',
  physicalLayout: 'physicalLayout',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BloodComponentMasterScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  componentType: 'componentType',
  name: 'name',
  code: 'code',
  shelfLifeDays: 'shelfLifeDays',
  storageMinTempC: 'storageMinTempC',
  storageMaxTempC: 'storageMaxTempC',
  volumeMinMl: 'volumeMinMl',
  volumeMaxMl: 'volumeMaxMl',
  preparationMethod: 'preparationMethod',
  requiresAgitation: 'requiresAgitation',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BloodBankEquipmentScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  equipmentType: 'equipmentType',
  equipmentId: 'equipmentId',
  make: 'make',
  model: 'model',
  serialNumber: 'serialNumber',
  location: 'location',
  capacityUnits: 'capacityUnits',
  tempRangeMinC: 'tempRangeMinC',
  tempRangeMaxC: 'tempRangeMaxC',
  alarmThresholdMinC: 'alarmThresholdMinC',
  alarmThresholdMaxC: 'alarmThresholdMaxC',
  pollingIntervalSec: 'pollingIntervalSec',
  calibrationDueDate: 'calibrationDueDate',
  calibrationInterval: 'calibrationInterval',
  lastCalibratedAt: 'lastCalibratedAt',
  calibratedByStaffId: 'calibratedByStaffId',
  iotSensorId: 'iotSensorId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EquipmentTempLogScalarFieldEnum = {
  id: 'id',
  equipmentId: 'equipmentId',
  temperatureC: 'temperatureC',
  recordedAt: 'recordedAt',
  isBreaching: 'isBreaching',
  acknowledged: 'acknowledged',
  acknowledgedByStaffId: 'acknowledgedByStaffId',
  acknowledgedAt: 'acknowledgedAt'
};

exports.Prisma.BloodBankReagentScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  name: 'name',
  code: 'code',
  category: 'category',
  lotNumber: 'lotNumber',
  expiryDate: 'expiryDate',
  stockQty: 'stockQty',
  minStockQty: 'minStockQty',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BBTariffConfigScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  componentMasterId: 'componentMasterId',
  chargeType: 'chargeType',
  amount: 'amount',
  currency: 'currency',
  gstPercent: 'gstPercent',
  govSchemeCode: 'govSchemeCode',
  govSchemeRate: 'govSchemeRate',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DonorScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  donorNumber: 'donorNumber',
  donorType: 'donorType',
  name: 'name',
  gender: 'gender',
  dateOfBirth: 'dateOfBirth',
  age: 'age',
  mobile: 'mobile',
  email: 'email',
  aadhaarNo: 'aadhaarNo',
  address: 'address',
  photoUrl: 'photoUrl',
  bloodGroup: 'bloodGroup',
  donorStatus: 'donorStatus',
  donationCount: 'donationCount',
  lastDonationDate: 'lastDonationDate',
  nextEligibleDate: 'nextEligibleDate',
  patientId: 'patientId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DonorDeferralScalarFieldEnum = {
  id: 'id',
  donorId: 'donorId',
  deferralType: 'deferralType',
  reason: 'reason',
  startDate: 'startDate',
  endDate: 'endDate',
  deferredByStaffId: 'deferredByStaffId',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.DonorScreeningScalarFieldEnum = {
  id: 'id',
  donorId: 'donorId',
  screeningDate: 'screeningDate',
  dhqResponses: 'dhqResponses',
  hemoglobinGdl: 'hemoglobinGdl',
  weightKg: 'weightKg',
  bpSystolic: 'bpSystolic',
  bpDiastolic: 'bpDiastolic',
  pulseRate: 'pulseRate',
  temperatureC: 'temperatureC',
  veinAssessment: 'veinAssessment',
  eligibilityDecision: 'eligibilityDecision',
  decisionNotes: 'decisionNotes',
  decidedByStaffId: 'decidedByStaffId',
  consentGiven: 'consentGiven',
  consentSignature: 'consentSignature',
  consentTimestamp: 'consentTimestamp',
  createdAt: 'createdAt'
};

exports.Prisma.BloodUnitScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  unitNumber: 'unitNumber',
  barcode: 'barcode',
  donorId: 'donorId',
  bagType: 'bagType',
  collectionType: 'collectionType',
  bloodGroup: 'bloodGroup',
  rhFactor: 'rhFactor',
  collectionStartAt: 'collectionStartAt',
  collectionEndAt: 'collectionEndAt',
  volumeCollectedMl: 'volumeCollectedMl',
  segmentCount: 'segmentCount',
  status: 'status',
  parentUnitId: 'parentUnitId',
  componentType: 'componentType',
  expiryDate: 'expiryDate',
  donorAdverseEvent: 'donorAdverseEvent',
  donorAdverseSeverity: 'donorAdverseSeverity',
  collectedByStaffId: 'collectedByStaffId',
  pilotTubeLabels: 'pilotTubeLabels',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BloodGroupingResultScalarFieldEnum = {
  id: 'id',
  bloodUnitId: 'bloodUnitId',
  forwardGrouping: 'forwardGrouping',
  reverseGrouping: 'reverseGrouping',
  aboGroup: 'aboGroup',
  rhType: 'rhType',
  confirmedGroup: 'confirmedGroup',
  antibodyScreenResult: 'antibodyScreenResult',
  antibodyIdentified: 'antibodyIdentified',
  hasDiscrepancy: 'hasDiscrepancy',
  discrepancyNotes: 'discrepancyNotes',
  method: 'method',
  testedByStaffId: 'testedByStaffId',
  verifiedByStaffId: 'verifiedByStaffId',
  verifiedAt: 'verifiedAt',
  createdAt: 'createdAt'
};

exports.Prisma.TTITestRecordScalarFieldEnum = {
  id: 'id',
  bloodUnitId: 'bloodUnitId',
  testName: 'testName',
  method: 'method',
  kitName: 'kitName',
  kitLotNo: 'kitLotNo',
  result: 'result',
  rawValue: 'rawValue',
  testedByStaffId: 'testedByStaffId',
  verifiedByStaffId: 'verifiedByStaffId',
  verifiedAt: 'verifiedAt',
  createdAt: 'createdAt'
};

exports.Prisma.BloodInventorySlotScalarFieldEnum = {
  id: 'id',
  bloodUnitId: 'bloodUnitId',
  equipmentId: 'equipmentId',
  shelf: 'shelf',
  slot: 'slot',
  assignedAt: 'assignedAt',
  removedAt: 'removedAt'
};

exports.Prisma.BloodRequestScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  requestNumber: 'requestNumber',
  patientId: 'patientId',
  encounterId: 'encounterId',
  requestedComponent: 'requestedComponent',
  quantityUnits: 'quantityUnits',
  urgency: 'urgency',
  indication: 'indication',
  diagnosis: 'diagnosis',
  status: 'status',
  requestedByStaffId: 'requestedByStaffId',
  requestedAt: 'requestedAt',
  slaTargetMinutes: 'slaTargetMinutes',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientBloodSampleScalarFieldEnum = {
  id: 'id',
  requestId: 'requestId',
  sampleId: 'sampleId',
  collectedAt: 'collectedAt',
  collectedByStaffId: 'collectedByStaffId',
  verifiedByStaffId: 'verifiedByStaffId',
  verificationMethod: 'verificationMethod',
  patientBloodGroup: 'patientBloodGroup',
  patientAntibodies: 'patientAntibodies',
  groupHistoryConsistent: 'groupHistoryConsistent',
  createdAt: 'createdAt'
};

exports.Prisma.CrossMatchTestScalarFieldEnum = {
  id: 'id',
  requestId: 'requestId',
  sampleId: 'sampleId',
  bloodUnitId: 'bloodUnitId',
  method: 'method',
  result: 'result',
  certificateNumber: 'certificateNumber',
  validUntil: 'validUntil',
  testedByStaffId: 'testedByStaffId',
  verifiedByStaffId: 'verifiedByStaffId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BloodIssueScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  issueNumber: 'issueNumber',
  bloodUnitId: 'bloodUnitId',
  requestId: 'requestId',
  crossMatchId: 'crossMatchId',
  issuedToWard: 'issuedToWard',
  issuedToPerson: 'issuedToPerson',
  transportBoxTemp: 'transportBoxTemp',
  visualInspectionOk: 'visualInspectionOk',
  inspectionNotes: 'inspectionNotes',
  issuedByStaffId: 'issuedByStaffId',
  issuedAt: 'issuedAt',
  isReturned: 'isReturned',
  returnedAt: 'returnedAt',
  returnReason: 'returnReason',
  restockEligible: 'restockEligible',
  isEmergencyIssue: 'isEmergencyIssue',
  mtpSessionId: 'mtpSessionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransfusionRecordScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  issueId: 'issueId',
  patientId: 'patientId',
  bedsideVerifiedAt: 'bedsideVerifiedAt',
  bedsideVerifier1StaffId: 'bedsideVerifier1StaffId',
  bedsideVerifier2StaffId: 'bedsideVerifier2StaffId',
  patientWristbandScan: 'patientWristbandScan',
  unitBarcodeScan: 'unitBarcodeScan',
  bedsideVerificationOk: 'bedsideVerificationOk',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  totalVolumeMl: 'totalVolumeMl',
  preVitals: 'preVitals',
  vitals15Min: 'vitals15Min',
  vitals30Min: 'vitals30Min',
  vitals1Hr: 'vitals1Hr',
  postVitals: 'postVitals',
  hasReaction: 'hasReaction',
  administeredByStaffId: 'administeredByStaffId',
  doctorNotifiedAt: 'doctorNotifiedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransfusionReactionScalarFieldEnum = {
  id: 'id',
  transfusionId: 'transfusionId',
  reactionType: 'reactionType',
  severity: 'severity',
  onsetAt: 'onsetAt',
  description: 'description',
  transfusionStopped: 'transfusionStopped',
  managementNotes: 'managementNotes',
  investigationResults: 'investigationResults',
  rootCause: 'rootCause',
  correctiveAction: 'correctiveAction',
  reportedByStaffId: 'reportedByStaffId',
  investigatedByStaffId: 'investigatedByStaffId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QualityControlRecordScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  recordType: 'recordType',
  testSystem: 'testSystem',
  equipmentId: 'equipmentId',
  qcLevel: 'qcLevel',
  expectedValue: 'expectedValue',
  observedValue: 'observedValue',
  westgardResult: 'westgardResult',
  westgardRule: 'westgardRule',
  eqasCycleId: 'eqasCycleId',
  eqasProvider: 'eqasProvider',
  eqasResult: 'eqasResult',
  calibrationValues: 'calibrationValues',
  calibrationPassFail: 'calibrationPassFail',
  correctiveAction: 'correctiveAction',
  performedByStaffId: 'performedByStaffId',
  performedAt: 'performedAt',
  reviewedByStaffId: 'reviewedByStaffId',
  reviewedAt: 'reviewedAt',
  createdAt: 'createdAt'
};

exports.Prisma.BloodDonationCampScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  campCode: 'campCode',
  campDate: 'campDate',
  location: 'location',
  organizer: 'organizer',
  estimatedDonors: 'estimatedDonors',
  actualDonors: 'actualDonors',
  unitsCollected: 'unitsCollected',
  teamAllocation: 'teamAllocation',
  equipmentChecklist: 'equipmentChecklist',
  status: 'status',
  syncedAt: 'syncedAt',
  summary: 'summary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MTPSessionScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  patientId: 'patientId',
  encounterId: 'encounterId',
  activatedByStaffId: 'activatedByStaffId',
  activatedAt: 'activatedAt',
  deactivatedByStaffId: 'deactivatedByStaffId',
  deactivatedAt: 'deactivatedAt',
  packRatio: 'packRatio',
  status: 'status',
  summary: 'summary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MSBOSConfigScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  procedureCode: 'procedureCode',
  procedureName: 'procedureName',
  recommendedPRBC: 'recommendedPRBC',
  recommendedFFP: 'recommendedFFP',
  recommendedPlatelet: 'recommendedPlatelet',
  recommendedCryo: 'recommendedCryo',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.FacilityCategory = exports.$Enums.FacilityCategory = {
  SERVICE: 'SERVICE',
  CLINICAL: 'CLINICAL',
  SUPPORT: 'SUPPORT'
};

exports.SpecialtyKind = exports.$Enums.SpecialtyKind = {
  SPECIALTY: 'SPECIALTY',
  SUPER_SPECIALTY: 'SUPER_SPECIALTY'
};

exports.StaffTitle = exports.$Enums.StaffTitle = {
  DR: 'DR',
  MR: 'MR',
  MS: 'MS',
  MRS: 'MRS',
  PROF: 'PROF',
  OTHER: 'OTHER'
};

exports.Gender = exports.$Enums.Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER'
};

exports.BloodGroup = exports.$Enums.BloodGroup = {
  A_POS: 'A_POS',
  A_NEG: 'A_NEG',
  B_POS: 'B_POS',
  B_NEG: 'B_NEG',
  O_POS: 'O_POS',
  O_NEG: 'O_NEG',
  AB_POS: 'AB_POS',
  AB_NEG: 'AB_NEG',
  BOMBAY: 'BOMBAY',
  RARE_OTHER: 'RARE_OTHER'
};

exports.MaritalStatus = exports.$Enums.MaritalStatus = {
  SINGLE: 'SINGLE',
  MARRIED: 'MARRIED',
  DIVORCED: 'DIVORCED',
  SEPARATED: 'SEPARATED',
  WIDOWED: 'WIDOWED'
};

exports.StaffType = exports.$Enums.StaffType = {
  DOCTOR_CONSULTANT: 'DOCTOR_CONSULTANT',
  DOCTOR_RESIDENT: 'DOCTOR_RESIDENT',
  DOCTOR_INTERN: 'DOCTOR_INTERN',
  NURSE_HEAD: 'NURSE_HEAD',
  NURSE_STAFF: 'NURSE_STAFF',
  NURSE_TRAINEE: 'NURSE_TRAINEE',
  TECHNICIAN_LAB: 'TECHNICIAN_LAB',
  TECHNICIAN_RADIOLOGY: 'TECHNICIAN_RADIOLOGY',
  TECHNICIAN_OT: 'TECHNICIAN_OT',
  TECHNICIAN_DIALYSIS: 'TECHNICIAN_DIALYSIS',
  TECHNICIAN_ANESTHESIA: 'TECHNICIAN_ANESTHESIA',
  PHARMACIST: 'PHARMACIST',
  PHARMACIST_ASSISTANT: 'PHARMACIST_ASSISTANT',
  PHYSIOTHERAPIST: 'PHYSIOTHERAPIST',
  DIETICIAN: 'DIETICIAN',
  COUNSELOR: 'COUNSELOR',
  RECEPTIONIST: 'RECEPTIONIST',
  CASHIER: 'CASHIER',
  HOUSEKEEPING: 'HOUSEKEEPING',
  SECURITY: 'SECURITY',
  ADMIN_STAFF: 'ADMIN_STAFF',
  OTHER: 'OTHER'
};

exports.StaffEmploymentType = exports.$Enums.StaffEmploymentType = {
  PERMANENT: 'PERMANENT',
  CONTRACT: 'CONTRACT',
  CONSULTANT: 'CONSULTANT',
  VISITING: 'VISITING',
  LOCUM: 'LOCUM',
  INTERN: 'INTERN',
  TRAINEE: 'TRAINEE',
  VENDOR: 'VENDOR',
  OTHER: 'OTHER'
};

exports.StaffEmploymentStatus = exports.$Enums.StaffEmploymentStatus = {
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  SUSPENDED: 'SUSPENDED',
  RESIGNED: 'RESIGNED',
  TERMINATED: 'TERMINATED',
  RETIRED: 'RETIRED',
  OFFBOARDED: 'OFFBOARDED'
};

exports.StaffShiftType = exports.$Enums.StaffShiftType = {
  MORNING: 'MORNING',
  EVENING: 'EVENING',
  NIGHT: 'NIGHT',
  ROTATIONAL: 'ROTATIONAL',
  CUSTOM: 'CUSTOM'
};

exports.StaffVerificationStatus = exports.$Enums.StaffVerificationStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.StaffCategory = exports.$Enums.StaffCategory = {
  CLINICAL: 'CLINICAL',
  NON_CLINICAL: 'NON_CLINICAL'
};

exports.StaffEngagementType = exports.$Enums.StaffEngagementType = {
  EMPLOYEE: 'EMPLOYEE',
  CONSULTANT: 'CONSULTANT',
  VISITING: 'VISITING',
  LOCUM: 'LOCUM',
  CONTRACTOR: 'CONTRACTOR',
  INTERN: 'INTERN',
  TRAINEE: 'TRAINEE',
  VENDOR: 'VENDOR'
};

exports.StaffStatus = exports.$Enums.StaffStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  OFFBOARDED: 'OFFBOARDED'
};

exports.StaffOnboardingStatus = exports.$Enums.StaffOnboardingStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  ACTIVE: 'ACTIVE'
};

exports.StaffAssignmentType = exports.$Enums.StaffAssignmentType = {
  PERMANENT: 'PERMANENT',
  TEMPORARY: 'TEMPORARY',
  ROTATION: 'ROTATION',
  VISITING: 'VISITING',
  LOCUM: 'LOCUM',
  CONTRACTOR: 'CONTRACTOR',
  DEPUTATION: 'DEPUTATION',
  TRANSFER: 'TRANSFER'
};

exports.StaffAssignmentStatus = exports.$Enums.StaffAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  PLANNED: 'PLANNED',
  SUSPENDED: 'SUSPENDED',
  ENDED: 'ENDED'
};

exports.ApprovalStatus = exports.$Enums.ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.StaffCredentialType = exports.$Enums.StaffCredentialType = {
  MEDICAL_REG: 'MEDICAL_REG',
  NURSING_REG: 'NURSING_REG',
  PHARMACY_REG: 'PHARMACY_REG',
  TECH_CERT: 'TECH_CERT',
  OTHER: 'OTHER'
};

exports.StaffCredentialStatus = exports.$Enums.StaffCredentialStatus = {
  VALID: 'VALID',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  RENEWED: 'RENEWED'
};

exports.StaffCredentialVerificationStatus = exports.$Enums.StaffCredentialVerificationStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.StaffIdentifierType = exports.$Enums.StaffIdentifierType = {
  AADHAAR: 'AADHAAR',
  PAN: 'PAN',
  PASSPORT: 'PASSPORT',
  HPR_ID: 'HPR_ID',
  OTHER: 'OTHER'
};

exports.StaffDocumentType = exports.$Enums.StaffDocumentType = {
  PROFILE_PHOTO: 'PROFILE_PHOTO',
  SIGNATURE: 'SIGNATURE',
  STAMP: 'STAMP',
  ID_PROOF: 'ID_PROOF',
  EDUCATION_DEGREE: 'EDUCATION_DEGREE',
  TRAINING_CERTIFICATE: 'TRAINING_CERTIFICATE',
  EMPLOYMENT_CONTRACT: 'EMPLOYMENT_CONTRACT',
  MEDICAL_REG_EVIDENCE: 'MEDICAL_REG_EVIDENCE',
  OTHER: 'OTHER'
};

exports.StaffDocumentVerificationStatus = exports.$Enums.StaffDocumentVerificationStatus = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.StaffCredentialAlertStage = exports.$Enums.StaffCredentialAlertStage = {
  D90: 'D90',
  D60: 'D60',
  D30: 'D30',
  D15: 'D15',
  D7: 'D7',
  D0: 'D0',
  POST_7: 'POST_7',
  POST_30: 'POST_30'
};

exports.StaffAlertDeliveryStatus = exports.$Enums.StaffAlertDeliveryStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED'
};

exports.ApprovalEntityType = exports.$Enums.ApprovalEntityType = {
  STAFF_LEAVE: 'STAFF_LEAVE',
  STAFF_ATTENDANCE_CORRECTION: 'STAFF_ATTENDANCE_CORRECTION',
  STAFF_ROSTER_PUBLISH: 'STAFF_ROSTER_PUBLISH',
  STAFF_ONBOARDING_SUBMIT: 'STAFF_ONBOARDING_SUBMIT'
};

exports.ApprovalRequestStatus = exports.$Enums.ApprovalRequestStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

exports.ApprovalApproverKind = exports.$Enums.ApprovalApproverKind = {
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  BRANCH_ROLE: 'BRANCH_ROLE',
  GLOBAL_ROLE: 'GLOBAL_ROLE',
  SPECIFIC_USER: 'SPECIFIC_USER'
};

exports.ApprovalStepStatus = exports.$Enums.ApprovalStepStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED'
};

exports.StaffRosterStatus = exports.$Enums.StaffRosterStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED'
};

exports.StaffAttendanceStatus = exports.$Enums.StaffAttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LEAVE: 'LEAVE',
  HALF_DAY: 'HALF_DAY',
  LATE: 'LATE',
  HOLIDAY: 'HOLIDAY',
  WEEK_OFF: 'WEEK_OFF'
};

exports.StaffLeaveStatus = exports.$Enums.StaffLeaveStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  WITHDRAWN: 'WITHDRAWN'
};

exports.StaffTrainingStatus = exports.$Enums.StaffTrainingStatus = {
  ENROLLED: 'ENROLLED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  DROPPED: 'DROPPED'
};

exports.StaffPrivilegeArea = exports.$Enums.StaffPrivilegeArea = {
  OPD: 'OPD',
  IPD: 'IPD',
  ER: 'ER',
  OT: 'OT',
  ICU: 'ICU',
  DIAGNOSTICS: 'DIAGNOSTICS',
  LAB: 'LAB',
  RADIOLOGY: 'RADIOLOGY',
  PHARMACY: 'PHARMACY',
  BILLING: 'BILLING',
  ADMIN: 'ADMIN'
};

exports.StaffPrivilegeAction = exports.$Enums.StaffPrivilegeAction = {
  VIEW: 'VIEW',
  ORDER: 'ORDER',
  PRESCRIBE: 'PRESCRIBE',
  PERFORM: 'PERFORM',
  ATTEST: 'ATTEST',
  DISCHARGE: 'DISCHARGE',
  SIGN: 'SIGN',
  APPROVE: 'APPROVE',
  OTHER: 'OTHER'
};

exports.StaffPrivilegeTargetType = exports.$Enums.StaffPrivilegeTargetType = {
  NONE: 'NONE',
  SERVICE_ITEM: 'SERVICE_ITEM',
  DIAGNOSTIC_ITEM: 'DIAGNOSTIC_ITEM',
  ORDER_SET: 'ORDER_SET',
  OTHER: 'OTHER'
};

exports.StaffPrivilegeStatus = exports.$Enums.StaffPrivilegeStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED'
};

exports.StaffOnboardingItemType = exports.$Enums.StaffOnboardingItemType = {
  DOCUMENT: 'DOCUMENT',
  CREDENTIAL: 'CREDENTIAL',
  IDENTIFIER: 'IDENTIFIER',
  ASSIGNMENT: 'ASSIGNMENT',
  SYSTEM_ACCESS: 'SYSTEM_ACCESS',
  PRIVILEGE: 'PRIVILEGE',
  OTHER: 'OTHER'
};

exports.StaffOnboardingItemStatus = exports.$Enums.StaffOnboardingItemStatus = {
  PENDING: 'PENDING',
  DONE: 'DONE',
  WAIVED: 'WAIVED',
  REJECTED: 'REJECTED'
};

exports.StaffComplianceRequirementKind = exports.$Enums.StaffComplianceRequirementKind = {
  DOCUMENT: 'DOCUMENT',
  CREDENTIAL: 'CREDENTIAL',
  IDENTIFIER: 'IDENTIFIER'
};

exports.StaffComplianceAssignmentStatus = exports.$Enums.StaffComplianceAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.UserSource = exports.$Enums.UserSource = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  MANUAL: 'MANUAL',
  SYSTEM: 'SYSTEM'
};

exports.EncounterType = exports.$Enums.EncounterType = {
  OPD: 'OPD',
  IPD: 'IPD',
  ER: 'ER'
};

exports.BedState = exports.$Enums.BedState = {
  VACANT: 'VACANT',
  OCCUPIED: 'OCCUPIED',
  CLEANING: 'CLEANING',
  MAINTENANCE: 'MAINTENANCE'
};

exports.TaxType = exports.$Enums.TaxType = {
  GST: 'GST',
  TDS: 'TDS',
  OTHER: 'OTHER'
};

exports.PayerKind = exports.$Enums.PayerKind = {
  CASH: 'CASH',
  INSURANCE: 'INSURANCE',
  TPA: 'TPA',
  CORPORATE: 'CORPORATE',
  GOVERNMENT: 'GOVERNMENT',
  TRUST: 'TRUST',
  EMPLOYEE: 'EMPLOYEE',
  OTHER: 'OTHER'
};

exports.PayerStatus = exports.$Enums.PayerStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  BLOCKED: 'BLOCKED'
};

exports.ContractStatus = exports.$Enums.ContractStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED'
};

exports.PricingStrategy = exports.$Enums.PricingStrategy = {
  GLOBAL_DISCOUNT: 'GLOBAL_DISCOUNT',
  CATEGORY_WISE: 'CATEGORY_WISE',
  SERVICE_SPECIFIC: 'SERVICE_SPECIFIC'
};

exports.TariffPlanKind = exports.$Enums.TariffPlanKind = {
  PRICE_LIST: 'PRICE_LIST',
  PAYER_CONTRACT: 'PAYER_CONTRACT'
};

exports.TariffPlanStatus = exports.$Enums.TariffPlanStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED'
};

exports.ConsentScope = exports.$Enums.ConsentScope = {
  VIEW: 'VIEW',
  STORE: 'STORE',
  SHARE: 'SHARE'
};

exports.ConsentStatus = exports.$Enums.ConsentStatus = {
  GRANTED: 'GRANTED',
  WITHDRAWN: 'WITHDRAWN'
};

exports.RtbfStatus = exports.$Enums.RtbfStatus = {
  REQUESTED: 'REQUESTED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FULFILLED: 'FULFILLED'
};

exports.OutboxStatus = exports.$Enums.OutboxStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED'
};

exports.RoleScope = exports.$Enums.RoleScope = {
  GLOBAL: 'GLOBAL',
  BRANCH: 'BRANCH'
};

exports.RoleVersionStatus = exports.$Enums.RoleVersionStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED'
};

exports.PolicyScope = exports.$Enums.PolicyScope = {
  GLOBAL: 'GLOBAL',
  BRANCH_OVERRIDE: 'BRANCH_OVERRIDE'
};

exports.PolicyVersionStatus = exports.$Enums.PolicyVersionStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RETIRED: 'RETIRED'
};

exports.LocationKind = exports.$Enums.LocationKind = {
  CAMPUS: 'CAMPUS',
  BUILDING: 'BUILDING',
  FLOOR: 'FLOOR',
  ZONE: 'ZONE',
  AREA: 'AREA'
};

exports.UnitCategory = exports.$Enums.UnitCategory = {
  OUTPATIENT: 'OUTPATIENT',
  INPATIENT: 'INPATIENT',
  CRITICAL_CARE: 'CRITICAL_CARE',
  PROCEDURE: 'PROCEDURE',
  DIAGNOSTIC: 'DIAGNOSTIC',
  SUPPORT: 'SUPPORT'
};

exports.UnitRoomType = exports.$Enums.UnitRoomType = {
  CONSULTATION: 'CONSULTATION',
  PROCEDURE: 'PROCEDURE',
  EXAMINATION: 'EXAMINATION',
  PATIENT_ROOM: 'PATIENT_ROOM',
  ISOLATION: 'ISOLATION',
  NEGATIVE_PRESSURE: 'NEGATIVE_PRESSURE',
  POSITIVE_PRESSURE: 'POSITIVE_PRESSURE',
  NURSING_STATION: 'NURSING_STATION',
  WAITING: 'WAITING',
  STORAGE: 'STORAGE',
  UTILITY: 'UTILITY',
  RECOVERY: 'RECOVERY'
};

exports.PricingTier = exports.$Enums.PricingTier = {
  ECONOMY: 'ECONOMY',
  STANDARD: 'STANDARD',
  DELUXE: 'DELUXE',
  SUITE: 'SUITE',
  VIP: 'VIP'
};

exports.IsolationType = exports.$Enums.IsolationType = {
  CONTACT: 'CONTACT',
  DROPLET: 'DROPLET',
  AIRBORNE: 'AIRBORNE',
  PROTECTIVE: 'PROTECTIVE'
};

exports.MaintenanceStatus = exports.$Enums.MaintenanceStatus = {
  OPERATIONAL: 'OPERATIONAL',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  CLEANING_IN_PROGRESS: 'CLEANING_IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE'
};

exports.UnitResourceType = exports.$Enums.UnitResourceType = {
  GENERAL_BED: 'GENERAL_BED',
  ICU_BED: 'ICU_BED',
  NICU_INCUBATOR: 'NICU_INCUBATOR',
  CRIB: 'CRIB',
  TROLLEY: 'TROLLEY',
  STRETCHER: 'STRETCHER',
  WHEELCHAIR_POSITION: 'WHEELCHAIR_POSITION',
  OT_TABLE: 'OT_TABLE',
  DIALYSIS_STATION: 'DIALYSIS_STATION',
  CHEMOTHERAPY_CHAIR: 'CHEMOTHERAPY_CHAIR',
  PROCEDURE_CHAIR: 'PROCEDURE_CHAIR',
  PROCEDURE_TABLE: 'PROCEDURE_TABLE',
  RECOVERY_BAY: 'RECOVERY_BAY',
  DENTAL_CHAIR: 'DENTAL_CHAIR',
  EXAMINATION_TABLE: 'EXAMINATION_TABLE',
  XRAY_MACHINE_SLOT: 'XRAY_MACHINE_SLOT',
  CT_SCANNER_SLOT: 'CT_SCANNER_SLOT',
  MRI_SCANNER_SLOT: 'MRI_SCANNER_SLOT',
  USG_MACHINE_SLOT: 'USG_MACHINE_SLOT',
  ECG_MACHINE_SLOT: 'ECG_MACHINE_SLOT',
  ECHO_MACHINE_SLOT: 'ECHO_MACHINE_SLOT',
  SAMPLE_COLLECTION_COUNTER: 'SAMPLE_COLLECTION_COUNTER',
  CONSULTATION_SLOT: 'CONSULTATION_SLOT',
  EXAM_SLOT: 'EXAM_SLOT',
  BED: 'BED',
  BAY: 'BAY',
  CHAIR: 'CHAIR',
  INCUBATOR: 'INCUBATOR'
};

exports.UnitResourceCategory = exports.$Enums.UnitResourceCategory = {
  BED: 'BED',
  PROCEDURE: 'PROCEDURE',
  DIAGNOSTIC: 'DIAGNOSTIC',
  CONSULTATION: 'CONSULTATION',
  OTHER: 'OTHER'
};

exports.UnitResourceState = exports.$Enums.UnitResourceState = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  CLEANING: 'CLEANING',
  SANITIZATION: 'SANITIZATION',
  MAINTENANCE: 'MAINTENANCE',
  BLOCKED: 'BLOCKED',
  INACTIVE: 'INACTIVE'
};

exports.EquipmentCategory = exports.$Enums.EquipmentCategory = {
  GENERAL: 'GENERAL',
  RADIOLOGY: 'RADIOLOGY',
  ULTRASOUND: 'ULTRASOUND'
};

exports.EquipmentOperationalStatus = exports.$Enums.EquipmentOperationalStatus = {
  OPERATIONAL: 'OPERATIONAL',
  DOWN: 'DOWN',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED'
};

exports.DowntimeStatus = exports.$Enums.DowntimeStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
};

exports.ServiceChargeUnit = exports.$Enums.ServiceChargeUnit = {
  PER_UNIT: 'PER_UNIT',
  PER_VISIT: 'PER_VISIT',
  PER_TEST: 'PER_TEST',
  PER_HOUR: 'PER_HOUR',
  PER_DAY: 'PER_DAY',
  PER_SIDE: 'PER_SIDE',
  PER_LEVEL: 'PER_LEVEL',
  PER_SESSION: 'PER_SESSION',
  PER_PROCEDURE: 'PER_PROCEDURE',
  PER_PACKAGE: 'PER_PACKAGE'
};

exports.ServiceItemType = exports.$Enums.ServiceItemType = {
  DIAGNOSTIC_LAB: 'DIAGNOSTIC_LAB',
  DIAGNOSTIC_IMAGING: 'DIAGNOSTIC_IMAGING',
  PROCEDURE: 'PROCEDURE',
  NURSING: 'NURSING',
  THERAPY: 'THERAPY',
  BED_CHARGE: 'BED_CHARGE',
  ADMIN: 'ADMIN',
  PACKAGE: 'PACKAGE',
  OTHER: 'OTHER'
};

exports.ServiceLifecycleStatus = exports.$Enums.ServiceLifecycleStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  DEPRECATED: 'DEPRECATED'
};

exports.TaxApplicability = exports.$Enums.TaxApplicability = {
  GST_EXEMPT: 'GST_EXEMPT',
  GST_STANDARD: 'GST_STANDARD',
  GST_ZERO: 'GST_ZERO',
  GST_REDUCED: 'GST_REDUCED'
};

exports.CareContext = exports.$Enums.CareContext = {
  OPD: 'OPD',
  IPD: 'IPD',
  ER: 'ER',
  OT: 'OT',
  DAYCARE: 'DAYCARE',
  TELECONSULT: 'TELECONSULT',
  HOMECARE: 'HOMECARE'
};

exports.CatalogueScope = exports.$Enums.CatalogueScope = {
  ENTERPRISE: 'ENTERPRISE',
  BRANCH: 'BRANCH'
};

exports.CatalogueChannel = exports.$Enums.CatalogueChannel = {
  DEFAULT: 'DEFAULT',
  QUICK_ORDER: 'QUICK_ORDER',
  ORDER_SET: 'ORDER_SET',
  OT_PICKLIST: 'OT_PICKLIST'
};

exports.CatalogueStatus = exports.$Enums.CatalogueStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  RETIRED: 'RETIRED'
};

exports.PackageStatus = exports.$Enums.PackageStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  RETIRED: 'RETIRED'
};

exports.PackagePricingMode = exports.$Enums.PackagePricingMode = {
  COMPONENT_SUM: 'COMPONENT_SUM',
  FIXED: 'FIXED',
  DISCOUNT_PERCENT: 'DISCOUNT_PERCENT',
  DISCOUNT_AMOUNT: 'DISCOUNT_AMOUNT',
  CAP: 'CAP'
};

exports.OverUtilizationPolicy = exports.$Enums.OverUtilizationPolicy = {
  CHARGE_ADDITIONAL: 'CHARGE_ADDITIONAL',
  ABSORB: 'ABSORB'
};

exports.UnderUtilizationRefund = exports.$Enums.UnderUtilizationRefund = {
  NO_REFUND: 'NO_REFUND',
  PARTIAL: 'PARTIAL',
  FULL: 'FULL'
};

exports.PackageComponentType = exports.$Enums.PackageComponentType = {
  SERVICE_ITEM: 'SERVICE_ITEM',
  DIAGNOSTIC_ITEM: 'DIAGNOSTIC_ITEM',
  CHARGE_MASTER_ITEM: 'CHARGE_MASTER_ITEM'
};

exports.OrderSetStatus = exports.$Enums.OrderSetStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  RETIRED: 'RETIRED'
};

exports.OrderSetItemType = exports.$Enums.OrderSetItemType = {
  SERVICE_ITEM: 'SERVICE_ITEM',
  DIAGNOSTIC_ITEM: 'DIAGNOSTIC_ITEM',
  SERVICE_PACKAGE: 'SERVICE_PACKAGE'
};

exports.StandardCodeSystem = exports.$Enums.StandardCodeSystem = {
  INTERNAL: 'INTERNAL',
  LOINC: 'LOINC',
  CPT: 'CPT',
  HCPCS: 'HCPCS',
  SNOMED: 'SNOMED',
  ICD10PCS: 'ICD10PCS',
  OTHER: 'OTHER'
};

exports.ExternalSystemType = exports.$Enums.ExternalSystemType = {
  LIS: 'LIS',
  RIS: 'RIS',
  ERP: 'ERP',
  OTHER: 'OTHER'
};

exports.ContractRateType = exports.$Enums.ContractRateType = {
  FIXED_PRICE: 'FIXED_PRICE',
  PERCENTAGE_OF_BASE: 'PERCENTAGE_OF_BASE',
  DISCOUNT: 'DISCOUNT'
};

exports.SchemeType = exports.$Enums.SchemeType = {
  PMJAY: 'PMJAY',
  CGHS: 'CGHS',
  ECHS: 'ECHS',
  STATE_SCHEME: 'STATE_SCHEME',
  OTHER: 'OTHER'
};

exports.PricingTierKind = exports.$Enums.PricingTierKind = {
  GENERAL: 'GENERAL',
  SENIOR_CITIZEN: 'SENIOR_CITIZEN',
  STAFF: 'STAFF',
  EMPLOYEE_FAMILY: 'EMPLOYEE_FAMILY',
  BPL: 'BPL',
  MEDICAL_COUNCIL: 'MEDICAL_COUNCIL',
  CUSTOM: 'CUSTOM'
};

exports.FixItTaskType = exports.$Enums.FixItTaskType = {
  SERVICE_CHARGE_MAPPING_MISSING: 'SERVICE_CHARGE_MAPPING_MISSING',
  SERVICE_AVAILABILITY_MISSING: 'SERVICE_AVAILABILITY_MISSING',
  TARIFF_RATE_MISSING: 'TARIFF_RATE_MISSING',
  TAX_CODE_MISSING: 'TAX_CODE_MISSING',
  TAX_CODE_INACTIVE: 'TAX_CODE_INACTIVE',
  PACKAGE_PRICING_MISSING: 'PACKAGE_PRICING_MISSING',
  CHARGE_UNIT_MISMATCH: 'CHARGE_UNIT_MISMATCH',
  CLONE_MISSING_SERVICE_ITEM: 'CLONE_MISSING_SERVICE_ITEM',
  CLONE_MISSING_DIAGNOSTIC_ITEM: 'CLONE_MISSING_DIAGNOSTIC_ITEM',
  CLONE_MISSING_CHARGE_MASTER_ITEM: 'CLONE_MISSING_CHARGE_MASTER_ITEM'
};

exports.FixItStatus = exports.$Enums.FixItStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED'
};

exports.FixItSeverity = exports.$Enums.FixItSeverity = {
  BLOCKER: 'BLOCKER',
  WARNING: 'WARNING',
  INFO: 'INFO'
};

exports.FixItEntityType = exports.$Enums.FixItEntityType = {
  SERVICE_ITEM: 'SERVICE_ITEM',
  CHARGE_MASTER_ITEM: 'CHARGE_MASTER_ITEM',
  TAX_CODE: 'TAX_CODE',
  TARIFF_PLAN: 'TARIFF_PLAN',
  TARIFF_RATE: 'TARIFF_RATE',
  SERVICE_CATALOGUE: 'SERVICE_CATALOGUE',
  SERVICE_PACKAGE: 'SERVICE_PACKAGE',
  ORDER_SET: 'ORDER_SET',
  DIAGNOSTIC_ITEM: 'DIAGNOSTIC_ITEM'
};

exports.BulkImportEntityType = exports.$Enums.BulkImportEntityType = {
  LOCATIONS: 'LOCATIONS',
  UNITS: 'UNITS',
  ROOMS: 'ROOMS',
  RESOURCES: 'RESOURCES',
  EQUIPMENT: 'EQUIPMENT',
  SERVICE_ITEMS: 'SERVICE_ITEMS',
  CHARGE_MASTER: 'CHARGE_MASTER'
};

exports.BulkImportStatus = exports.$Enums.BulkImportStatus = {
  VALIDATED: 'VALIDATED',
  COMMITTED: 'COMMITTED',
  FAILED: 'FAILED'
};

exports.BookingStatus = exports.$Enums.BookingStatus = {
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
};

exports.OtSuiteStatus = exports.$Enums.OtSuiteStatus = {
  draft: 'draft',
  ready: 'ready',
  active: 'active',
  booked: 'booked',
  in_use: 'in_use',
  maintenance: 'maintenance',
  archived: 'archived'
};

exports.OtSpaceType = exports.$Enums.OtSpaceType = {
  THEATRE: 'THEATRE',
  RECOVERY_BAY: 'RECOVERY_BAY',
  PREOP_HOLDING: 'PREOP_HOLDING',
  INDUCTION_ROOM: 'INDUCTION_ROOM',
  SCRUB_ROOM: 'SCRUB_ROOM',
  STERILE_STORE: 'STERILE_STORE',
  ANESTHESIA_STORE: 'ANESTHESIA_STORE',
  EQUIPMENT_STORE: 'EQUIPMENT_STORE',
  STAFF_CHANGE: 'STAFF_CHANGE',
  OTHER: 'OTHER'
};

exports.OtTheatreType = exports.$Enums.OtTheatreType = {
  GENERAL: 'GENERAL',
  MODULAR: 'MODULAR',
  LAMINAR: 'LAMINAR',
  HYBRID: 'HYBRID'
};

exports.OtAirflowType = exports.$Enums.OtAirflowType = {
  STANDARD: 'STANDARD',
  LAMINAR: 'LAMINAR'
};

exports.OtPressureType = exports.$Enums.OtPressureType = {
  POSITIVE: 'POSITIVE',
  NEGATIVE: 'NEGATIVE',
  NEUTRAL: 'NEUTRAL'
};

exports.OtEquipmentCategory = exports.$Enums.OtEquipmentCategory = {
  ANESTHESIA_MACHINE: 'ANESTHESIA_MACHINE',
  AIRWAY_MANAGEMENT: 'AIRWAY_MANAGEMENT',
  VENTILATION_RESPIRATORY: 'VENTILATION_RESPIRATORY',
  PATIENT_MONITORING: 'PATIENT_MONITORING',
  HEMODYNAMIC_MONITORING: 'HEMODYNAMIC_MONITORING',
  SURGICAL_INSTRUMENTS: 'SURGICAL_INSTRUMENTS',
  OR_FURNITURE: 'OR_FURNITURE',
  OR_LIGHTING: 'OR_LIGHTING',
  ELECTROSURGERY_ENERGY: 'ELECTROSURGERY_ENERGY',
  ENDOSCOPY_LAPAROSCOPY: 'ENDOSCOPY_LAPAROSCOPY',
  IMAGING_INTRAOP: 'IMAGING_INTRAOP',
  STERILIZATION_CSSD: 'STERILIZATION_CSSD',
  DISINFECTION_CLEANING: 'DISINFECTION_CLEANING',
  STERILE_STORAGE_PACKAGING: 'STERILE_STORAGE_PACKAGING',
  MEDICAL_GASES: 'MEDICAL_GASES',
  SUCTION_SYSTEMS: 'SUCTION_SYSTEMS',
  POWER_BACKUP: 'POWER_BACKUP',
  PATIENT_WARMING: 'PATIENT_WARMING',
  DVT_PROPHYLAXIS: 'DVT_PROPHYLAXIS',
  SAFETY_EMERGENCY: 'SAFETY_EMERGENCY',
  RECOVERY_PACU_EQUIPMENT: 'RECOVERY_PACU_EQUIPMENT',
  IT_AV_EQUIPMENT: 'IT_AV_EQUIPMENT',
  CONSUMABLES_DISPOSABLES: 'CONSUMABLES_DISPOSABLES',
  OTHER: 'OTHER'
};

exports.DiagnosticKind = exports.$Enums.DiagnosticKind = {
  LAB: 'LAB',
  IMAGING: 'IMAGING',
  PROCEDURE: 'PROCEDURE'
};

exports.DiagnosticResultDataType = exports.$Enums.DiagnosticResultDataType = {
  NUMERIC: 'NUMERIC',
  TEXT: 'TEXT',
  BOOLEAN: 'BOOLEAN',
  CHOICE: 'CHOICE'
};

exports.DiagnosticTemplateKind = exports.$Enums.DiagnosticTemplateKind = {
  IMAGING_REPORT: 'IMAGING_REPORT',
  LAB_REPORT: 'LAB_REPORT'
};

exports.DiagnosticServicePointType = exports.$Enums.DiagnosticServicePointType = {
  LAB: 'LAB',
  RADIOLOGY: 'RADIOLOGY',
  CARDIO_DIAGNOSTICS: 'CARDIO_DIAGNOSTICS',
  NEURO_DIAGNOSTICS: 'NEURO_DIAGNOSTICS',
  PULMONARY_DIAGNOSTICS: 'PULMONARY_DIAGNOSTICS',
  ENDOSCOPY: 'ENDOSCOPY',
  OTHER: 'OTHER'
};

exports.DiagnosticModality = exports.$Enums.DiagnosticModality = {
  XRAY: 'XRAY',
  ULTRASOUND: 'ULTRASOUND',
  CT: 'CT',
  MRI: 'MRI',
  MAMMOGRAPHY: 'MAMMOGRAPHY',
  FLUOROSCOPY: 'FLUOROSCOPY',
  ECG: 'ECG',
  ECHO: 'ECHO',
  TMT: 'TMT',
  HOLTER: 'HOLTER',
  PFT: 'PFT',
  EEG: 'EEG',
  EMG_NCV: 'EMG_NCV',
  LAB: 'LAB',
  SAMPLE_COLLECTION: 'SAMPLE_COLLECTION',
  PROCEDURE_ROOM: 'PROCEDURE_ROOM',
  OTHER: 'OTHER'
};

exports.DiagnosticPackVersionStatus = exports.$Enums.DiagnosticPackVersionStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  RETIRED: 'RETIRED'
};

exports.EquipmentMovementReason = exports.$Enums.EquipmentMovementReason = {
  INSTALLATION: 'INSTALLATION',
  TRANSFER: 'TRANSFER',
  TEMPORARY_MOVE: 'TEMPORARY_MOVE',
  STORAGE: 'STORAGE',
  REPLACEMENT: 'REPLACEMENT',
  DECOMMISSION: 'DECOMMISSION',
  OTHER: 'OTHER'
};

exports.EquipmentDocumentType = exports.$Enums.EquipmentDocumentType = {
  AERB_LICENSE: 'AERB_LICENSE',
  PCPNDT_CERTIFICATE: 'PCPNDT_CERTIFICATE',
  SHIELDING_PLAN: 'SHIELDING_PLAN',
  CALIBRATION_CERTIFICATE: 'CALIBRATION_CERTIFICATE',
  INSTALLATION_REPORT: 'INSTALLATION_REPORT',
  USER_MANUAL: 'USER_MANUAL',
  SOP: 'SOP',
  WARRANTY_CARD: 'WARRANTY_CARD',
  AMC_CONTRACT: 'AMC_CONTRACT',
  SERVICE_REPORT: 'SERVICE_REPORT',
  INSURANCE_POLICY: 'INSURANCE_POLICY',
  OTHER: 'OTHER'
};

exports.EquipmentContractType = exports.$Enums.EquipmentContractType = {
  WARRANTY: 'WARRANTY',
  AMC: 'AMC',
  CMC: 'CMC',
  LEASE: 'LEASE',
  RENTAL: 'RENTAL',
  INSURANCE: 'INSURANCE',
  OTHER: 'OTHER'
};

exports.EquipmentMaintenanceType = exports.$Enums.EquipmentMaintenanceType = {
  PM: 'PM',
  CALIBRATION: 'CALIBRATION',
  QUALIFICATION: 'QUALIFICATION',
  SAFETY_TEST: 'SAFETY_TEST',
  REPAIR: 'REPAIR',
  OTHER: 'OTHER'
};

exports.EquipmentMaintenanceStatus = exports.$Enums.EquipmentMaintenanceStatus = {
  DUE: 'DUE',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED'
};

exports.EquipmentEvidenceStatus = exports.$Enums.EquipmentEvidenceStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.GovernedChangeStatus = exports.$Enums.GovernedChangeStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  APPLIED: 'APPLIED'
};

exports.PharmacyStoreType = exports.$Enums.PharmacyStoreType = {
  MAIN: 'MAIN',
  IP_PHARMACY: 'IP_PHARMACY',
  OP_PHARMACY: 'OP_PHARMACY',
  EMERGENCY: 'EMERGENCY',
  OT_STORE: 'OT_STORE',
  ICU_STORE: 'ICU_STORE',
  WARD_STORE: 'WARD_STORE',
  NARCOTICS: 'NARCOTICS'
};

exports.PharmacyStoreStatus = exports.$Enums.PharmacyStoreStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  UNDER_SETUP: 'UNDER_SETUP'
};

exports.DrugCategory = exports.$Enums.DrugCategory = {
  TABLET: 'TABLET',
  CAPSULE: 'CAPSULE',
  INJECTION: 'INJECTION',
  SYRUP: 'SYRUP',
  OINTMENT: 'OINTMENT',
  DROPS: 'DROPS',
  INHALER: 'INHALER',
  SUPPOSITORY: 'SUPPOSITORY',
  PATCH: 'PATCH',
  POWDER: 'POWDER',
  IV_FLUID: 'IV_FLUID',
  OTHER: 'OTHER'
};

exports.DrugRoute = exports.$Enums.DrugRoute = {
  ORAL: 'ORAL',
  IV: 'IV',
  IM: 'IM',
  SC: 'SC',
  TOPICAL: 'TOPICAL',
  INHALATION: 'INHALATION',
  RECTAL: 'RECTAL',
  OPHTHALMIC: 'OPHTHALMIC',
  NASAL: 'NASAL',
  SUBLINGUAL: 'SUBLINGUAL',
  TRANSDERMAL: 'TRANSDERMAL'
};

exports.DrugScheduleClass = exports.$Enums.DrugScheduleClass = {
  GENERAL: 'GENERAL',
  H: 'H',
  H1: 'H1',
  X: 'X',
  G: 'G'
};

exports.DrugFormularyStatus = exports.$Enums.DrugFormularyStatus = {
  APPROVED: 'APPROVED',
  RESTRICTED: 'RESTRICTED',
  NON_FORMULARY: 'NON_FORMULARY'
};

exports.DrugLifecycleStatus = exports.$Enums.DrugLifecycleStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  RECALLED: 'RECALLED'
};

exports.InteractionSeverity = exports.$Enums.InteractionSeverity = {
  MAJOR: 'MAJOR',
  MODERATE: 'MODERATE',
  MINOR: 'MINOR'
};

exports.InteractionSource = exports.$Enums.InteractionSource = {
  STANDARD: 'STANDARD',
  CUSTOM: 'CUSTOM'
};

exports.FormularyVersionStatus = exports.$Enums.FormularyVersionStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.PharmSupplierStatus = exports.$Enums.PharmSupplierStatus = {
  ACTIVE: 'ACTIVE',
  BLACKLISTED: 'BLACKLISTED',
  INACTIVE: 'INACTIVE'
};

exports.NarcoticsTransactionType = exports.$Enums.NarcoticsTransactionType = {
  RECEIPT: 'RECEIPT',
  ISSUE: 'ISSUE',
  WASTAGE: 'WASTAGE',
  ADJUSTMENT: 'ADJUSTMENT'
};

exports.PolicyRelationship = exports.$Enums.PolicyRelationship = {
  SELF: 'SELF',
  SPOUSE: 'SPOUSE',
  CHILD: 'CHILD',
  PARENT: 'PARENT',
  OTHER: 'OTHER'
};

exports.PolicyStatus = exports.$Enums.PolicyStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  SUSPENDED: 'SUSPENDED',
  LAPSED: 'LAPSED'
};

exports.InsuranceCaseType = exports.$Enums.InsuranceCaseType = {
  CASHLESS: 'CASHLESS',
  REIMBURSEMENT: 'REIMBURSEMENT',
  PACKAGE: 'PACKAGE'
};

exports.InsuranceCaseStatus = exports.$Enums.InsuranceCaseStatus = {
  DRAFT: 'DRAFT',
  POLICY_VERIFIED: 'POLICY_VERIFIED',
  PREAUTH_PENDING: 'PREAUTH_PENDING',
  PREAUTH_APPROVED: 'PREAUTH_APPROVED',
  ADMITTED: 'ADMITTED',
  DISCHARGE_PENDING: 'DISCHARGE_PENDING',
  CLAIM_SUBMITTED: 'CLAIM_SUBMITTED',
  CLAIM_APPROVED: 'CLAIM_APPROVED',
  SETTLED: 'SETTLED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

exports.PreauthStatus = exports.$Enums.PreauthStatus = {
  PREAUTH_DRAFT: 'PREAUTH_DRAFT',
  PREAUTH_SUBMITTED: 'PREAUTH_SUBMITTED',
  PREAUTH_QUERY_RAISED: 'PREAUTH_QUERY_RAISED',
  PREAUTH_RESPONDED: 'PREAUTH_RESPONDED',
  PREAUTH_APPROVED: 'PREAUTH_APPROVED',
  PREAUTH_REJECTED: 'PREAUTH_REJECTED',
  PREAUTH_ENHANCEMENT_REQUESTED: 'PREAUTH_ENHANCEMENT_REQUESTED',
  PREAUTH_ENHANCEMENT_APPROVED: 'PREAUTH_ENHANCEMENT_APPROVED',
  PREAUTH_EXPIRED: 'PREAUTH_EXPIRED'
};

exports.PreauthQuerySource = exports.$Enums.PreauthQuerySource = {
  TPA: 'TPA',
  HOSPITAL: 'HOSPITAL'
};

exports.ClaimType = exports.$Enums.ClaimType = {
  FINAL: 'FINAL',
  INTERIM: 'INTERIM',
  ENHANCEMENT: 'ENHANCEMENT'
};

exports.ClaimStatus = exports.$Enums.ClaimStatus = {
  CLAIM_DRAFT: 'CLAIM_DRAFT',
  CLAIM_SUBMITTED: 'CLAIM_SUBMITTED',
  CLAIM_ACKNOWLEDGED: 'CLAIM_ACKNOWLEDGED',
  CLAIM_QUERY_RAISED: 'CLAIM_QUERY_RAISED',
  CLAIM_RESPONDED: 'CLAIM_RESPONDED',
  CLAIM_UNDER_REVIEW: 'CLAIM_UNDER_REVIEW',
  CLAIM_APPROVED: 'CLAIM_APPROVED',
  CLAIM_PARTIALLY_APPROVED: 'CLAIM_PARTIALLY_APPROVED',
  CLAIM_REJECTED: 'CLAIM_REJECTED',
  CLAIM_DEDUCTED: 'CLAIM_DEDUCTED',
  CLAIM_PAID: 'CLAIM_PAID',
  CLAIM_CLOSED: 'CLAIM_CLOSED',
  CLAIM_RESUBMITTED: 'CLAIM_RESUBMITTED'
};

exports.DeductionCategory = exports.$Enums.DeductionCategory = {
  NON_PAYABLE: 'NON_PAYABLE',
  EXCESS: 'EXCESS',
  COPAY: 'COPAY',
  DEDUCTIBLE: 'DEDUCTIBLE',
  NON_MEDICAL: 'NON_MEDICAL',
  TARIFF_DIFF: 'TARIFF_DIFF',
  OTHER: 'OTHER'
};

exports.InsuranceDocRole = exports.$Enums.InsuranceDocRole = {
  PREAUTH_FORM: 'PREAUTH_FORM',
  DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
  INVESTIGATION_REPORT: 'INVESTIGATION_REPORT',
  PRESCRIPTION: 'PRESCRIPTION',
  BILL_SUMMARY: 'BILL_SUMMARY',
  CLAIM_FORM: 'CLAIM_FORM',
  ID_PROOF: 'ID_PROOF',
  INSURANCE_CARD: 'INSURANCE_CARD',
  QUERY_RESPONSE: 'QUERY_RESPONSE',
  ENHANCEMENT_FORM: 'ENHANCEMENT_FORM',
  DOC_OTHER: 'DOC_OTHER'
};

exports.InsuranceDocEntityType = exports.$Enums.InsuranceDocEntityType = {
  INSURANCE_CASE: 'INSURANCE_CASE',
  PREAUTH: 'PREAUTH',
  CLAIM: 'CLAIM',
  PATIENT_POLICY: 'PATIENT_POLICY'
};

exports.IntegrationMode = exports.$Enums.IntegrationMode = {
  HCX: 'HCX',
  NHCX: 'NHCX',
  DIRECT_API: 'DIRECT_API',
  SFTP_BATCH: 'SFTP_BATCH',
  PORTAL_ASSISTED: 'PORTAL_ASSISTED',
  MANUAL: 'MANUAL'
};

exports.PaymentMode = exports.$Enums.PaymentMode = {
  NEFT: 'NEFT',
  RTGS: 'RTGS',
  CHEQUE: 'CHEQUE',
  UPI: 'UPI',
  CASH_PAYMENT: 'CASH_PAYMENT',
  OTHER_MODE: 'OTHER_MODE'
};

exports.PaymentAdviceStatus = exports.$Enums.PaymentAdviceStatus = {
  PA_RECEIVED: 'PA_RECEIVED',
  PA_RECONCILED: 'PA_RECONCILED',
  PA_DISPUTED: 'PA_DISPUTED',
  PA_PARTIAL: 'PA_PARTIAL'
};

exports.GatewayTxType = exports.$Enums.GatewayTxType = {
  PREAUTH_SUBMIT: 'PREAUTH_SUBMIT',
  PREAUTH_STATUS: 'PREAUTH_STATUS',
  CLAIM_SUBMIT: 'CLAIM_SUBMIT',
  CLAIM_STATUS: 'CLAIM_STATUS',
  COVERAGE_CHECK: 'COVERAGE_CHECK',
  PAYMENT_NOTICE: 'PAYMENT_NOTICE',
  WEBHOOK_INBOUND: 'WEBHOOK_INBOUND'
};

exports.GatewayTxStatus = exports.$Enums.GatewayTxStatus = {
  GATEWAY_QUEUED: 'GATEWAY_QUEUED',
  GATEWAY_SENT: 'GATEWAY_SENT',
  GATEWAY_ACK_RECEIVED: 'GATEWAY_ACK_RECEIVED',
  GATEWAY_RESPONSE_RECEIVED: 'GATEWAY_RESPONSE_RECEIVED',
  GATEWAY_FAILED: 'GATEWAY_FAILED',
  GATEWAY_TIMED_OUT: 'GATEWAY_TIMED_OUT'
};

exports.DocChecklistScope = exports.$Enums.DocChecklistScope = {
  ALL_CASES: 'ALL_CASES',
  CASHLESS_ONLY: 'CASHLESS_ONLY',
  REIMBURSEMENT_ONLY: 'REIMBURSEMENT_ONLY',
  PACKAGE_ONLY: 'PACKAGE_ONLY'
};

exports.ComplianceWorkspaceType = exports.$Enums.ComplianceWorkspaceType = {
  ORG_TEMPLATE: 'ORG_TEMPLATE',
  BRANCH: 'BRANCH'
};

exports.ComplianceWorkspaceStatus = exports.$Enums.ComplianceWorkspaceStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.EnvironmentType = exports.$Enums.EnvironmentType = {
  SANDBOX: 'SANDBOX',
  PRODUCTION: 'PRODUCTION'
};

exports.VerificationStatus = exports.$Enums.VerificationStatus = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.RegistrationStatus = exports.$Enums.RegistrationStatus = {
  UNVERIFIED: 'UNVERIFIED',
  VERIFIED: 'VERIFIED',
  EXPIRED: 'EXPIRED',
  MISMATCH: 'MISMATCH'
};

exports.CityCategory = exports.$Enums.CityCategory = {
  A: 'A',
  B: 'B',
  C: 'C'
};

exports.EmpanelmentStatus = exports.$Enums.EmpanelmentStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.RateCardStatus = exports.$Enums.RateCardStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  ARCHIVED: 'ARCHIVED'
};

exports.RiskLevel = exports.$Enums.RiskLevel = {
  CRITICAL: 'CRITICAL',
  MAJOR: 'MAJOR',
  MINOR: 'MINOR'
};

exports.NabhItemStatus = exports.$Enums.NabhItemStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  IMPLEMENTED: 'IMPLEMENTED',
  VERIFIED: 'VERIFIED',
  NON_COMPLIANT: 'NON_COMPLIANT'
};

exports.EvidenceStatus = exports.$Enums.EvidenceStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.ComplianceEntityType = exports.$Enums.ComplianceEntityType = {
  COMPLIANCE_WORKSPACE: 'COMPLIANCE_WORKSPACE',
  ABDM_CONFIG: 'ABDM_CONFIG',
  HFR_PROFILE: 'HFR_PROFILE',
  HPR_LINK: 'HPR_LINK',
  SCHEME_EMPANELMENT: 'SCHEME_EMPANELMENT',
  SCHEME_RATE_CARD: 'SCHEME_RATE_CARD',
  SCHEME_MAPPING: 'SCHEME_MAPPING',
  NABH_TEMPLATE: 'NABH_TEMPLATE',
  NABH_ITEM: 'NABH_ITEM',
  EVIDENCE: 'EVIDENCE',
  AUDIT_CYCLE: 'AUDIT_CYCLE',
  FINDING: 'FINDING',
  CAPA: 'CAPA',
  APPROVAL: 'APPROVAL',
  SCHEME_API_CREDENTIAL: 'SCHEME_API_CREDENTIAL',
  SCHEME_SYNC: 'SCHEME_SYNC'
};

exports.AuditCycleStatus = exports.$Enums.AuditCycleStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED'
};

exports.FindingSeverity = exports.$Enums.FindingSeverity = {
  CRITICAL: 'CRITICAL',
  MAJOR: 'MAJOR',
  MINOR: 'MINOR'
};

exports.CapaStatus = exports.$Enums.CapaStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED'
};

exports.ComplianceApprovalStatus = exports.$Enums.ComplianceApprovalStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

exports.BloodBankType = exports.$Enums.BloodBankType = {
  HOSPITAL_BASED: 'HOSPITAL_BASED',
  STANDALONE: 'STANDALONE',
  STORAGE_CENTRE: 'STORAGE_CENTRE',
  COMPONENT_SEPARATION_CENTRE: 'COMPONENT_SEPARATION_CENTRE'
};

exports.ComponentType = exports.$Enums.ComponentType = {
  WHOLE_BLOOD: 'WHOLE_BLOOD',
  PRBC: 'PRBC',
  FFP: 'FFP',
  PLATELET_RDP: 'PLATELET_RDP',
  PLATELET_SDP: 'PLATELET_SDP',
  CRYOPRECIPITATE: 'CRYOPRECIPITATE',
  CRYO_POOR_PLASMA: 'CRYO_POOR_PLASMA'
};

exports.BBEquipmentType = exports.$Enums.BBEquipmentType = {
  REFRIGERATOR: 'REFRIGERATOR',
  DEEP_FREEZER: 'DEEP_FREEZER',
  PLATELET_AGITATOR: 'PLATELET_AGITATOR',
  CELL_SEPARATOR: 'CELL_SEPARATOR',
  BLOOD_WARMER: 'BLOOD_WARMER',
  CENTRIFUGE: 'CENTRIFUGE',
  OTHER: 'OTHER'
};

exports.DonorType = exports.$Enums.DonorType = {
  VOLUNTARY: 'VOLUNTARY',
  REPLACEMENT: 'REPLACEMENT',
  DIRECTED: 'DIRECTED',
  AUTOLOGOUS: 'AUTOLOGOUS'
};

exports.DonorStatus = exports.$Enums.DonorStatus = {
  ELIGIBLE: 'ELIGIBLE',
  TEMPORARILY_DEFERRED: 'TEMPORARILY_DEFERRED',
  PERMANENTLY_DEFERRED: 'PERMANENTLY_DEFERRED'
};

exports.BagType = exports.$Enums.BagType = {
  SINGLE: 'SINGLE',
  DOUBLE: 'DOUBLE',
  TRIPLE: 'TRIPLE',
  QUADRUPLE: 'QUADRUPLE'
};

exports.CollectionType = exports.$Enums.CollectionType = {
  WHOLE_BLOOD_350: 'WHOLE_BLOOD_350',
  WHOLE_BLOOD_450: 'WHOLE_BLOOD_450',
  APHERESIS_SDP: 'APHERESIS_SDP',
  APHERESIS_PLASMA: 'APHERESIS_PLASMA'
};

exports.BloodUnitStatus = exports.$Enums.BloodUnitStatus = {
  COLLECTED: 'COLLECTED',
  TESTING: 'TESTING',
  QUARANTINED: 'QUARANTINED',
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  CROSS_MATCHED: 'CROSS_MATCHED',
  ISSUED: 'ISSUED',
  TRANSFUSED: 'TRANSFUSED',
  DISCARDED: 'DISCARDED',
  SEPARATED: 'SEPARATED',
  RETURNED: 'RETURNED'
};

exports.TTITestResult = exports.$Enums.TTITestResult = {
  REACTIVE: 'REACTIVE',
  NON_REACTIVE: 'NON_REACTIVE',
  INDETERMINATE: 'INDETERMINATE',
  PENDING: 'PENDING'
};

exports.BloodRequestUrgency = exports.$Enums.BloodRequestUrgency = {
  ROUTINE: 'ROUTINE',
  URGENT: 'URGENT',
  EMERGENCY: 'EMERGENCY',
  MTP: 'MTP'
};

exports.BloodRequestStatus = exports.$Enums.BloodRequestStatus = {
  PENDING: 'PENDING',
  SAMPLE_RECEIVED: 'SAMPLE_RECEIVED',
  CROSS_MATCHING: 'CROSS_MATCHING',
  READY: 'READY',
  ISSUED: 'ISSUED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.CrossMatchMethod = exports.$Enums.CrossMatchMethod = {
  IMMEDIATE_SPIN: 'IMMEDIATE_SPIN',
  AHG_INDIRECT_COOMBS: 'AHG_INDIRECT_COOMBS',
  ELECTRONIC: 'ELECTRONIC'
};

exports.CrossMatchResult = exports.$Enums.CrossMatchResult = {
  COMPATIBLE: 'COMPATIBLE',
  INCOMPATIBLE: 'INCOMPATIBLE',
  PENDING: 'PENDING'
};

exports.TransfusionReactionType = exports.$Enums.TransfusionReactionType = {
  FEBRILE: 'FEBRILE',
  ALLERGIC: 'ALLERGIC',
  HEMOLYTIC_ACUTE: 'HEMOLYTIC_ACUTE',
  HEMOLYTIC_DELAYED: 'HEMOLYTIC_DELAYED',
  TRALI: 'TRALI',
  TACO: 'TACO',
  ANAPHYLAXIS: 'ANAPHYLAXIS',
  BACTERIAL: 'BACTERIAL',
  OTHER: 'OTHER'
};

exports.Prisma.ModelName = {
  Organization: 'Organization',
  Branch: 'Branch',
  FacilityCatalog: 'FacilityCatalog',
  BranchFacility: 'BranchFacility',
  Department: 'Department',
  DepartmentLocation: 'DepartmentLocation',
  DepartmentDoctor: 'DepartmentDoctor',
  DepartmentSpecialty: 'DepartmentSpecialty',
  Specialty: 'Specialty',
  Staff: 'Staff',
  StaffAssignment: 'StaffAssignment',
  UserRoleBinding: 'UserRoleBinding',
  StaffCredential: 'StaffCredential',
  StaffIdentifier: 'StaffIdentifier',
  StaffDocument: 'StaffDocument',
  StaffCredentialEvidence: 'StaffCredentialEvidence',
  StaffCredentialAlert: 'StaffCredentialAlert',
  ApprovalRequest: 'ApprovalRequest',
  ApprovalStep: 'ApprovalStep',
  StaffRoster: 'StaffRoster',
  StaffRosterEntry: 'StaffRosterEntry',
  StaffAttendance: 'StaffAttendance',
  StaffLeaveRequest: 'StaffLeaveRequest',
  StaffTrainingRecord: 'StaffTrainingRecord',
  StaffSeparation: 'StaffSeparation',
  StaffHealthRecord: 'StaffHealthRecord',
  StaffProviderProfile: 'StaffProviderProfile',
  StaffPrivilegeGrant: 'StaffPrivilegeGrant',
  StaffOnboardingItem: 'StaffOnboardingItem',
  StaffCompliancePack: 'StaffCompliancePack',
  StaffComplianceRequirement: 'StaffComplianceRequirement',
  StaffComplianceAssignment: 'StaffComplianceAssignment',
  StaffMergeLog: 'StaffMergeLog',
  User: 'User',
  Patient: 'Patient',
  Encounter: 'Encounter',
  Ward: 'Ward',
  Room: 'Room',
  Bed: 'Bed',
  Admission: 'Admission',
  Asset: 'Asset',
  TaxCode: 'TaxCode',
  Payer: 'Payer',
  PayerContract: 'PayerContract',
  TariffPlan: 'TariffPlan',
  ServiceCatalogItem: 'ServiceCatalogItem',
  TariffRate: 'TariffRate',
  ConsentRecord: 'ConsentRecord',
  RtbfRequest: 'RtbfRequest',
  StatutoryCase: 'StatutoryCase',
  AuditEvent: 'AuditEvent',
  OutboxEvent: 'OutboxEvent',
  Permission: 'Permission',
  RoleTemplate: 'RoleTemplate',
  RoleTemplateVersion: 'RoleTemplateVersion',
  RoleTemplatePermission: 'RoleTemplatePermission',
  PolicyDefinition: 'PolicyDefinition',
  PolicyVersion: 'PolicyVersion',
  PolicyVersionBranch: 'PolicyVersionBranch',
  LocationNode: 'LocationNode',
  LocationNodeRevision: 'LocationNodeRevision',
  UnitTypeCatalog: 'UnitTypeCatalog',
  BranchUnitType: 'BranchUnitType',
  Unit: 'Unit',
  UnitRoom: 'UnitRoom',
  UnitResource: 'UnitResource',
  BranchInfraConfig: 'BranchInfraConfig',
  EquipmentAsset: 'EquipmentAsset',
  DowntimeTicket: 'DowntimeTicket',
  ChargeMasterItem: 'ChargeMasterItem',
  ServiceItem: 'ServiceItem',
  ServiceItemAlias: 'ServiceItemAlias',
  ServiceItemContext: 'ServiceItemContext',
  ServiceItemResourceRequirement: 'ServiceItemResourceRequirement',
  ServiceItemClinicalRule: 'ServiceItemClinicalRule',
  ServiceSeriesPolicy: 'ServiceSeriesPolicy',
  ServiceItemVersion: 'ServiceItemVersion',
  ServiceChargeMapping: 'ServiceChargeMapping',
  ServiceCatalogue: 'ServiceCatalogue',
  ServiceCatalogueItem: 'ServiceCatalogueItem',
  ServiceCatalogueVersion: 'ServiceCatalogueVersion',
  ServicePackage: 'ServicePackage',
  ServicePackageComponent: 'ServicePackageComponent',
  ServicePackageVersion: 'ServicePackageVersion',
  OrderSet: 'OrderSet',
  OrderSetItem: 'OrderSetItem',
  OrderSetVersion: 'OrderSetVersion',
  StandardCodeSet: 'StandardCodeSet',
  StandardCodeEntry: 'StandardCodeEntry',
  ServiceItemStandardMapping: 'ServiceItemStandardMapping',
  ServiceAvailabilityCalendar: 'ServiceAvailabilityCalendar',
  ServiceAvailabilityRule: 'ServiceAvailabilityRule',
  ServiceBlackout: 'ServiceBlackout',
  ExternalDirectorySource: 'ExternalDirectorySource',
  ExternalDirectoryEntry: 'ExternalDirectoryEntry',
  ExternalDirectoryMapping: 'ExternalDirectoryMapping',
  ServicePriceHistory: 'ServicePriceHistory',
  ContractServiceRate: 'ContractServiceRate',
  GovernmentSchemeConfig: 'GovernmentSchemeConfig',
  PatientPricingTier: 'PatientPricingTier',
  PatientPricingTierRate: 'PatientPricingTierRate',
  FixItTask: 'FixItTask',
  BulkImportJob: 'BulkImportJob',
  ProcedureBooking: 'ProcedureBooking',
  GoLiveReport: 'GoLiveReport',
  OtSuite: 'OtSuite',
  OtSpace: 'OtSpace',
  OtTheatre: 'OtTheatre',
  OtRecoveryBay: 'OtRecoveryBay',
  OtTable: 'OtTable',
  OtEquipment: 'OtEquipment',
  DiagnosticSection: 'DiagnosticSection',
  DiagnosticCategory: 'DiagnosticCategory',
  SpecimenType: 'SpecimenType',
  DiagnosticItem: 'DiagnosticItem',
  DiagnosticPanelItem: 'DiagnosticPanelItem',
  DiagnosticParameter: 'DiagnosticParameter',
  DiagnosticReferenceRange: 'DiagnosticReferenceRange',
  DiagnosticTemplate: 'DiagnosticTemplate',
  DiagnosticServicePoint: 'DiagnosticServicePoint',
  DiagnosticServicePointRoom: 'DiagnosticServicePointRoom',
  DiagnosticServicePointResource: 'DiagnosticServicePointResource',
  DiagnosticServicePointEquipment: 'DiagnosticServicePointEquipment',
  DiagnosticCapability: 'DiagnosticCapability',
  DiagnosticCapabilityRoom: 'DiagnosticCapabilityRoom',
  DiagnosticCapabilityResource: 'DiagnosticCapabilityResource',
  DiagnosticCapabilityEquipment: 'DiagnosticCapabilityEquipment',
  DiagnosticPack: 'DiagnosticPack',
  DiagnosticPackVersion: 'DiagnosticPackVersion',
  EquipmentAssetRevision: 'EquipmentAssetRevision',
  EquipmentPlacement: 'EquipmentPlacement',
  EquipmentMovement: 'EquipmentMovement',
  EquipmentDocument: 'EquipmentDocument',
  EquipmentContract: 'EquipmentContract',
  EquipmentMaintenanceTask: 'EquipmentMaintenanceTask',
  EquipmentComplianceEvidence: 'EquipmentComplianceEvidence',
  GovernedChangeRequest: 'GovernedChangeRequest',
  PharmacyStore: 'PharmacyStore',
  DrugMaster: 'DrugMaster',
  DrugInteraction: 'DrugInteraction',
  Formulary: 'Formulary',
  FormularyItem: 'FormularyItem',
  TherapeuticSubstitution: 'TherapeuticSubstitution',
  PharmSupplier: 'PharmSupplier',
  SupplierStoreMapping: 'SupplierStoreMapping',
  SupplierDrugMapping: 'SupplierDrugMapping',
  InventoryConfig: 'InventoryConfig',
  StoreIndentMapping: 'StoreIndentMapping',
  NarcoticsRegister: 'NarcoticsRegister',
  DrugLicenseHistory: 'DrugLicenseHistory',
  DrugCategoryNode: 'DrugCategoryNode',
  PatientInsurancePolicy: 'PatientInsurancePolicy',
  InsuranceCase: 'InsuranceCase',
  PreauthRequest: 'PreauthRequest',
  PreauthQuery: 'PreauthQuery',
  Claim: 'Claim',
  ClaimLineItem: 'ClaimLineItem',
  ClaimDeduction: 'ClaimDeduction',
  ClaimVersion: 'ClaimVersion',
  InsuranceDocument: 'InsuranceDocument',
  InsuranceDocumentLink: 'InsuranceDocumentLink',
  PayerIntegrationConfig: 'PayerIntegrationConfig',
  PaymentAdvice: 'PaymentAdvice',
  GatewayTransaction: 'GatewayTransaction',
  PayerDocumentTemplate: 'PayerDocumentTemplate',
  PayerDocumentRule: 'PayerDocumentRule',
  ComplianceWorkspace: 'ComplianceWorkspace',
  AbdmConfig: 'AbdmConfig',
  HfrFacilityProfile: 'HfrFacilityProfile',
  HprProfessionalLink: 'HprProfessionalLink',
  SchemeEmpanelment: 'SchemeEmpanelment',
  SchemeRateCard: 'SchemeRateCard',
  SchemeRateCardItem: 'SchemeRateCardItem',
  SchemeMapping: 'SchemeMapping',
  SchemeApiCredential: 'SchemeApiCredential',
  NabhTemplate: 'NabhTemplate',
  NabhTemplateItem: 'NabhTemplateItem',
  NabhWorkspaceItem: 'NabhWorkspaceItem',
  EvidenceArtifact: 'EvidenceArtifact',
  EvidenceLink: 'EvidenceLink',
  AuditCycle: 'AuditCycle',
  AuditFinding: 'AuditFinding',
  CapaAction: 'CapaAction',
  ComplianceApproval: 'ComplianceApproval',
  ComplianceAuditLog: 'ComplianceAuditLog',
  BloodBankFacility: 'BloodBankFacility',
  BloodComponentMaster: 'BloodComponentMaster',
  BloodBankEquipment: 'BloodBankEquipment',
  EquipmentTempLog: 'EquipmentTempLog',
  BloodBankReagent: 'BloodBankReagent',
  BBTariffConfig: 'BBTariffConfig',
  Donor: 'Donor',
  DonorDeferral: 'DonorDeferral',
  DonorScreening: 'DonorScreening',
  BloodUnit: 'BloodUnit',
  BloodGroupingResult: 'BloodGroupingResult',
  TTITestRecord: 'TTITestRecord',
  BloodInventorySlot: 'BloodInventorySlot',
  BloodRequest: 'BloodRequest',
  PatientBloodSample: 'PatientBloodSample',
  CrossMatchTest: 'CrossMatchTest',
  BloodIssue: 'BloodIssue',
  TransfusionRecord: 'TransfusionRecord',
  TransfusionReaction: 'TransfusionReaction',
  QualityControlRecord: 'QualityControlRecord',
  BloodDonationCamp: 'BloodDonationCamp',
  MTPSession: 'MTPSession',
  MSBOSConfig: 'MSBOSConfig'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
