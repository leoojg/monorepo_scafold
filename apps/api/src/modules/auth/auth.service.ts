import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OperatorsService } from '../operators/operators.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ErrorCode } from '../../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly jwtService: JwtService,
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

    return {
      accessToken,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
      },
    };
  }
}
