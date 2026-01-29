import { Module } from "@nestjs/common";

import { InfraSharedModule } from "../shared/infra-shared.module";

import { OrderSetsController } from "./order-sets.controller";
import { OrderSetsService } from "./order-sets.service";

@Module({
  imports: [InfraSharedModule],
  controllers: [OrderSetsController],
  providers: [OrderSetsService],
  exports: [OrderSetsService],
})
export class OrderSetsModule {}
