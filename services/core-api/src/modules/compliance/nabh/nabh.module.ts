import { Module } from "@nestjs/common";
import { ComplianceSharedModule } from "../compliance-shared.module";
import { NabhController } from "./nabh.controller";
import { NabhService } from "./nabh.service";
import { NabhSeedService } from "./nabh-seed.service";

@Module({
  imports: [ComplianceSharedModule],
  controllers: [NabhController],
  providers: [NabhService, NabhSeedService],
  exports: [NabhService, NabhSeedService],
})
export class NabhModule {}
