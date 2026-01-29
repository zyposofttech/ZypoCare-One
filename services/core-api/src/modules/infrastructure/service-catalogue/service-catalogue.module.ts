import { Module } from "@nestjs/common";

import { InfraSharedModule } from "../shared/infra-shared.module";

import { ServiceCataloguesController } from "./service-catalogues.controller";
import { ServiceCataloguesService } from "./service-catalogues.service";

@Module({
  imports: [InfraSharedModule],
  controllers: [ServiceCataloguesController],
  providers: [ServiceCataloguesService],
  exports: [ServiceCataloguesService],
})
export class ServiceCatalogueModule {}
