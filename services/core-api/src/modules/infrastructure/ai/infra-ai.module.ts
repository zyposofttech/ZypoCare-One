import { Module } from "@nestjs/common";
import { InfraSharedModule } from "../shared/infra-shared.module";
import { InfraAiController } from "./infra-ai.controller";
import { InfraAiService } from "./infra-ai.service";
import { GoLiveService } from "../golive/golive.service";

/**
 * InfraAiModule
 *
 * Houses all 18 infrastructure AI features — Tier 1 rule-based engines.
 * Runs entirely inside core-api (no external deps, works offline).
 */
@Module({
  imports: [InfraSharedModule],
  controllers: [InfraAiController],
  providers: [InfraAiService, GoLiveService],
  exports: [InfraAiService],
})
export class InfraAiModule {}
