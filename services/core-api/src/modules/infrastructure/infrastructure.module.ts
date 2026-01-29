import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InfrastructureSeedService } from "./infrastructure.seed";

import { InfraSharedModule } from "./shared/infra-shared.module";

import { LocationController } from "./location/location.controller";
import { LocationService } from "./location/location.service";

import { UnitTypesController } from "./unit-types/unit-types.controller";
import { UnitTypesService } from "./unit-types/unit-types.service";

import { UnitsController } from "./units/units.controller";
import { UnitsService } from "./units/units.service";

import { RoomsController } from "./rooms/rooms.controller";
import { RoomsService } from "./rooms/rooms.service";

import { ResourcesController } from "./resources/resources.controller";
import { ResourcesService } from "./resources/resources.service";

import { BranchConfigController } from "./branch-config/branch-config.controller";
import { BranchConfigService } from "./branch-config/branch-config.service";

import { EquipmentController } from "./equipment/equipment.controller";
import { EquipmentService } from "./equipment/equipment.service";

import { ChargeMasterController } from "./charge-master/charge-master.controller";
import { ChargeMasterService } from "./charge-master/charge-master.service";

import { ServiceItemsModule } from "./service-items/service-items.module";

import { ServiceCatalogueModule } from "./service-catalogue/service-catalogue.module";
import { ServicePackagesModule } from "./service-packages/service-packages.module";
import { OrderSetsModule } from "./order-sets/order-sets.module";
import { ServiceLibraryModule } from "./service-library/service-library.module";

import { FixItController } from "./fixit/fixit.controller";
import { FixItService } from "./fixit/fixit.service";

import { SchedulingController } from "./scheduling/scheduling.controller";
import { SchedulingService } from "./scheduling/scheduling.service";

import { ImportController } from "./import/import.controller";
import { ImportService } from "./import/import.service";

import { GoLiveController } from "./golive/golive.controller";
import { GoLiveService } from "./golive/golive.service";

import { DiagnosticsModule } from "./diagnostics/diagnostics.module";

@Module({
  imports: [
    AuthModule,
    InfraSharedModule,
    DiagnosticsModule,
    ServiceItemsModule,
    ServiceCatalogueModule,
    ServicePackagesModule,
    OrderSetsModule,
    ServiceLibraryModule,
  ],
  controllers: [
    LocationController,
    UnitTypesController,
    UnitsController,
    RoomsController,
    ResourcesController,
    BranchConfigController,
    EquipmentController,
    ChargeMasterController,
    FixItController,
    SchedulingController,
    ImportController,
    GoLiveController,
  ],
  providers: [
    LocationService,
    UnitTypesService,
    UnitsService,
    RoomsService,
    ResourcesService,
    BranchConfigService,
    EquipmentService,
    ChargeMasterService,
    FixItService,
    SchedulingService,
    ImportService,
    GoLiveService,
    InfrastructureSeedService,
  ],
})
export class InfrastructureModule {}
