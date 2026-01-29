import { Module } from "@nestjs/common";

import { InfraSharedModule } from "../shared/infra-shared.module";

import { ServiceLibraryController } from "./service-library.controller";
import { ServiceLibraryService } from "./service-library.service";

/**
 * Infrastructure → Service Library
 *
 * Maintains standard code sets (CPT/LOINC/HCPCS/internal) and maps those codes to ServiceItems.
 * This is used to bootstrap catalogues, imports, and integrations.
 */
@Module({
  imports: [InfraSharedModule],
  controllers: [ServiceLibraryController],
  providers: [ServiceLibraryService],
  exports: [ServiceLibraryService],
})
export class ServiceLibraryModule {}
