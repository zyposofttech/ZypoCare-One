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
