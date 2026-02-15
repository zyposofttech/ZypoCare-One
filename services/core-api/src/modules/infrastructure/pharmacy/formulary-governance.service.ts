import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import type {
  CreateFormularyCommitteeDto,
  UpdateFormularyCommitteeDto,
  UpsertCommitteeMembersDto,
  UpdateFormularyPolicyDto,
} from "./dto";

@Injectable()
export class FormularyGovernanceService {
  constructor(private readonly ctx: InfraContextService) {}

  async listCommittees(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    return this.ctx.prisma.pharmFormularyCommittee.findMany({
      where: { branchId: bid },
      orderBy: [{ createdAt: "desc" }],
      include: {
        _count: { select: { members: true } },
        members: {
          orderBy: [{ createdAt: "asc" }],
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async createCommittee(principal: Principal, dto: CreateFormularyCommitteeDto, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Committee name is required");

    const exists = await this.ctx.prisma.pharmFormularyCommittee.findFirst({
      where: { branchId: bid, name },
      select: { id: true },
    });
    if (exists) throw new BadRequestException("Committee with same name already exists in this branch");

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      const committee = await tx.pharmFormularyCommittee.create({
        data: {
          branchId: bid,
          name,
          description: dto.description?.trim() || null,
          createdByUserId: principal.userId,
        },
      });

      const memberIds = new Set<string>(dto.memberUserIds ?? []);
      if (dto.chairUserId) memberIds.add(dto.chairUserId);

      if (memberIds.size) {
        // Validate users exist
        const users = await tx.user.findMany({
          where: { id: { in: Array.from(memberIds) } },
          select: { id: true },
        });
        if (users.length !== memberIds.size) throw new BadRequestException("Some committee userIds are invalid");

        await tx.pharmFormularyCommitteeMember.createMany({
          data: Array.from(memberIds).map((userId) => ({
            committeeId: committee.id,
            userId,
            role: dto.chairUserId === userId ? ("CHAIR" as any) : ("MEMBER" as any),
            isActive: true,
          })),
          skipDuplicates: true,
        });
      }

      return tx.pharmFormularyCommittee.findUniqueOrThrow({
        where: { id: committee.id },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          _count: { select: { members: true } },
        },
      });
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "PHARMACY_FORMULARY_COMMITTEE_CREATE",
      entity: "PharmFormularyCommittee",
      entityId: created.id,
      meta: { name: created.name, membersSeeded: created._count.members },
    });

    return created;
  }

  async updateCommittee(principal: Principal, id: string, dto: UpdateFormularyCommitteeDto) {
    const existing = await this.ctx.prisma.pharmFormularyCommittee.findUnique({
      where: { id },
      select: { id: true, branchId: true },
    });
    if (!existing) throw new NotFoundException("Committee not found");

    this.ctx.resolveBranchId(principal, existing.branchId);

    const updated = await this.ctx.prisma.pharmFormularyCommittee.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? (dto.description?.trim() ?? null) : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { members: true } },
      },
    });

    await this.ctx.audit.log({
      branchId: existing.branchId,
      actorUserId: principal.userId,
      action: "PHARMACY_FORMULARY_COMMITTEE_UPDATE",
      entity: "PharmFormularyCommittee",
      entityId: id,
      meta: { changes: dto },
    });

    return updated;
  }

  async addMembers(principal: Principal, committeeId: string, dto: UpsertCommitteeMembersDto) {
    const committee = await this.ctx.prisma.pharmFormularyCommittee.findUnique({
      where: { id: committeeId },
      select: { id: true, branchId: true },
    });
    if (!committee) throw new NotFoundException("Committee not found");

    this.ctx.resolveBranchId(principal, committee.branchId);

    // validate user ids
    const users = await this.ctx.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
      select: { id: true },
    });
    if (users.length !== dto.userIds.length) throw new BadRequestException("Some userIds are invalid");

    await this.ctx.prisma.pharmFormularyCommitteeMember.createMany({
      data: dto.userIds.map((userId) => ({
        committeeId,
        userId,
        role: (dto.role ?? "MEMBER") as any,
        isActive: true,
      })),
      skipDuplicates: true,
    });

    await this.ctx.audit.log({
      branchId: committee.branchId,
      actorUserId: principal.userId,
      action: "PHARMACY_FORMULARY_COMMITTEE_ADD_MEMBERS",
      entity: "PharmFormularyCommittee",
      entityId: committeeId,
      meta: { added: dto.userIds.length, role: dto.role ?? "MEMBER" },
    });

    return this.ctx.prisma.pharmFormularyCommittee.findUniqueOrThrow({
      where: { id: committeeId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { members: true } },
      },
    });
  }

  async getPolicy(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    return this.ctx.prisma.pharmFormularyPolicy.findUnique({
      where: { branchId: bid },
      include: {
        committee: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    });
  }

  async upsertPolicy(principal: Principal, dto: UpdateFormularyPolicyDto, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    if (dto.committeeId) {
      const committee = await this.ctx.prisma.pharmFormularyCommittee.findUnique({
        where: { id: dto.committeeId },
        select: { id: true, branchId: true, isActive: true },
      });
      if (!committee) throw new BadRequestException("committeeId not found");
      if (committee.branchId !== bid) throw new BadRequestException("committeeId must belong to the same branch");
      if (!committee.isActive) throw new BadRequestException("committeeId is inactive");
    }

    const baseConfig = {
      restrictedApproverRoles: dto.restrictedApproverRoles ?? [],
      nonFormularyApproverRoles: dto.nonFormularyApproverRoles ?? [],
      reserveAntibioticApproverRoles: dto.reserveAntibioticApproverRoles ?? [],
    };

    const config = dto.config ? { ...baseConfig, ...dto.config } : baseConfig;

    const saved = await this.ctx.prisma.pharmFormularyPolicy.upsert({
      where: { branchId: bid },
      create: { branchId: bid, committeeId: dto.committeeId ?? null, config },
      update: { committeeId: dto.committeeId ?? null, config },
      include: { committee: true },
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "PHARMACY_FORMULARY_POLICY_UPSERT",
      entity: "PharmFormularyPolicy",
      entityId: saved.id,
      meta: { committeeId: dto.committeeId ?? null },
    });

    return saved;
  }
}
