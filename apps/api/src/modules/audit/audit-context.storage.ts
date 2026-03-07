import { AsyncLocalStorage } from 'async_hooks';
import { RequestContext } from '../../common/interfaces/request-context.interface';

export const auditContextStorage = new AsyncLocalStorage<RequestContext>();
