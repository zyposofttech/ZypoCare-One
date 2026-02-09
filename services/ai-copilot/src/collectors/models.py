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


class BranchContext(BaseModel):
    branch: BranchSnapshot
    location: LocationSummary
    units: UnitSummary
    departments: DepartmentSummary
    specialties: SpecialtySummary = SpecialtySummary()
    textSummary: str = ""
