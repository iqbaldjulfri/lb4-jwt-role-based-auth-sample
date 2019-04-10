import {Lb4JwtRoleBasedAuthSampleApplication} from './application';
import {ApplicationConfig} from '@loopback/core';

export {Lb4JwtRoleBasedAuthSampleApplication};

export async function main(options: ApplicationConfig = {}) {
  const app = new Lb4JwtRoleBasedAuthSampleApplication(options);
  await app.boot();
  await app.migrateSchema();
  await app.seedData();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);

  return app;
}
