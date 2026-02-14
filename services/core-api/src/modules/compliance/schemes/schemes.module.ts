import { Module } from "@nestjs/common";
import { ComplianceSharedModule } from "../compliance-shared.module";
import { SchemesController } from "./schemes.controller";
import { SchemesService } from "./schemes.service";
import { SchemeSyncService } from "./scheme-sync.service";

@Module({
  imports: [ComplianceSharedModule],
  controllers: [SchemesController],
  providers: [SchemesService, SchemeSyncService],
  exports: [SchemesService, SchemeSyncService],
})
export class SchemesModule {}
