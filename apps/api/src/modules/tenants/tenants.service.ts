import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Tenant } from './tenant.entity';
import { TenantQueryDto } from './dto/tenant-query.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { TenantStatus } from '../../common/enums';

@Injectable()
export class TenantsService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    query: TenantQueryDto,
  ): Promise<PaginatedResponseDto<Tenant>> {
    const where: FilterQuery<Tenant> = {};

    if (query.search) {
      where.name = { $ilike: `%${query.search}%` };
    }
    if (query.status) {
      where.status = query.status;
    }

    const orderBy: Record<string, 'ASC' | 'DESC'> = {};
    if (query.sort) {
      const desc = query.sort.startsWith('-');
      const field = desc ? query.sort.slice(1) : query.sort;
      orderBy[field] = desc ? 'DESC' : 'ASC';
    } else {
      orderBy.createdAt = 'DESC';
    }

    const [items, total] = await this.em.findAndCount(Tenant, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy,
    });

    return new PaginatedResponseDto(items, total, query.page!, query.limit!);
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.em.findOne(Tenant, { id });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const tenant = this.em.create(Tenant, {
      ...dto,
      status: TenantStatus.ACTIVE,
    });
    await this.em.persistAndFlush(tenant);
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    this.em.assign(tenant, dto);
    await this.em.flush();
    return tenant;
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.em.removeAndFlush(tenant);
  }
}
