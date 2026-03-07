import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { UserQueryDto } from './dto/user-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    tenantId: string,
    query: UserQueryDto,
  ): Promise<PaginatedResponseDto<User>> {
    const where: FilterQuery<User> = { tenant: tenantId };

    if (query.search) {
      where.$or = [
        { name: { $ilike: `%${query.search}%` } },
        { email: { $ilike: `%${query.search}%` } },
      ];
    }
    if (query.role) {
      where.role = query.role;
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

    const [items, total] = await this.em.findAndCount(User, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy,
      populate: ['userCompanies.company'],
    });

    return new PaginatedResponseDto(items, total, query.page!, query.limit!);
  }

  async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.em.findOne(
      User,
      { id, tenant: tenantId },
      { populate: ['userCompanies.company'] },
    );
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const tenant = this.em.getReference(Tenant, dto.tenantId);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const now = new Date();
    const user = this.em.create(User, {
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      tenant,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await this.em.persistAndFlush(user);
    return user;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findOne(tenantId, id);
    this.em.assign(user, dto);
    await this.em.flush();
    return user;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const user = await this.findOne(tenantId, id);
    await this.em.removeAndFlush(user);
  }
}
