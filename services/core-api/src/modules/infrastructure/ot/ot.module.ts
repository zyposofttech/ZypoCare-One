import { Module } from "@nestjs/common";

import { OtController } from "./ot.controller";
import { OtService } from "./ot.service";

import { OtTheatreController } from "./ot-theatre.controller";
import { OtTheatreService } from "./ot-theatre.service";

import { OtSchedulingController } from "./ot-scheduling.controller";
import { OtSchedulingService } from "./ot-scheduling.service";

import { OtStaffController } from "./ot-staff.controller";
import { OtStaffService } from "./ot-staff.service";

import { OtStoreController } from "./ot-store.controller";
import { OtStoreService } from "./ot-store.service";

import { OtBillingController } from "./ot-billing.controller";
import { OtBillingService } from "./ot-billing.service";

import { OtComplianceController } from "./ot-compliance.controller";
import { OtComplianceService } from "./ot-compliance.service";

import { OtValidationController } from "./ot-validation.controller";
import { OtValidationService } from "./ot-validation.service";

import { OtCopilotController } from "./ot-copilot.controller";
import { OtCopilotService } from "./ot-copilot.service";

// ✅ Provides AccessPolicyService + PrincipalGuard + PermissionsGuard
import { AuthModule } from "../../auth/auth.module";

// ✅ Provides the "PRISMA" token (safe even if PrismaModule is @Global)
import { PrismaModule } from "../../database/prisma.module";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    OtController,
    OtTheatreController,
    OtSchedulingController,
    OtStaffController,
    OtStoreController,
    OtBillingController,
    OtComplianceController,
    OtValidationController,
    OtCopilotController,
  ],
  providers: [
    OtService,
    OtTheatreService,
    OtSchedulingService,
    OtStaffService,
    OtStoreService,
    OtBillingService,
    OtComplianceService,
    OtValidationService,
    OtCopilotService,
  ],
  exports: [OtService],
})
export class OtModule {}
