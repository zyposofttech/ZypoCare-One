
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

exports.Prisma.BranchScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  city: 'city',
  isActive: 'isActive',
  address: 'address',
  contactPhone1: 'contactPhone1',
  contactPhone2: 'contactPhone2',
  contactEmail: 'contactEmail',
  gstNumber: 'gstNumber',
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
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  departmentId: 'departmentId',
  specialtyId: 'specialtyId',
  empCode: 'empCode',
  name: 'name',
  designation: 'designation',
  phone: 'phone',
  email: 'email',
  isActive: 'isActive',
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
  kind: 'kind',
  isActive: 'isActive',
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
  status: 'status',
  startAt: 'startAt',
  endAt: 'endAt',
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
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.UnitTypeCatalogScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  usesRoomsDefault: 'usesRoomsDefault',
  schedulableByDefault: 'schedulableByDefault',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  usesRooms: 'usesRooms',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnitRoomScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  unitId: 'unitId',
  code: 'code',
  name: 'name',
  isActive: 'isActive',
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
  name: 'name',
  state: 'state',
  isActive: 'isActive',
  isSchedulable: 'isSchedulable',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.FacilityCategory = exports.$Enums.FacilityCategory = {
  SERVICE: 'SERVICE',
  CLINICAL: 'CLINICAL',
  SUPPORT: 'SUPPORT'
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
  OTHER: 'OTHER'
};

exports.ContractStatus = exports.$Enums.ContractStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED'
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
  ZONE: 'ZONE'
};

exports.UnitResourceType = exports.$Enums.UnitResourceType = {
  BED: 'BED',
  BAY: 'BAY',
  CHAIR: 'CHAIR',
  OT_TABLE: 'OT_TABLE',
  PROCEDURE_TABLE: 'PROCEDURE_TABLE',
  DIALYSIS_STATION: 'DIALYSIS_STATION',
  RECOVERY_BAY: 'RECOVERY_BAY',
  EXAM_SLOT: 'EXAM_SLOT',
  INCUBATOR: 'INCUBATOR'
};

exports.UnitResourceState = exports.$Enums.UnitResourceState = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  CLEANING: 'CLEANING',
  MAINTENANCE: 'MAINTENANCE',
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

exports.Prisma.ModelName = {
  Branch: 'Branch',
  FacilityCatalog: 'FacilityCatalog',
  BranchFacility: 'BranchFacility',
  Department: 'Department',
  DepartmentDoctor: 'DepartmentDoctor',
  DepartmentSpecialty: 'DepartmentSpecialty',
  Specialty: 'Specialty',
  Staff: 'Staff',
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
  GovernedChangeRequest: 'GovernedChangeRequest'
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
