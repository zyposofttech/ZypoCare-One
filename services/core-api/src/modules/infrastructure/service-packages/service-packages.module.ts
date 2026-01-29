import { Module } from "@nestjs/common";

import { InfraSharedModule } from "../shared/infra-shared.module";

import { ServicePackagesController } from "./service-packages.controller";
import { ServicePackagesService } from "./service-packages.service";

@Module({
  imports: [InfraSharedModule],
  controllers: [ServicePackagesController],
  providers: [ServicePackagesService],
  exports: [ServicePackagesService],
})
export class ServicePackagesModule {}
