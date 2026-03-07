import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { AuditLog } from './audit-log.entity';
import { AuditQueryDto } from './dto/audit-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class AuditService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    query: AuditQueryDto,
  ): Promise<PaginatedResponseDto<AuditLog>> {
    const where: FilterQuery<AuditLog> = {};

    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.performedById) where.performedById = query.performedById;

    const orderBy: Record<string, 'ASC' | 'DESC'> = {};
    if (query.sort) {
      const desc = query.sort.startsWith('-');
      const field = desc ? query.sort.slice(1) : query.sort;
      orderBy[field] = desc ? 'DESC' : 'ASC';
    } else {
      orderBy.createdAt = 'DESC';
    }

    const [items, total] = await this.em.findAndCount(AuditLog, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy,
    });

    return new PaginatedResponseDto(items, total, query.page!, query.limit!);
  }

  async findOne(id: string): Promise<AuditLog> {
    const log = await this.em.findOne(AuditLog, { id });
    if (!log) throw new NotFoundException(`Audit log ${id} not found`);
    return log;
  }
}
