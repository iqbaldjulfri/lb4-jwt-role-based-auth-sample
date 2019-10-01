import {
  MethodDecoratorFactory,
  inject,
  CoreBindings,
  Constructor,
  MetadataInspector,
  Provider,
  ValueOrPromise,
  Getter,
  Setter,
  BindingKey,
} from '@loopback/core';
import {
  AUTHENTICATION_METADATA_KEY,
  AuthenticationMetadata,
  AuthenticationBindings,
  AuthenticateFn,
  AuthenticationStrategy,
} from '@loopback/authentication';
import {UserProfile, securityId} from '@loopback/security';
import {StrategyAdapter} from '@loopback/authentication-passport';
import {AuthMetadataProvider} from '@loopback/authentication/dist/providers/auth-metadata.provider';
import {UserRepository, UserRoleRepository} from './repositories';
import {repository} from '@loopback/repository';
import {Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import {HttpErrors, Request} from '@loopback/rest';

export const JWT_STRATEGY_NAME = 'jwt';

// the decorator function, every required param has its own default
// so we can supply empty param when calling this decorartor.
// we will use 'secured' to match Spring Security annotation.
export function secured(
  type: SecuredType = SecuredType.IS_AUTHENTICATED, // more on this below
  roles: string[] = [],
  strategy: string = 'jwt',
  options?: object,
) {
  // we will use a custom interface. more on this below
  return MethodDecoratorFactory.createDecorator<MyAuthenticationMetadata>(AUTHENTICATION_METADATA_KEY, {
    type,
    roles,
    strategy,
    options,
  });
}

// enum for available secured type,
export enum SecuredType {
  IS_AUTHENTICATED, // any authenticated user
  PERMIT_ALL, // bypass security check, permit everyone
  HAS_ANY_ROLE, // user must have one or more roles specified in the `roles` attribute
  HAS_ROLES, // user mast have all roles specified in the `roles` attribute
  DENY_ALL, // you shall not pass!
}

// extended interface of the default AuthenticationMetadata which only has `strategy` and `options`
export interface MyAuthenticationMetadata extends AuthenticationMetadata {
  type: SecuredType;
  roles: string[];
}

// metadata provider for `MyAuthenticationMetadata`. Will supply method's metadata when injected
export class MyAuthMetadataProvider extends AuthMetadataProvider {
  constructor(
    @inject(CoreBindings.CONTROLLER_CLASS, {optional: true}) protected _controllerClass: Constructor<{}>,
    @inject(CoreBindings.CONTROLLER_METHOD_NAME, {optional: true}) protected _methodName: string,
  ) {
    super(_controllerClass, _methodName);
  }

  value(): MyAuthenticationMetadata | undefined {
    if (!this._controllerClass || !this._methodName) return;
    return MetadataInspector.getMethodMetadata<MyAuthenticationMetadata>(
      AUTHENTICATION_METADATA_KEY,
      this._controllerClass.prototype,
      this._methodName,
    );
  }
}

// the JWT_secret to encrypt and decrypt JWT token
export const JWT_SECRET = 'changeme';

// the required interface to filter login payload
export interface Credentials {
  username: string;
  password: string;
}

// implement custom namespace bindings
export namespace MyAuthBindings {
  export const STRATEGY = BindingKey.create<AuthenticationStrategy | undefined>('authentication.strategy');
}

// the strategy provider will parse the specifed strategy, and act accordingly
export class MyAuthAuthenticationStrategyProvider implements Provider<AuthenticationStrategy | undefined> {
  constructor(
    @inject(AuthenticationBindings.METADATA) private metadata: MyAuthenticationMetadata,
    @repository(UserRepository) private userRepository: UserRepository,
    @repository(UserRoleRepository) private userRoleRepository: UserRoleRepository,
  ) {}

  value(): ValueOrPromise<AuthenticationStrategy | undefined> {
    if (!this.metadata) return;

    const {strategy} = this.metadata;
    if (strategy === JWT_STRATEGY_NAME) {
      const jwtStrategy = new JwtStrategy(
        {
          secretOrKey: JWT_SECRET,
          jwtFromRequest: ExtractJwt.fromExtractors([
            ExtractJwt.fromAuthHeaderAsBearerToken(),
            ExtractJwt.fromUrlQueryParameter('access_token'),
          ]),
        },
        (payload, done) => this.verifyToken(payload, done),
      );

      // we will use Loopback's  StrategyAdapter so we can leverage passport's strategy
      // and also we don't have to implement a new strategy adapter.
      return new StrategyAdapter(jwtStrategy, JWT_STRATEGY_NAME);
    }
  }

  // verify JWT token and decryot the payload.
  // Then search user from database with id equals to payload's username.
  // if user is found, then verify its roles
  async verifyToken(
    payload: Credentials,
    done: (err: Error | null, user?: UserProfile | false, info?: Object) => void,
  ) {
    try {
      const {username} = payload;
      const user = await this.userRepository.findById(username);
      if (!user) done(null, false);

      await this.verifyRoles(username);

      done(null, {name: username, email: user.email, [securityId]: username});
    } catch (err) {
      if (err.name === 'UnauthorizedError') done(null, false);
      done(err, false);
    }
  }

  // verify user's role based on the SecuredType
  async verifyRoles(username: string) {
    const {type, roles} = this.metadata;

    if ([SecuredType.IS_AUTHENTICATED, SecuredType.PERMIT_ALL].includes(type)) return;

    if (type === SecuredType.HAS_ANY_ROLE) {
      if (!roles.length) return;
      const {count} = await this.userRoleRepository.count({
        userId: username,
        roleId: {inq: roles},
      });

      if (count) return;
    } else if (type === SecuredType.HAS_ROLES && roles.length) {
      const userRoles = await this.userRoleRepository.find({where: {userId: username}});
      const roleIds = userRoles.map(ur => ur.roleId);
      let valid = true;
      for (const role of roles)
        if (!roleIds.includes(role)) {
          valid = false;
          break;
        }

      if (valid) return;
    }

    throw new HttpErrors.Unauthorized('Invalid authorization');
  }
}

// the entry point for authentication.
export class MyAuthActionProvider implements Provider<AuthenticateFn> {
  constructor(
    @inject.getter(MyAuthBindings.STRATEGY) readonly getStrategy: Getter<AuthenticationStrategy>,
    @inject.setter(AuthenticationBindings.CURRENT_USER) readonly setCurrentUser: Setter<UserProfile>,
    @inject.getter(AuthenticationBindings.METADATA) readonly getMetadata: Getter<MyAuthenticationMetadata>,
  ) {}

  value(): AuthenticateFn {
    return request => this.action(request);
  }

  async action(request: Request): Promise<UserProfile | undefined> {
    const metadata = await this.getMetadata();
    if (metadata && metadata.type === SecuredType.PERMIT_ALL) return;

    const strategy = await this.getStrategy();
    if (!strategy) return;

    const user = await strategy.authenticate(request);
    if (!user) return;

    this.setCurrentUser(user);
    return user;
  }
}
