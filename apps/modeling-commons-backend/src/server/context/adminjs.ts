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
      {
        resource: db.table('User'),
        options: {
          navigation: defaultNavigation,
          titleProperty: 'email',
          listProperties: ['email', 'name', 'systemRole', 'userKind', 'emailVerified', 'banned', 'createdAt'],
          filterProperties: ['email', 'name', 'systemRole', 'userKind', 'emailVerified', 'banned', 'deletedAt', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
        },
      },
      {
        resource: db.table('Account'),
        options: {
          navigation: defaultNavigation,
          titleProperty: 'accountId',
          listProperties: ['providerId', 'accountId', 'userId', 'createdAt'],
          filterProperties: ['providerId', 'userId', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
          properties: {
            password: { isVisible: false },
            accessToken: { isVisible: false },
            refreshToken: { isVisible: false },
            idToken: { isVisible: false },
          },
        },
      },
      {
        resource: db.table('Session'),
        options: {
          navigation: defaultNavigation,
          titleProperty: 'id',
          listProperties: ['userId', 'ipAddress', 'userAgent', 'expiresAt', 'createdAt'],
          filterProperties: ['userId', 'ipAddress', 'expiresAt', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
          properties: {
            token: { isVisible: false },
          },
        },
      },
      {
        resource: db.table('Verification'),
        options: {
          navigation: defaultNavigation,
          titleProperty: 'identifier',
          listProperties: ['identifier', 'userId', 'expiresAt', 'createdAt'],
          filterProperties: ['identifier', 'userId', 'expiresAt', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
          properties: {
            value: { isVisible: false },
          },
        },
      },
      {
        resource: db.table('Passkey'),
        options: {
          navigation: defaultNavigation,
          titleProperty: 'name',
          listProperties: ['name', 'userId', 'deviceType', 'backedUp', 'createdAt'],
          filterProperties: ['userId', 'deviceType', 'backedUp', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
          properties: {
            publicKey: { isVisible: false },
            credentialID: { isVisible: { list: false, filter: false, show: true, edit: false } },
            counter: { isVisible: { list: false, filter: false, show: true, edit: false } },
          },
        },
      },
      {
        resource: db.table('Event'),
        options: {
          navigation: defaultNavigation,
          titleProperty: 'type',
          listProperties: ['type', 'actorId', 'resourceType', 'resourceId', 'processedAt', 'createdAt'],
          filterProperties: ['type', 'actorId', 'resourceType', 'resourceId', 'processedAt', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
        },
      },
      {
        resource: db.table('Tag'),
        options: {
          navigation: defaultNavigation,
          titleProperty: 'name',
          listProperties: ['name', 'displayName', 'createdAt'],
          filterProperties: ['name', 'displayName', 'createdAt'],
          sort: { sortBy: 'name', direction: 'asc' },
        },
      },
      {
        resource: db.table('Model'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'id',
          listProperties: ['id', 'visibility', 'isEndorsed', 'isLibraryModel', 'latestVersionNumber', 'createdAt', 'deletedAt'],
          filterProperties: ['visibility', 'isEndorsed', 'isLibraryModel', 'parentModelId', 'createdAt', 'deletedAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
        },
      },
      {
        resource: db.table('ModelAdditionalFile'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'fileKey',
          listProperties: ['modelId', 'taggedVersionNumber', 'fileKey', 'createdAt'],
          filterProperties: ['modelId', 'taggedVersionNumber', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
        },
      },
      {
        resource: db.table('ModelVersion'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'title',
          listProperties: ['modelId', 'versionNumber', 'title', 'netlogoVersion', 'finalizedAt', 'createdAt'],
          filterProperties: ['modelId', 'versionNumber', 'title', 'netlogoVersion', 'finalizedAt', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
          properties: {
            previewImage: { isVisible: false },
            infoTab: { isVisible: { list: false, filter: false, show: true, edit: true } },
            description: { isVisible: { list: false, filter: false, show: true, edit: true } },
          },
        },
      },
      {
        resource: db.table('ModelVersionTag'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'tagId',
          listProperties: ['modelId', 'versionNumber', 'tagId', 'createdAt'],
          filterProperties: ['modelId', 'versionNumber', 'tagId', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
        },
      },
      {
        resource: db.table('ModelVersionFile'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'fileKey',
          listProperties: ['modelId', 'versionNumber', 'fileKey'],
          filterProperties: ['modelId', 'versionNumber', 'fileKey'],
        },
      },
      {
        resource: db.table('ModelPermission'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'id',
          listProperties: ['modelId', 'granteeUserId', 'permissionLevel', 'createdAt'],
          filterProperties: ['modelId', 'granteeUserId', 'permissionLevel', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
        },
      },
      {
        resource: db.table('ModelAuthor'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'userId',
          listProperties: ['modelId', 'userId', 'role', 'createdAt'],
          filterProperties: ['modelId', 'userId', 'role', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
        },
      },
      {
        resource: db.table('ModelDraft'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'id',
          listProperties: ['userId', 'modelId', 'schemaVersion', 'updatedAt', 'createdAt'],
          filterProperties: ['userId', 'modelId', 'schemaVersion', 'createdAt'],
          sort: { sortBy: 'updatedAt', direction: 'desc' },
          properties: {
            data: { isVisible: { list: false, filter: false, show: true, edit: true } },
          },
        },
      },
      {
        resource: db.table('ModelLike'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'modelId',
          listProperties: ['modelId', 'userId', 'createdAt'],
          filterProperties: ['modelId', 'userId', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
        },
      },
      {
        resource: db.table('ModelInteraction'),
        options: {
          navigation: modelNavigation,
          titleProperty: 'id',
          listProperties: ['modelId', 'versionNumber', 'kind', 'userId', 'createdAt'],
          filterProperties: ['modelId', 'versionNumber', 'kind', 'userId', 'sessionId', 'createdAt'],
          sort: { sortBy: 'createdAt', direction: 'desc' },
          properties: {
            ipHash: { isVisible: false },
            cookie: { isVisible: false },
            userAgent: { isVisible: { list: false, filter: false, show: true, edit: false } },
            referer: { isVisible: { list: false, filter: false, show: true, edit: false } },
            geo: { isVisible: { list: false, filter: false, show: true, edit: false } },
          },
        },
      },
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
