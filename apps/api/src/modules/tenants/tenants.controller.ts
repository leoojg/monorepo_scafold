import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantQueryDto } from './dto/tenant-query.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import { OperatorAuthGuard } from '../../common/guards/operator-auth.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(OperatorAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List tenants (paginated)' })
  @ApiPaginatedResponse(TenantResponseDto)
  async findAll(
    @Query() query: TenantQueryDto,
  ): Promise<PaginatedResponseDto<TenantResponseDto>> {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant' })
  async create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove tenant' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }
}
