import {DefaultCrudRepository} from '@loopback/repository';
import {UserRole} from '../models';
import {MemDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class UserRoleRepository extends DefaultCrudRepository<
  UserRole,
  typeof UserRole.prototype.id
> {
  constructor(
    @inject('datasources.mem') dataSource: MemDataSource,
  ) {
    super(UserRole, dataSource);
  }
}
