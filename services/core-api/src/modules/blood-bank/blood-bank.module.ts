import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BBSharedModule } from "./shared/bb-shared.module";

import { FacilityController } from "./facility/facility.controller";
import { FacilityService } from "./facility/facility.service";

import { ComponentMasterController } from "./component-master/component-master.controller";
import { ComponentMasterService } from "./component-master/component-master.service";

import { BBEquipmentController } from "./equipment/bb-equipment.controller";
import { BBEquipmentService } from "./equipment/bb-equipment.service";

import { ReagentController } from "./reagent/reagent.controller";
import { ReagentService } from "./reagent/reagent.service";

import { BBTariffController } from "./tariff/bb-tariff.controller";
import { BBTariffService } from "./tariff/bb-tariff.service";

import { DonorController } from "./donor/donor.controller";
import { DonorService } from "./donor/donor.service";

import { CollectionController } from "./collection/collection.controller";
import { CollectionService } from "./collection/collection.service";

import { CampController } from "./camp/camp.controller";
import { CampService } from "./camp/camp.service";

import { TestingController } from "./testing/testing.controller";
import { TestingService } from "./testing/testing.service";

import { InventoryController } from "./inventory/inventory.controller";
import { InventoryService } from "./inventory/inventory.service";

import { CrossMatchController } from "./cross-match/cross-match.controller";
import { CrossMatchService } from "./cross-match/cross-match.service";

import { IssueController } from "./issue/issue.controller";
import { IssueService } from "./issue/issue.service";

import { QCController } from "./quality-control/qc.controller";
import { QCService } from "./quality-control/qc.service";

import { ReportsController } from "./reports/reports.controller";
import { ReportsService } from "./reports/reports.service";

@Module({
  imports: [AuthModule, BBSharedModule],
  controllers: [
    FacilityController,
    ComponentMasterController,
    BBEquipmentController,
    ReagentController,
    BBTariffController,
    DonorController,
    CollectionController,
    CampController,
    TestingController,
    InventoryController,
    CrossMatchController,
    IssueController,
    QCController,
    ReportsController,
  ],
  providers: [
    FacilityService,
    ComponentMasterService,
    BBEquipmentService,
    ReagentService,
    BBTariffService,
    DonorService,
    CollectionService,
    CampService,
    TestingService,
    InventoryService,
    CrossMatchService,
    IssueService,
    QCService,
    ReportsService,
  ],
})
export class BloodBankModule {}
