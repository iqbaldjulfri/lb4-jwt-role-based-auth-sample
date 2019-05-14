import {DefaultCrudRepository} from '@loopback/repository';
import {User} from '../models';
import {MemDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class UserRepository extends DefaultCrudRepository<User, typeof User.prototype.id> {
  constructor(@inject('datasources.mem') dataSource: MemDataSource) {
    super(User, dataSource);
  }
}
