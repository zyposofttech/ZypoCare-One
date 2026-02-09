"""Pydantic models for Infrastructure AI endpoints."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, Optional


# ── Auto-fill Request ────────────────────────────────────────────────────

class AutoFillInput(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pinCode: Optional[str] = None
    bedCount: Optional[int] = None
    hospitalType: Optional[str] = None
    specialties: list[str] = Field(default_factory=list)
    emergency24x7: Optional[bool] = None


# ── Auto-fill Response ───────────────────────────────────────────────────

class AutoFillSuggestion(BaseModel):
    field: str
    value: Any
    confidence: float
    reasoning: str
    source: str
    isOverride: bool = False


class RoomType(BaseModel):
    type: str
    count: int


class UnitSuggestion(BaseModel):
    typeCode: str
    typeName: str
    suggestedCount: int
    bedCount: int
    roomTypes: list[RoomType] = Field(default_factory=list)
    reasoning: str


class DepartmentSuggestion(BaseModel):
    code: str
    name: str
    reason: str


class EquipmentHighlight(BaseModel):
    name: str
    quantity: int
    compliance: Optional[str] = None
    reason: str


class AutoFillResult(BaseModel):
    suggestions: list[AutoFillSuggestion] = Field(default_factory=list)
    unitPlan: list[UnitSuggestion] = Field(default_factory=list)
    departmentSuggestions: list[DepartmentSuggestion] = Field(default_factory=list)
    equipmentHighlights: list[EquipmentHighlight] = Field(default_factory=list)
    summary: str = ""
    confidence: float = 0.0


# ── Validate GSTIN / PAN ────────────────────────────────────────────────

class ValidateGstinInput(BaseModel):
    gstin: str


class ValidatePanInput(BaseModel):
    pan: str


class ValidationResult(BaseModel):
    valid: bool
    input: str
    errors: list[str] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)


# ── Department Suggest ───────────────────────────────────────────────────

class DepartmentSuggestInput(BaseModel):
    specialties: list[str]
    hospitalType: Optional[str] = None
