import { Module } from "@nestjs/common";
import { BBSharedModule } from "../shared/bb-shared.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [BBSharedModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
