import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditChangeDiffDto {
  @ApiProperty()
  field!: string;

  @ApiPropertyOptional()
  from?: unknown;

  @ApiPropertyOptional()
  to?: unknown;
}

export class AuditChangesDto {
  @ApiPropertyOptional()
  before?: Record<string, unknown>;

  @ApiPropertyOptional()
  after?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [AuditChangeDiffDto] })
  diff?: AuditChangeDiffDto[];
}

export class AuditMetadataDto {
  @ApiPropertyOptional()
  ip?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  route?: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty({ enum: ['create', 'update', 'delete'] })
  action!: string;

  @ApiPropertyOptional({ type: AuditChangesDto })
  changes?: AuditChangesDto;

  @ApiPropertyOptional()
  performedById?: string;

  @ApiProperty()
  performedByType!: string;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiPropertyOptional({ type: AuditMetadataDto })
  metadata?: AuditMetadataDto;

  @ApiProperty()
  createdAt!: Date;
}
