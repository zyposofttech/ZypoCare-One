import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IamModule } from "../iam/iam.module";
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

import { TaxCodesController } from "./tax-codes/tax-codes.controller";
import { TaxCodesService } from "./tax-codes/tax-codes.service";

import { ServiceAvailabilityController } from "./service-availability/service-availability.controller";
import { ServiceAvailabilityService } from "./service-availability/service-availability.service";
import { TariffPlansController } from "./tariff-plans/tariff-plans.controller";
import { TariffPlansService } from "./tariff-plans/tariff-plans.service";

import { StaffController } from "./staff/staff.controller";
import { StaffService } from "./staff/staff.service";
import { StaffPrivilegePolicyService } from "./staff/staff-privilege-policy.service";
import { FilesController } from "./files/files.controller";
import { InfraFilesService } from "./files/files.service";

import { PharmacyController } from "./pharmacy/pharmacy.controller";
import { PharmacyService } from "./pharmacy/pharmacy.service";
import { DrugMasterController } from "./pharmacy/drug-master.controller";
import { DrugMasterService } from "./pharmacy/drug-master.service";
import { FormularyController } from "./pharmacy/formulary.controller";
import { FormularyService } from "./pharmacy/formulary.service";
import { SupplierController } from "./pharmacy/supplier.controller";
import { SupplierService } from "./pharmacy/supplier.service";
import { InventoryConfigController } from "./pharmacy/inventory-config.controller";
import { InventoryConfigService } from "./pharmacy/inventory-config.service";
import { PharmacyGoLiveService } from "./pharmacy/pharmacy-golive.service";
import { DrugInteractionController } from "./pharmacy/drug-interaction.controller";
import { DrugInteractionService } from "./pharmacy/drug-interaction.service";
import { TherapeuticSubstitutionController } from "./pharmacy/therapeutic-substitution.controller";
import { TherapeuticSubstitutionService } from "./pharmacy/therapeutic-substitution.service";
import { FormularyGovernanceController } from "./pharmacy/formulary-governance.controller";
import { FormularyGovernanceService } from "./pharmacy/formulary-governance.service";
import { DrugCategoryController } from "./pharmacy/drug-category.controller";
import { DrugCategoryService } from "./pharmacy/drug-category.service";

import { PayerController } from "./payers/payer.controller";
import { PayerService } from "./payers/payer.service";
import { PayerContractController } from "./payer-contracts/payer-contract.controller";
import { PayerContractService } from "./payer-contracts/payer-contract.service";
import { GovSchemeController } from "./gov-schemes/gov-scheme.controller";
import { GovSchemeService } from "./gov-schemes/gov-scheme.service";
import { PricingTierController } from "./pricing-tiers/pricing-tier.controller";
import { PricingTierService } from "./pricing-tiers/pricing-tier.service";
import { PriceHistoryController } from "./price-history/price-history.controller";
import { PriceHistoryService } from "./price-history/price-history.service";

@Module({
  imports: [
    AuthModule,
    IamModule,
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
    TaxCodesController,
    ServiceAvailabilityController,
    TariffPlansController,
    StaffController,
    FilesController,
    PharmacyController,
    DrugMasterController,
    FormularyController,
    SupplierController,
    InventoryConfigController,
    DrugInteractionController,
    TherapeuticSubstitutionController,
    DrugCategoryController,
    PayerController,
    PayerContractController,
    GovSchemeController,
    PricingTierController,
    PriceHistoryController,
    FormularyGovernanceController
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
    TaxCodesService,
    ServiceAvailabilityService,
    TariffPlansService,
    StaffService,
    StaffPrivilegePolicyService,
    InfraFilesService,
    PharmacyService,
    DrugMasterService,
    FormularyService,
    SupplierService,
    InventoryConfigService,
    PharmacyGoLiveService,
    DrugInteractionService,
    TherapeuticSubstitutionService,
    DrugCategoryService,
    PayerService,
    PayerContractService,
    GovSchemeService,
    PricingTierService,
    PriceHistoryService,
    FormularyGovernanceService
  ],
})
export class InfrastructureModule {}
