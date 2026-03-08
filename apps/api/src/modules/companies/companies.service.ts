import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/enums';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Company } from './company.entity';
import { Tenant } from '../tenants/tenant.entity';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    tenantId: string,
    query: CompanyQueryDto,
  ): Promise<PaginatedResponseDto<Company>> {
    const where: FilterQuery<Company> = { tenant: tenantId };

    if (query.search) {
      where.name = { $ilike: `%${query.search}%` };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const orderBy: Record<string, 'ASC' | 'DESC'> = {};
    if (query.sort) {
      const desc = query.sort.startsWith('-');
      const field = desc ? query.sort.slice(1) : query.sort;
      orderBy[field] = desc ? 'DESC' : 'ASC';
    } else {
      orderBy.createdAt = 'DESC';
    }

    const [items, total] = await this.em.findAndCount(Company, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy,
    });

    return new PaginatedResponseDto(items, total, query.page!, query.limit!);
  }

  async findOne(tenantId: string, id: string): Promise<Company> {
    const company = await this.em.findOne(Company, { id, tenant: tenantId });
    if (!company) {
      throw new NotFoundException({
        message: `Company ${id} not found`,
        errorCode: ErrorCode.COMPANY_NOT_FOUND,
      });
    }
    return company;
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const tenant = this.em.getReference('Tenant', dto.tenantId) as Tenant;
    const now = new Date();
    const company = this.em.create(Company, {
      name: dto.name,
      document: dto.document,
      settings: dto.settings,
      billingInfo: dto.billingInfo,
      tenant,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.persistAndFlush(company);
    return company;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findOne(tenantId, id);
    this.em.assign(company, dto);
    await this.em.flush();
    return company;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const company = await this.findOne(tenantId, id);
    await this.em.removeAndFlush(company);
  }
}
