import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OperatorsService } from '../operators/operators.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly jwtService: JwtService,
    private readonly refreshTokensService: RefreshTokensService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const operator = await this.operatorsService.findByEmail(dto.email);

    if (!operator || !operator.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      operator.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
}
