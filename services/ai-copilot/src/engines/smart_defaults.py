"""Smart Defaults Engine — context-aware defaults for entity creation.

When a user creates a room in an ICU unit, automatically suggests
oxygen=true, suction=true, monitor=true, maxOccupancy=1.
"""

from __future__ import annotations

from typing import Any


ICU_TYPES = {"ICU", "HDU", "CCU", "NICU", "PICU", "SICU", "MICU"}
CRITICAL_TYPES = ICU_TYPES | {"ER", "EMERGENCY", "OT", "PACU"}
WARD_TYPES = {"WARD", "GENERAL_WARD", "MATERNITY"}
OPD_TYPES = {"OPD", "CLINIC", "OUTPATIENT"}


def get_smart_defaults(
    entity_type: str,
    parent_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return suggested defaults + reasoning for a new entity."""
    ctx = parent_context or {}
    unit_type = (ctx.get("unitTypeCode") or "").upper()

    if entity_type == "room":
        return _room_defaults(unit_type, ctx)
    elif entity_type == "resource":
        return _resource_defaults(unit_type, ctx)
    elif entity_type == "unit":
        return _unit_defaults(ctx)
    elif entity_type == "specialty":
        return _specialty_defaults(ctx)
    elif entity_type == "department":
        return _department_defaults(ctx)
    elif entity_type == "unitType":
        return _unit_type_defaults(ctx)
    else:
        return {"defaults": {}, "reasoning": "No smart defaults for this entity type."}


def _room_defaults(unit_type: str, ctx: dict[str, Any]) -> dict[str, Any]:
    if unit_type in ICU_TYPES:
        return {
            "defaults": {
                "hasOxygen": True,
                "hasSuction": True,
                "hasMonitor": True,
                "hasVentilator": True,
                "hasCallButton": True,
                "maxOccupancy": 1,
                "roomType": "PATIENT_ROOM",
            },
            "reasoning": (
                "ICU rooms require oxygen supply, suction, cardiac monitoring, "
                "and ventilator readiness per NABH. Single occupancy recommended "
                "for infection control and patient safety."
            ),
        }

    if unit_type in {"ER", "EMERGENCY"}:
        return {
            "defaults": {
                "hasOxygen": True,
                "hasSuction": True,
                "hasMonitor": True,
                "hasCallButton": True,
                "maxOccupancy": 2,
                "roomType": "PROCEDURE",
            },
            "reasoning": (
                "Emergency rooms need oxygen, suction, and monitoring for resuscitation. "
                "Multi-patient bays are common in ER."
            ),
        }

    if unit_type in {"OT", "PACU"}:
        return {
            "defaults": {
                "hasOxygen": True,
                "hasSuction": True,
                "hasMonitor": True,
                "hasVentilator": True,
                "maxOccupancy": 1,
                "roomType": "PROCEDURE",
            },
            "reasoning": "Operating theatres and recovery areas require full life support equipment.",
        }

    if unit_type in WARD_TYPES:
        return {
            "defaults": {
                "hasCallButton": True,
                "hasAttachedBathroom": True,
                "maxOccupancy": 4,
                "roomType": "PATIENT_ROOM",
            },
            "reasoning": "General ward rooms typically have 4-6 beds with nurse call and attached bathroom.",
        }

    if unit_type in OPD_TYPES:
        return {
            "defaults": {
                "hasAC": True,
                "maxOccupancy": 1,
                "roomType": "CONSULTATION",
            },
            "reasoning": "OPD consultation rooms are single-doctor with climate control.",
        }

    return {
        "defaults": {"maxOccupancy": 1},
        "reasoning": "Default single-occupancy room.",
    }


def _resource_defaults(unit_type: str, ctx: dict[str, Any]) -> dict[str, Any]:
    if unit_type in ICU_TYPES:
        return {
            "defaults": {
                "resourceType": "ICU_BED",
                "hasOxygenSupply": True,
                "hasSuction": True,
                "hasMonitor": True,
                "hasVentilatorSupport": True,
            },
            "reasoning": "ICU beds require integrated life support per NABH standards.",
        }

    if unit_type in WARD_TYPES:
        return {
            "defaults": {
                "resourceType": "GENERAL_BED",
            },
            "reasoning": "Standard general beds for ward units.",
        }

    if unit_type in OPD_TYPES:
        return {
            "defaults": {
                "resourceType": "CONSULTATION_SLOT",
                "isSchedulable": True,
                "slotDurationMinutes": 15,
            },
            "reasoning": "OPD resources are schedulable consultation slots.",
        }

    return {"defaults": {}, "reasoning": "No specific defaults for this unit type."}


def _unit_defaults(ctx: dict[str, Any]) -> dict[str, Any]:
    return {
        "defaults": {
            "usesRooms": True,
            "isActive": True,
        },
        "reasoning": "Most units use room-based organization.",
    }


def _specialty_defaults(ctx: dict[str, Any]) -> dict[str, Any]:
    return {
        "defaults": {
            "kind": "SPECIALTY",
            "isActive": True,
        },
        "reasoning": "Default to standard specialty type. Change to SUPER_SPECIALTY for subspecialties like Cardiothoracic Surgery.",
    }


def _department_defaults(ctx: dict[str, Any]) -> dict[str, Any]:
    name = (ctx.get("name") or "").lower()

    # Infer facility type from name
    if any(kw in name for kw in ["emergency", "icu", "ot", "surgery", "cardiology", "orthopedic", "radiology", "pathology"]):
        facility_type = "CLINICAL"
    elif any(kw in name for kw in ["billing", "finance", "admin", "hr", "it", "procurement"]):
        facility_type = "SUPPORT"
    elif any(kw in name for kw in ["housekeeping", "laundry", "kitchen", "maintenance", "security"]):
        facility_type = "SERVICE"
    else:
        facility_type = "CLINICAL"

    return {
        "defaults": {
            "facilityType": facility_type,
            "isActive": True,
        },
        "reasoning": f"Suggested facility type '{facility_type}' based on department name pattern.",
    }


def _unit_type_defaults(ctx: dict[str, Any]) -> dict[str, Any]:
    category = (ctx.get("category") or "").upper()

    if category == "CRITICAL_CARE":
        return {
            "defaults": {
                "usesRoomsDefault": True,
                "bedBasedDefault": True,
                "schedulableByDefault": False,
            },
            "reasoning": "Critical care units are room-based and bed-based. Typically not schedulable.",
        }
    if category == "OUTPATIENT":
        return {
            "defaults": {
                "usesRoomsDefault": True,
                "bedBasedDefault": False,
                "schedulableByDefault": True,
            },
            "reasoning": "Outpatient units use consultation rooms and are schedulable for appointments.",
        }
    if category == "PROCEDURE":
        return {
            "defaults": {
                "usesRoomsDefault": True,
                "bedBasedDefault": False,
                "schedulableByDefault": True,
            },
            "reasoning": "Procedure units need operating/procedure rooms and are typically schedulable.",
        }
    if category == "INPATIENT":
        return {
            "defaults": {
                "usesRoomsDefault": True,
                "bedBasedDefault": True,
                "schedulableByDefault": False,
            },
            "reasoning": "Inpatient units are room and bed-based. Admission-driven, not schedulable.",
        }

    return {
        "defaults": {
            "usesRoomsDefault": True,
            "isActive": True,
        },
        "reasoning": "Default: uses rooms. Adjust based on unit category.",
    }
