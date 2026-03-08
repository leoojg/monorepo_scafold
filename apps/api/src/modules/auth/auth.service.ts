import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OperatorsService } from '../operators/operators.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ErrorCode } from '../../common/enums';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => OperatorsService))
    private readonly operatorsService: OperatorsService,
    private readonly jwtService: JwtService,
    private readonly refreshTokensService: RefreshTokensService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const operator = await this.operatorsService.findByEmail(dto.email);

    if (!operator || !operator.isActive) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
      });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      operator.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
      });
    }

    const payload = { sub: operator.id, email: operator.email };
    const accessToken = this.jwtService.sign(payload);

    const { rawToken } =
      await this.refreshTokensService.createRefreshToken(operator);

    return {
      accessToken,
      refreshToken: rawToken,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
      },
    };
  }

  async refresh(rawRefreshToken: string): Promise<AuthResponseDto> {
    const { rawToken, operator } =
      await this.refreshTokensService.rotateRefreshToken(rawRefreshToken);

    if (!operator.isActive) {
      await this.refreshTokensService.revokeByOperator(operator.id);
      throw new UnauthorizedException('Operator is inactive');
    }

    const payload = { sub: operator.id, email: operator.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      refreshToken: rawToken,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
      },
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokensService.revokeByRawToken(rawRefreshToken);
  }

  async logoutAll(operatorId: string): Promise<void> {
    await this.refreshTokensService.revokeByOperator(operatorId);
  }
}
