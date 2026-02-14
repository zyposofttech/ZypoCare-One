import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "../database/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { BillingModule } from "../billing/billing.module";
import { ConsentModule } from "../consent/consent.module";
import { StatutoryModule } from "../statutory/statutory.module";
import { HealthController } from "./health.controller";
import { IamModule } from "../iam/iam.module";
import { BranchModule } from "../branch/branch.module";
import { GovernanceModule } from "../governance/governance.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { FacilitySetupModule } from "../facility-setup/facility-setup.module";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { OtModule } from "../infrastructure/ot/ot.module";
import { BloodBankModule } from "../blood-bank/blood-bank.module";
// import { NatsModule } from "../nats/nats.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AuditModule,
    EventsModule,
    BillingModule,
    ConsentModule,
    StatutoryModule,
    IamModule,
    BranchModule,
    GovernanceModule,
    ComplianceModule,
    FacilitySetupModule,
    InfrastructureModule,
    OtModule,
    BloodBankModule,
    //NatsModule
  ],
  controllers: [HealthController],
})
export class AppModule {}
