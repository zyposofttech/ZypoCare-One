import { Module } from "@nestjs/common";

import { InfraSharedModule } from "../shared/infra-shared.module";

import { ServiceItemsController } from "./service-items.controller";
import { ServiceItemsService } from "./service-items.service";
import { ServiceChargeMappingController } from "./service-charge-mapping.controller";
import { ServiceChargeMappingService } from "./service-charge-mapping.service";

@Module({
  imports: [InfraSharedModule],
  controllers: [ServiceItemsController, ServiceChargeMappingController],
  providers: [ServiceItemsService, ServiceChargeMappingService],
  exports: [ServiceItemsService, ServiceChargeMappingService],
})
export class ServiceItemsModule {}
