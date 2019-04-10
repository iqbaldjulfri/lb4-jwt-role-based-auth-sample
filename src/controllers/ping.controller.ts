import {Request, RestBindings, get, ResponseObject} from '@loopback/rest';
import {inject} from '@loopback/context';
import {secured, SecuredType} from '../auth';

/**
 * OpenAPI response for ping()
 */
const PING_RESPONSE: ResponseObject = {
  description: 'Ping Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          greeting: {type: 'string'},
          date: {type: 'string'},
          url: {type: 'string'},
          headers: {
            type: 'object',
            properties: {
              'Content-Type': {type: 'string'},
            },
            additionalProperties: true,
          },
        },
      },
    },
  },
};

/**
 * A simple controller to bounce back http requests
 */
export class PingController {
  constructor(@inject(RestBindings.Http.REQUEST) private req: Request) {}

  // Map to `GET /ping`
  @get('/ping', {
    responses: {
      '200': PING_RESPONSE,
    },
  })
  ping(): object {
    // Reply with a greeting, the current time, the url, and request headers
    return {
      greeting: 'Hello from LoopBack',
      date: new Date(),
      url: this.req.url,
      headers: Object.assign({}, this.req.headers),
    };
  }

  // test endpoints here

  @get('/ping/is-authenticated')
  @secured(SecuredType.IS_AUTHENTICATED)
  testIsAuthenticated() {
    return {message: 'isAuthenticated: OK'};
  }

  @get('/ping/permit-all')
  @secured(SecuredType.PERMIT_ALL)
  testPermitAll() {
    return {message: 'permitAll: OK'};
  }

  @get('/ping/deny-all')
  @secured(SecuredType.DENY_ALL)
  testDenyAll() {
    return {message: 'denyAll: OK'};
  }

  @get('/ping/has-any-role')
  @secured(SecuredType.HAS_ANY_ROLE, ['ADMIN', 'ADMIN2'])
  testHasAnyRole() {
    return {message: 'hasAnyRole: OK'};
  }

  @get('/ping/has-roles')
  @secured(SecuredType.HAS_ROLES, ['ADMIN', 'ADMIN2'])
  testHasRoles() {
    return {message: 'hasRoles: OK'};
  }
}
