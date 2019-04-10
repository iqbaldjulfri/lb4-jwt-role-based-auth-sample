import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RestExplorerBindings, RestExplorerComponent} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import * as path from 'path';
import {MySequence} from './sequence';
import {AuthenticationComponent, AuthenticationBindings} from '@loopback/authentication';
import {MyAuthMetadataProvider, MyAuthStrategyProvider, MyAuthActionProvider} from './auth';
import {UserRepository, RoleRepository, UserRoleRepository} from './repositories';

export class Lb4JwtRoleBasedAuthSampleApplication extends BootMixin(ServiceMixin(RepositoryMixin(RestApplication))) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.bind(RestExplorerBindings.CONFIG).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.component(AuthenticationComponent);
    this.bind(AuthenticationBindings.METADATA).toProvider(MyAuthMetadataProvider);
    this.bind(AuthenticationBindings.STRATEGY).toProvider(MyAuthStrategyProvider);
    this.bind(AuthenticationBindings.AUTH_ACTION).toProvider(MyAuthActionProvider);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  async seedData() {
    const userRepository: UserRepository = await this.getRepository(UserRepository);
    const roleRepository: RoleRepository = await this.getRepository(RoleRepository);
    const userRoleRepository: UserRoleRepository = await this.getRepository(UserRoleRepository);

    await userRepository.create({id: 'admin', password: 'hash-this', email: 'admin@test.test'});
    await userRepository.create({id: 'admin2', password: 'hash-this', email: 'admin2@test.test'});
    await userRepository.create({id: 'user', password: 'hash-this', email: 'user@test.test'});
    await roleRepository.create({id: 'ADMIN', description: 'admin'});
    await roleRepository.create({id: 'ADMIN2', description: 'admin2'});
    await userRoleRepository.create({userId: 'admin', roleId: 'ADMIN'});
    await userRoleRepository.create({userId: 'admin2', roleId: 'ADMIN'});
    await userRoleRepository.create({userId: 'admin2', roleId: 'ADMIN2'});
  }
}
