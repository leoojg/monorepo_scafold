import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContextStorage } from '../../modules/audit/audit-context.storage';
import { RequestContext } from '../interfaces/request-context.interface';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const operator = request.user;

    const ctx: RequestContext = {
      performedById: operator?.id,
      performedByType: operator ? 'operator' : 'system',
      metadata: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        route: `${request.method} ${request.path}`,
      },
    };

    return new Observable((subscriber) => {
      auditContextStorage.run(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
