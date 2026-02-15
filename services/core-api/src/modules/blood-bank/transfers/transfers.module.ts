import { Module } from "@nestjs/common";
import { BBSharedModule } from "../shared/bb-shared.module";
import { NotificationsModule } from "../../notifications/notifications.module";
import { TransfersController } from "./transfers.controller";
import { TransfersService } from "./transfers.service";

@Module({
  imports: [BBSharedModule, NotificationsModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
