import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { ApiTags } from "@nestjs/swagger";
import * as path from "path";
import * as fs from "fs";
import type { Principal } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { EvidenceService } from "./evidence.service";
import { UploadEvidenceDto, UpdateEvidenceDto, LinkEvidenceDto } from "./dto/evidence.dto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "compliance", "evidence");

@ApiTags("compliance/evidence")
@Controller("compliance/evidence")
export class EvidenceController {
  constructor(private readonly svc: EvidenceService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  @Get()
  @Permissions(PERM.COMPLIANCE_EVIDENCE_READ)
  async list(
    @Req() req: any,
    @Query("workspaceId") workspaceId?: string,
    @Query("linkedType") linkedType?: string,
    @Query("linkedId") linkedId?: string,
    @Query("expiringInDays") expiringInDays?: string,
    @Query("status") status?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.list(this.principal(req), {
      workspaceId,
      linkedType,
      linkedId,
      expiringInDays: expiringInDays ? parseInt(expiringInDays, 10) : undefined,
      status,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post()
  @Permissions(PERM.COMPLIANCE_EVIDENCE_UPLOAD)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
          const key = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}_${safeName}`;
          cb(null, key);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
      },
    }),
  )
  async upload(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadEvidenceDto,
  ) {
    return this.svc.upload(this.principal(req), dto, {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Get(":evidenceId/download")
  @Permissions(PERM.COMPLIANCE_EVIDENCE_READ)
  async downloadEvidence(
    @Param("evidenceId") evidenceId: string,
    @Res() res: any,
  ) {
    const { filePath, fileName, mimeType } =
      await this.svc.downloadEvidence(evidenceId);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get(":evidenceId/preview")
  @Permissions(PERM.COMPLIANCE_EVIDENCE_READ)
  async previewEvidence(
    @Param("evidenceId") evidenceId: string,
    @Res() res: any,
  ) {
    const { filePath, fileName, mimeType } =
      await this.svc.downloadEvidence(evidenceId);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get(":evidenceId")
  @Permissions(PERM.COMPLIANCE_EVIDENCE_READ)
  async get(@Req() req: any, @Param("evidenceId") evidenceId: string) {
    return this.svc.get(this.principal(req), evidenceId);
  }

  @Patch(":evidenceId")
  @Permissions(PERM.COMPLIANCE_EVIDENCE_UPLOAD)
  async update(
    @Req() req: any,
    @Param("evidenceId") evidenceId: string,
    @Body() dto: UpdateEvidenceDto,
  ) {
    return this.svc.update(this.principal(req), evidenceId, dto);
  }

  @Post(":evidenceId/link")
  @Permissions(PERM.COMPLIANCE_EVIDENCE_LINK)
  async link(
    @Req() req: any,
    @Param("evidenceId") evidenceId: string,
    @Body() dto: LinkEvidenceDto,
  ) {
    return this.svc.link(this.principal(req), evidenceId, dto);
  }

  @Post(":evidenceId/unlink")
  @Permissions(PERM.COMPLIANCE_EVIDENCE_LINK)
  async unlinkByPost(
    @Req() req: any,
    @Param("evidenceId") evidenceId: string,
    @Body() body: { linkId?: string; workspaceId?: string },
  ) {
    let linkId = body.linkId;

    // If no linkId provided, find the most recent link for this evidence
    if (!linkId) {
      const firstLink = await this.svc.findFirstLink(evidenceId);
      if (!firstLink) throw new NotFoundException("No link found for this evidence");
      linkId = firstLink.id;
    }

    return this.svc.unlink(this.principal(req), evidenceId, linkId);
  }

  @Delete(":evidenceId/link/:linkId")
  @Permissions(PERM.COMPLIANCE_EVIDENCE_LINK)
  async unlink(
    @Req() req: any,
    @Param("evidenceId") evidenceId: string,
    @Param("linkId") linkId: string,
  ) {
    return this.svc.unlink(this.principal(req), evidenceId, linkId);
  }
}
