"""Pydantic models for branch context — the structured output consumed by AI engines."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class BranchSnapshot(BaseModel):
    id: str
    code: str | None = None
    name: str
    legalEntityName: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pinCode: str | None = None
    gstNumber: str | None = None
    panNumber: str | None = None
    clinicalEstRegNumber: str | None = None
    rohiniId: str | None = None
    hfrId: str | None = None
    accreditations: Any = None
    bedCount: int | None = None
    establishedDate: datetime | None = None
    defaultCurrency: str | None = None
    timezone: str | None = None
    fiscalYearStartMonth: int | None = None
    workingHours: Any = None
    emergency24x7: bool = False
    multiLanguageSupport: bool = False
    supportedLanguages: Any = None
    contactPhone1: str | None = None
    contactEmail: str | None = None


class LocationTreeNode(BaseModel):
    id: str
    kind: str
    code: str | None = None
    name: str | None = None
    isActive: bool = False
    floorNumber: int | None = None
    wheelchairAccess: bool = False
    emergencyExit: bool = False
    fireZone: str | None = None
    children: list[LocationTreeNode] = []


class LocationSummary(BaseModel):
    totalNodes: int = 0
    byKind: dict[str, int] = {}
    tree: list[LocationTreeNode] = []
    hasFireZones: bool = False
    hasEmergencyExits: bool = False
    hasWheelchairAccess: bool = False
    nodesWithoutRevision: int = 0


class RoomDetail(BaseModel):
    id: str
    code: str
    name: str
    roomType: str | None = None
    areaSqFt: int | None = None
    maxOccupancy: int | None = None
    pricingTier: str | None = None
    hasAttachedBathroom: bool = False
    hasAC: bool = False
    hasTV: bool = False
    hasOxygen: bool = False
    hasSuction: bool = False
    isActive: bool = True


class ResourceSummary(BaseModel):
    total: int = 0
    beds: int = 0
    schedulable: int = 0
    byType: dict[str, int] = {}
    byState: dict[str, int] = {}


class UnitDetail(BaseModel):
    id: str
    code: str
    name: str
    typeName: str = ""
    typeCode: str = ""
    isActive: bool = True
    locationNodeId: str | None = None
    departmentId: str | None = None
    departmentName: str | None = None
    rooms: list[RoomDetail] = []
    resources: ResourceSummary = ResourceSummary()


class UnitSummary(BaseModel):
    totalUnits: int = 0
    activeUnits: int = 0
    byType: dict[str, dict[str, Any]] = {}
    units: list[UnitDetail] = []


class DepartmentDetail(BaseModel):
    id: str
    code: str
    name: str
    hasHead: bool = False
    staffCount: int = 0
    facilityType: str | None = None


class DepartmentSummary(BaseModel):
    total: int = 0
    withHead: int = 0
    withStaff: int = 0
    departments: list[DepartmentDetail] = []


class SpecialtyDetail(BaseModel):
    id: str
    code: str
    name: str
    kind: str
    isActive: bool = True
    departmentCount: int = 0


class SpecialtySummary(BaseModel):
    total: int = 0
    active: int = 0
    byKind: dict[str, int] = {}
    specialties: list[SpecialtyDetail] = []


class PharmStoreSnapshot(BaseModel):
    id: str
    storeCode: str
    storeName: str
    storeType: str
    status: str
    parentStoreId: str | None = None
    pharmacistInChargeId: str | None = None
    drugLicenseNumber: str | None = None
    drugLicenseExpiry: datetime | None = None
    is24x7: bool = False
    canDispense: bool = False


class DrugSnapshot(BaseModel):
    id: str
    drugCode: str
    genericName: str
    brandName: str | None = None
    category: str = "OTHER"
    strength: str | None = None
    route: str | None = None
    scheduleClass: str = "GENERAL"
    isNarcotic: bool = False
    isControlled: bool = False
    isAntibiotic: bool = False
    isHighAlert: bool = False
    isLasa: bool = False
    formularyStatus: str = "NON_FORMULARY"
    status: str = "ACTIVE"


class PharmacySummary(BaseModel):
    totalStores: int = 0
    activeStores: int = 0
    stores: list[PharmStoreSnapshot] = []
    totalDrugs: int = 0
    activeDrugs: int = 0
    drugs: list[DrugSnapshot] = []
    narcoticCount: int = 0
    highAlertCount: int = 0
    antibioticCount: int = 0
    lasaCount: int = 0
    hasFormulary: bool = False
    formularyVersion: int | None = None
    formularyStatus: str | None = None
    interactionCount: int = 0
    supplierCount: int = 0
    inventoryConfigCount: int = 0
    byCategory: dict[str, int] = {}
    byScheduleClass: dict[str, int] = {}


class ServiceCatalogSummary(BaseModel):
    totalServiceItems: int = 0
    activeServiceItems: int = 0
    byCategory: dict[str, int] = {}
    withBasePrice: int = 0
    withoutBasePrice: int = 0
    totalChargeMaster: int = 0
    activeChargeMaster: int = 0
    totalPayers: int = 0
    activePayers: int = 0
    byPayerKind: dict[str, int] = {}
    totalContracts: int = 0
    activeContracts: int = 0
    expiredContracts: int = 0
    totalGovSchemes: int = 0
    activeGovSchemes: int = 0
    totalPricingTiers: int = 0
    activePricingTiers: int = 0
    totalTariffPlans: int = 0
    activeTariffPlans: int = 0
    totalTaxCodes: int = 0
    priceChangeCount: int = 0
    hasCashPayer: bool = False


class BillingSummary(BaseModel):
    """Aggregate billing/claims stats for a branch."""
    totalInsurancePolicies: int = 0
    activeInsurancePolicies: int = 0
    totalInsuranceCases: int = 0
    openInsuranceCases: int = 0
    totalPreauths: int = 0
    byPreauthStatus: dict[str, int] = {}
    pendingPreauths: int = 0
    approvedPreauths: int = 0
    rejectedPreauths: int = 0
    totalClaims: int = 0
    byClaimStatus: dict[str, int] = {}
    draftClaims: int = 0
    submittedClaims: int = 0
    settledClaims: int = 0
    rejectedClaims: int = 0
    totalDocumentChecklists: int = 0
    totalPayerIntegrations: int = 0
    activePayerIntegrations: int = 0


class BranchContext(BaseModel):
    branch: BranchSnapshot
    location: LocationSummary
    units: UnitSummary
    departments: DepartmentSummary
    specialties: SpecialtySummary = SpecialtySummary()
    pharmacy: PharmacySummary = PharmacySummary()
    serviceCatalog: ServiceCatalogSummary = ServiceCatalogSummary()
    billing: BillingSummary = BillingSummary()
    textSummary: str = ""
