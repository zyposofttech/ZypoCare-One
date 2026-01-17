
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

exports.Prisma.OTScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  isActive: 'isActive',
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

exports.Prisma.TariffPlanScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  code: 'code',
  name: 'name',
  status: 'status',
  payerType: 'payerType',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
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
  serviceCode: 'serviceCode',
  amount: 'amount',
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
  isOrderable: 'isOrderable',
  isActive: 'isActive',
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

exports.Prisma.FixItTaskScalarFieldEnum = {
  id: 'id',
  branchId: 'branchId',
  type: 'type',
  status: 'status',
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

exports.FixItTaskType = exports.$Enums.FixItTaskType = {
  SERVICE_CHARGE_MAPPING_MISSING: 'SERVICE_CHARGE_MAPPING_MISSING'
};

exports.FixItStatus = exports.$Enums.FixItStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED'
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
  OT: 'OT',
  Asset: 'Asset',
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
  ServiceChargeMapping: 'ServiceChargeMapping',
  FixItTask: 'FixItTask',
  BulkImportJob: 'BulkImportJob',
  ProcedureBooking: 'ProcedureBooking',
  GoLiveReport: 'GoLiveReport'
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
