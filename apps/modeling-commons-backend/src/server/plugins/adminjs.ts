import AdminJSFastify from '@adminjs/fastify';
import AdminJS from 'adminjs';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Adapter, Resource, Database } from '@adminjs/sql';
import env from '#src/config/env.ts';

AdminJS.registerAdapter({ Database, Resource });
async function adminJsPlugin(fastify: FastifyInstance) {
  const db = await new Adapter('postgresql', {
    connectionString: env.db.url,
    database: 'test',
  }).init();

  const modelNavigation = {
    name: 'Models',
    icon: 'Code',
  };

  const defaultNavigation = {
    name: 'Entities',
    icon: 'User',
  };

  const admin = new AdminJS({
    rootPath: '/admin',
    resources: [
      { resource: db.table('User'), options: { navigation: defaultNavigation } },
      { resource: db.table('Account'), options: { navigation: defaultNavigation } },
      { resource: db.table('Session'), options: { navigation: defaultNavigation } },
      { resource: db.table('Verification'), options: { navigation: defaultNavigation } },
      { resource: db.table('File'), options: { navigation: defaultNavigation } },
      { resource: db.table('Event'), options: { navigation: defaultNavigation } },
      { resource: db.table('Model'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelAdditionalFile'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelVersion'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelVersionTag'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelVersionFile'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelPermission'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelAuthor'), options: { navigation: modelNavigation } },
    ],
    branding: {
      companyName: `${env.product.name} Admin`,
      logo: false,
    },
  });

  await AdminJSFastify.buildRouter(admin, fastify);
}

export default fp(adminJsPlugin, {
  name: 'adminJs',
});
