import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { RefreshToken } from './refresh-token.entity';
import { Operator } from '../operators/operator.entity';

@Injectable()
export class RefreshTokensService {
  constructor(
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
  ) {}

  async createRefreshToken(
    operator: Operator,
    family?: string,
  ): Promise<{ rawToken: string; refreshToken: RefreshToken }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');

    const refreshToken = this.em.create(RefreshToken, {
      tokenHash,
      operator,
      family: family ?? randomUUID(),
      expiresAt: this.parseExpiry(expiresIn),
    });

    await this.em.persistAndFlush(refreshToken);

    return { rawToken, refreshToken };
  }

  async rotateRefreshToken(
    rawToken: string,
  ): Promise<{ rawToken: string; refreshToken: RefreshToken; operator: Operator }> {
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.em.findOne(
      RefreshToken,
      { tokenHash },
      { populate: ['operator'] },
    );

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: token already used = compromised
    if (existing.usedAt) {
      await this.em.nativeUpdate(
        RefreshToken,
        { family: existing.family, revokedAt: null },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.revokedAt || existing.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Mark as used
    existing.usedAt = new Date();

    // Create new token in same family
    const result = await this.createRefreshToken(existing.operator, existing.family);
    await this.em.flush();

    return { ...result, operator: existing.operator };
  }

  async revokeByOperator(operatorId: string): Promise<void> {
    await this.em.nativeUpdate(
      RefreshToken,
      { operator: operatorId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async revokeByRawToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const token = await this.em.findOne(RefreshToken, { tokenHash });
    if (token) {
      token.revokedAt = new Date();
      await this.em.flush();
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(value: string): Date {
    const match = value.match(/^(\d+)([dhms])$/);
    if (!match) return new Date(Date.now() + 7 * 86400000);

    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };

    return new Date(Date.now() + amount * multipliers[unit]);
  }
}
