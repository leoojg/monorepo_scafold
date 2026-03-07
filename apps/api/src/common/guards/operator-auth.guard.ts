import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OperatorAuthGuard extends AuthGuard('jwt') {}
