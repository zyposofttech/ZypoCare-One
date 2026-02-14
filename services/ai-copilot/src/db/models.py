"""SQLAlchemy models — read-only mirrors of Prisma schema.

These models map to the tables Prisma manages. We do NOT create or migrate
tables — we only read from them. Column names use Prisma's camelCase convention.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    Numeric,
    String,
    Text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ── Branch ────────────────────────────────────────────────────────────────


class Branch(Base):
    __tablename__ = "Branch"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)

    organizationId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)

    legalEntityName: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(240), nullable=True)
    pinCode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    contactPhone1: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    contactPhone2: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    contactEmail: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    gstNumber: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    panNumber: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    clinicalEstRegNumber: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    rohiniId: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    hfrId: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    logoUrl: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    socialLinks: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    accreditations: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    bedCount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    establishedDate: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    defaultCurrency: Mapped[str] = mapped_column(String(8), default="INR")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    fiscalYearStartMonth: Mapped[int] = mapped_column(Integer, default=4)
    workingHours: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    emergency24x7: Mapped[bool] = mapped_column(Boolean, default=True)
    multiLanguageSupport: Mapped[bool] = mapped_column(Boolean, default=False)
    supportedLanguages: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


# ── Location ──────────────────────────────────────────────────────────────


class LocationNode(Base):
    __tablename__ = "LocationNode"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    kind: Mapped[str] = mapped_column(String)  # LocationKind enum
    parentId: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("LocationNode.id"), nullable=True
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)

    revisions: Mapped[list["LocationNodeRevision"]] = relationship(
        back_populates="node", lazy="selectin"
    )


class LocationNodeRevision(Base):
    __tablename__ = "LocationNodeRevision"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    nodeId: Mapped[str] = mapped_column(
        String, ForeignKey("LocationNode.id", ondelete="CASCADE")
    )

    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)

    gpsLat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gpsLng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    floorNumber: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    wheelchairAccess: Mapped[bool] = mapped_column(Boolean, default=False)
    stretcherAccess: Mapped[bool] = mapped_column(Boolean, default=False)
    emergencyExit: Mapped[bool] = mapped_column(Boolean, default=False)
    fireZone: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    effectiveFrom: Mapped[datetime] = mapped_column(DateTime)
    effectiveTo: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)

    node: Mapped["LocationNode"] = relationship(back_populates="revisions")


# ── Department ────────────────────────────────────────────────────────────


class Department(Base):
    __tablename__ = "Department"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    facilityId: Mapped[str] = mapped_column(String)
    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    headStaffId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    facilityType: Mapped[str] = mapped_column(String, default="CLINICAL")
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


# ── Unit Type Catalog ─────────────────────────────────────────────────────


class UnitTypeCatalog(Base):
    __tablename__ = "UnitTypeCatalog"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String, default="OUTPATIENT")
    usesRoomsDefault: Mapped[bool] = mapped_column(Boolean, default=True)
    schedulableByDefault: Mapped[bool] = mapped_column(Boolean, default=False)
    bedBasedDefault: Mapped[bool] = mapped_column(Boolean, default=False)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    sortOrder: Mapped[int] = mapped_column(Integer, default=0)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class BranchUnitType(Base):
    __tablename__ = "BranchUnitType"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    unitTypeId: Mapped[str] = mapped_column(
        String, ForeignKey("UnitTypeCatalog.id")
    )
    isEnabled: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)

    unitType: Mapped["UnitTypeCatalog"] = relationship(lazy="selectin")


# ── Unit ──────────────────────────────────────────────────────────────────


class Unit(Base):
    __tablename__ = "Unit"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    locationNodeId: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("LocationNode.id"), nullable=True
    )
    departmentId: Mapped[str] = mapped_column(String, ForeignKey("Department.id"))
    unitTypeId: Mapped[str] = mapped_column(
        String, ForeignKey("UnitTypeCatalog.id")
    )

    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(160))
    usesRooms: Mapped[bool] = mapped_column(Boolean, default=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)

    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)

    unitType: Mapped["UnitTypeCatalog"] = relationship(lazy="selectin")
    department: Mapped["Department"] = relationship(lazy="selectin")
    rooms: Mapped[list["UnitRoom"]] = relationship(back_populates="unit", lazy="selectin")
    resources: Mapped[list["UnitResource"]] = relationship(
        back_populates="unit", lazy="selectin"
    )


# ── Unit Room ─────────────────────────────────────────────────────────────


class UnitRoom(Base):
    __tablename__ = "UnitRoom"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    unitId: Mapped[str] = mapped_column(String, ForeignKey("Unit.id"))

    code: Mapped[str] = mapped_column(String(64))
    roomNumber: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    roomType: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    areaSqFt: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    hasAttachedBathroom: Mapped[bool] = mapped_column(Boolean, default=False)
    hasAC: Mapped[bool] = mapped_column(Boolean, default=False)
    hasTV: Mapped[bool] = mapped_column(Boolean, default=False)
    hasOxygen: Mapped[bool] = mapped_column(Boolean, default=False)
    hasSuction: Mapped[bool] = mapped_column(Boolean, default=False)
    hasVentilator: Mapped[bool] = mapped_column(Boolean, default=False)
    hasMonitor: Mapped[bool] = mapped_column(Boolean, default=False)
    hasCallButton: Mapped[bool] = mapped_column(Boolean, default=False)

    maxOccupancy: Mapped[int] = mapped_column(Integer, default=1)
    currentOccupancy: Mapped[int] = mapped_column(Integer, default=0)

    pricingTier: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    baseChargePerDay: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    isIsolation: Mapped[bool] = mapped_column(Boolean, default=False)
    isolationType: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    isAvailable: Mapped[bool] = mapped_column(Boolean, default=True)
    maintenanceStatus: Mapped[str] = mapped_column(String, default="OPERATIONAL")

    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)

    unit: Mapped["Unit"] = relationship(back_populates="rooms")


# ── Unit Resource ─────────────────────────────────────────────────────────


class UnitResource(Base):
    __tablename__ = "UnitResource"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    unitId: Mapped[str] = mapped_column(String, ForeignKey("Unit.id"))
    roomId: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("UnitRoom.id"), nullable=True
    )

    resourceType: Mapped[str] = mapped_column(String)
    code: Mapped[str] = mapped_column(String(96))
    assetTag: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(160))

    hasMonitor: Mapped[bool] = mapped_column(Boolean, default=False)
    hasOxygenSupply: Mapped[bool] = mapped_column(Boolean, default=False)
    hasSuction: Mapped[bool] = mapped_column(Boolean, default=False)
    hasVentilatorSupport: Mapped[bool] = mapped_column(Boolean, default=False)
    isPowerRequired: Mapped[bool] = mapped_column(Boolean, default=False)

    state: Mapped[str] = mapped_column(String, default="AVAILABLE")
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    isSchedulable: Mapped[bool] = mapped_column(Boolean, default=False)

    reservedReason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    blockedReason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)

    unit: Mapped["Unit"] = relationship(back_populates="resources")


# ── Branch Infra Config ───────────────────────────────────────────────────


class BranchInfraConfig(Base):
    __tablename__ = "BranchInfraConfig"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"), unique=True)
    housekeepingGateEnabled: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


# ── Equipment ─────────────────────────────────────────────────────────────


class EquipmentAsset(Base):
    __tablename__ = "EquipmentAsset"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    code: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String, default="GENERAL")
    operationalStatus: Mapped[str] = mapped_column(String, default="OPERATIONAL")

    aerbLicenseNo: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    aerbValidTo: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    pcpndtRegNo: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    pcpndtValidTo: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


# ── Staff Assignment (for department staff counts) ────────────────────────


class StaffAssignment(Base):
    __tablename__ = "StaffAssignment"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    departmentId: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("Department.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


# ── Specialty ────────────────────────────────────────────────────────────


class Specialty(Base):
    __tablename__ = "Specialty"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String, default="SPECIALTY")
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class DepartmentSpecialty(Base):
    __tablename__ = "DepartmentSpecialty"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    departmentId: Mapped[str] = mapped_column(String, ForeignKey("Department.id"))
    specialtyId: Mapped[str] = mapped_column(String, ForeignKey("Specialty.id"))
    isPrimary: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


# ── Pharmacy ─────────────────────────────────────────────────────────────


class PharmacyStore(Base):
    __tablename__ = "PharmacyStore"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    storeCode: Mapped[str] = mapped_column(String(32))
    storeName: Mapped[str] = mapped_column(String(160))
    storeType: Mapped[str] = mapped_column(String)  # PharmacyStoreType enum
    status: Mapped[str] = mapped_column(String, default="UNDER_SETUP")
    parentStoreId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    locationNodeId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    pharmacistInChargeId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    drugLicenseNumber: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    drugLicenseExpiry: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is24x7: Mapped[bool] = mapped_column(Boolean, default=False)
    canDispense: Mapped[bool] = mapped_column(Boolean, default=False)
    canIndent: Mapped[bool] = mapped_column(Boolean, default=True)
    canReceiveStock: Mapped[bool] = mapped_column(Boolean, default=False)
    canReturnVendor: Mapped[bool] = mapped_column(Boolean, default=False)
    autoIndentEnabled: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class DrugMaster(Base):
    __tablename__ = "DrugMaster"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    drugCode: Mapped[str] = mapped_column(String(32))
    genericName: Mapped[str] = mapped_column(String(255))
    brandName: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String)  # DrugCategory enum
    strength: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    route: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    scheduleClass: Mapped[str] = mapped_column(String, default="GENERAL")
    therapeuticClass: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    isNarcotic: Mapped[bool] = mapped_column(Boolean, default=False)
    isPsychotropic: Mapped[bool] = mapped_column(Boolean, default=False)
    isControlled: Mapped[bool] = mapped_column(Boolean, default=False)
    isAntibiotic: Mapped[bool] = mapped_column(Boolean, default=False)
    isHighAlert: Mapped[bool] = mapped_column(Boolean, default=False)
    isLasa: Mapped[bool] = mapped_column(Boolean, default=False)
    mrp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    purchasePrice: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hsnCode: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    gstRate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    formularyStatus: Mapped[str] = mapped_column(String, default="APPROVED")
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class PharmSupplier(Base):
    __tablename__ = "PharmSupplier"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    supplierCode: Mapped[str] = mapped_column(String(32))
    supplierName: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    drugLicenseExpiry: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class Formulary(Base):
    __tablename__ = "Formulary"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    version: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String, default="DRAFT")
    publishedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class FormularyItem(Base):
    __tablename__ = "FormularyItem"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    formularyId: Mapped[str] = mapped_column(String, ForeignKey("Formulary.id"))
    drugMasterId: Mapped[str] = mapped_column(String, ForeignKey("DrugMaster.id"))
    tier: Mapped[str] = mapped_column(String, default="APPROVED")
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class InventoryConfig(Base):
    __tablename__ = "InventoryConfig"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    pharmacyStoreId: Mapped[str] = mapped_column(String, ForeignKey("PharmacyStore.id"))
    drugMasterId: Mapped[str] = mapped_column(String, ForeignKey("DrugMaster.id"))
    minimumStock: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    maximumStock: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reorderLevel: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reorderQuantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    safetyStock: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    abcClass: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    vedClass: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class DrugInteraction(Base):
    __tablename__ = "DrugInteraction"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    drugAId: Mapped[str] = mapped_column(String, ForeignKey("DrugMaster.id"))
    drugBId: Mapped[str] = mapped_column(String, ForeignKey("DrugMaster.id"))
    severity: Mapped[str] = mapped_column(String, default="MODERATE")
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


# ═══════════════════════════════════════════════════════════════════════════
# Service Catalog & Financial Configuration
# ═══════════════════════════════════════════════════════════════════════════


class ServiceItem(Base):
    __tablename__ = "ServiceItem"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    shortName: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String)
    subCategory: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    specialtyId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    basePrice: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    costPrice: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    allowDiscount: Mapped[bool] = mapped_column(Boolean, default=True)
    isOrderable: Mapped[bool] = mapped_column(Boolean, default=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class ChargeMasterItem(Base):
    __tablename__ = "ChargeMasterItem"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    baseRate: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class Payer(Base):
    __tablename__ = "Payer"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String, default="INSURANCE")
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    creditDays: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    creditLimit: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    requiresPreauth: Mapped[bool] = mapped_column(Boolean, default=False)
    networkType: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class PayerContract(Base):
    __tablename__ = "PayerContract"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    payerId: Mapped[str] = mapped_column(String, ForeignKey("Payer.id"))
    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="DRAFT")
    pricingStrategy: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    globalDiscountPercent: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    startAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    endAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    autoRenewal: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class GovernmentSchemeConfig(Base):
    __tablename__ = "GovernmentSchemeConfig"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    schemeType: Mapped[str] = mapped_column(String)
    schemeName: Mapped[str] = mapped_column(String)
    schemeCode: Mapped[str] = mapped_column(String)
    preauthRequired: Mapped[bool] = mapped_column(Boolean, default=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    validTill: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class PatientPricingTier(Base):
    __tablename__ = "PatientPricingTier"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    kind: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    code: Mapped[str] = mapped_column(String)
    defaultDiscountPercent: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    defaultMarkupPercent: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class ServicePriceHistory(Base):
    __tablename__ = "ServicePriceHistory"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    serviceItemId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    chargeMasterItemId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    oldPrice: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    newPrice: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    changePercent: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=0)
    changeReason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effectiveFrom: Mapped[datetime] = mapped_column(DateTime)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class TariffPlan(Base):
    __tablename__ = "TariffPlan"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


class TaxCode(Base):
    __tablename__ = "TaxCode"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    rate: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
    updatedAt: Mapped[datetime] = mapped_column(DateTime)


# ── Billing / Claims ──────────────────────────────────────────────────────


class InsurancePolicy(Base):
    __tablename__ = "InsurancePolicy"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    createdAt: Mapped[datetime] = mapped_column(DateTime)


class InsuranceCase(Base):
    __tablename__ = "InsuranceCase"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    caseNumber: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="OPEN")
    createdAt: Mapped[datetime] = mapped_column(DateTime)


class PreauthRequest(Base):
    __tablename__ = "PreauthRequest"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    requestNumber: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="PREAUTH_DRAFT")
    requestedAmount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    approvedAmount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)


class Claim(Base):
    __tablename__ = "Claim"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    claimNumber: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="CLAIM_DRAFT")
    totalAmount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    approvedAmount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)


class DocumentChecklist(Base):
    __tablename__ = "DocumentChecklist"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    payerId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)


class PayerIntegrationConfig(Base):
    __tablename__ = "PayerIntegrationConfig"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    branchId: Mapped[str] = mapped_column(String, ForeignKey("Branch.id"))
    payerId: Mapped[str] = mapped_column(String)
    integrationMode: Mapped[str] = mapped_column(String, default="MANUAL")
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime)
