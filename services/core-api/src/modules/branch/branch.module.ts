import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module"; 
import { BranchController } from "./branch.controller";
import { BranchService } from "./branch.service";

@Module({
  imports: [
    AuditModule,
    AuthModule, // 👈 Add to imports
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}