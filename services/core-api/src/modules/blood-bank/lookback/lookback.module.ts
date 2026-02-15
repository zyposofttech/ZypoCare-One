import { Module } from "@nestjs/common";
import { BBSharedModule } from "../shared/bb-shared.module";
import { NotificationsModule } from "../../notifications/notifications.module";
import { LookbackController } from "./lookback.controller";
import { LookbackService } from "./lookback.service";

@Module({
  imports: [BBSharedModule, NotificationsModule],
  controllers: [LookbackController],
  providers: [LookbackService],
  exports: [LookbackService],
})
export class LookbackModule {}
