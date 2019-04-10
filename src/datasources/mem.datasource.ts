import {inject} from '@loopback/core';
import {juggler} from '@loopback/repository';
import * as config from './mem.datasource.json';

export class MemDataSource extends juggler.DataSource {
  static dataSourceName = 'mem';

  constructor(
    @inject('datasources.config.mem', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
