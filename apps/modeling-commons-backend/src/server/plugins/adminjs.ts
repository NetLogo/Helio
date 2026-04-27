import env from '#src/config/env.ts';
import AdminJSFastify from '@adminjs/fastify';
import { Adapter, Database, Resource } from '@adminjs/sql';
import fastifyMultipart from '@fastify/multipart';
import AdminJS from 'adminjs';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

AdminJS.registerAdapter({ Database, Resource });

async function adminJsPlugin(fastify: FastifyInstance) {
  const db = await new Adapter('postgresql', {
    connectionString: env.db.url,
    database: env.db.database,
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
      { resource: db.table('Event'), options: { navigation: defaultNavigation } },
      { resource: db.table('Model'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelAdditionalFile'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelVersion'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelVersionTag'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelVersionFile'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelPermission'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelAuthor'), options: { navigation: modelNavigation } },
      { resource: db.table('ModelDraft'), options: { navigation: modelNavigation } },
    ],
    branding: {
      companyName: `${env.product.name} Admin`,
      logo: false,
    },
  });

  // To my great disappointment, AdminJS tries to register FastifyMultipart
  // internally, creating a conflict with our own configuration of
  // FastifyMultipart. We can work around this by passing a proxy that
  // ignores the register call.
  // I am willing to accept the trade-off that this might break in the future
  // if AdminJS changes how it uses FastifyMultipart, but the alternative is to
  // stop using AdminJS, which means we lose the features anyways.
  // -- Omar Ibrahim, Apr 22 26
  const server = new Proxy(fastify, {
    get(target, prop) {
      if (prop === 'register') {
        return new Proxy(target.register, {
          apply(registerTarget, thisArg, args) {
            if (args[0] === fastifyMultipart) {
              // Ignore attempts to register FastifyMultipart from AdminJS
              return;
            }
            return Reflect.apply(registerTarget, thisArg, args);
          },
        });
      }
      return Reflect.get(target, prop);
    },
  });

  await AdminJSFastify.buildRouter(admin, server);
}

export default fp(adminJsPlugin, {
  name: 'adminJs',
});
