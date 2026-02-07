import { Module } from "@nestjs/common";
import { InfraSharedModule } from "../shared/infra-shared.module";
import { StaffController } from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
  imports: [InfraSharedModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
