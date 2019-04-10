import {DefaultCrudRepository} from '@loopback/repository';
import {Role} from '../models';
import {MemDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class RoleRepository extends DefaultCrudRepository<
  Role,
  typeof Role.prototype.id
> {
  constructor(
    @inject('datasources.mem') dataSource: MemDataSource,
  ) {
    super(Role, dataSource);
  }
}
