import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma, s3, bucket } from './providers.js';
import { id } from './id.js';
import type { NlogoxFile } from './files.js';

export class UserBuilder {
  id = id('user0000');
  name = 'Unnamed User';
  email = `${this.id}@example.com`;
  emailVerified = true;
  systemRole: 'user' | 'moderator' | 'admin' = 'user';
  userKind: 'researcher' | 'teacher' | 'student' | 'other' = 'researcher';
  isProfilePublic = false;

  async upsert() {
    await prisma.user.upsert({
      where: { id: this.id },
      update: {},
      create: {
        id: this.id,
        name: this.name,
        email: this.email,
        emailVerified: this.emailVerified,
        systemRole: this.systemRole,
        userKind: this.userKind,
        isProfilePublic: this.isProfilePublic,
      },
    });

    // Auto-create credential account
    await prisma.account.upsert({
      where: { id: id('account0') },
      update: {},
      create: {
        id: id('account0'),
        userId: this.id,
        accountId: this.id,
        providerId: this.id,
      },
    });

    return this;
  }
}

export class SessionBuilder {
  id = id('session0');
  user!: UserBuilder;
  token = `dev-session-token-${this.id}`;
  expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  ipAddress = '127.0.0.1';
  userAgent = 'Mozilla/5.0 (seed)';

  async upsert() {
    await prisma.session.upsert({
      where: { id: this.id },
      update: {},
      create: {
        id: this.id,
        userId: this.user.id,
        token: this.token,
        expiresAt: this.expiresAt,
        ipAddress: this.ipAddress,
        userAgent: this.userAgent,
      },
    });
    return this;
  }
}

export class TagBuilder {
  id = id('tag00000');
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async upsert() {
    await prisma.tag.upsert({
      where: { id: this.id },
      update: {},
      create: { id: this.id, name: this.name },
    });
    return this;
  }
}

export class FileUploader {
  key: string;
  body: Buffer;
  contentType: string;
  filename: string;

  constructor(key: string, body: Buffer, contentType: string, filename: string) {
    this.key = key;
    this.body = body;
    this.contentType = contentType;
    this.filename = filename;
  }

  async upload() {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: this.key,
        Body: this.body,
        ContentType: this.contentType,
        Metadata: {
          filename: this.filename,
          createdAt: new Date().toISOString(),
        },
      }),
    );
    return this;
  }

  /** Upload all nlogox files from a record of NlogoxFile values. */
  static async uploadNlogoxFiles(files: Record<string, NlogoxFile>) {
    for (const f of Object.values(files)) {
      await new FileUploader(f.key, f.blob, f.contentType, f.filename).upload();
    }
  }
}

export class ModelVersionBuilder {
  versionNumber!: number;
  title = '';
  description = '';
  netlogoFileKey = '';
  netlogoVersion = '7.0.0';
  infoTab?: string;
  createdAt?: Date;
  finalizedAt?: Date;
  previewImage?: Buffer;
  tags: TagBuilder[] = [];
  supplementaryFileKeys: string[] = [];

  // Set by ModelBuilder when adding the version
  _modelId!: string;

  async upsert() {
    const data: Record<string, any> = {
      modelId: this._modelId,
      versionNumber: this.versionNumber,
      title: this.title,
      description: this.description,
      netlogoFileKey: this.netlogoFileKey,
      netlogoVersion: this.netlogoVersion,
      infoTab: this.infoTab,
    };
    if (this.createdAt) data.createdAt = this.createdAt;
    if (this.finalizedAt) data.finalizedAt = this.finalizedAt;
    if (this.previewImage) data.previewImage = this.previewImage;

    await prisma.modelVersion.upsert({
      where: {
        modelId_versionNumber: {
          modelId: this._modelId,
          versionNumber: this.versionNumber,
        },
      },
      update: {},
      create: data,
    });

    // Tags
    for (const tag of this.tags) {
      await prisma.modelVersionTag.upsert({
        where: {
          modelId_versionNumber_tagId: {
            modelId: this._modelId,
            versionNumber: this.versionNumber,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          modelId: this._modelId,
          versionNumber: this.versionNumber,
          tagId: tag.id,
        },
      });
    }

    // Supplementary files
    for (const fileKey of this.supplementaryFileKeys) {
      await prisma.modelVersionFile.upsert({
        where: { id: id('mvfile000') },
        update: {},
        create: {
          id: id('mvfile000'),
          modelId: this._modelId,
          versionNumber: this.versionNumber,
          fileKey,
        },
      });
    }

    return this;
  }

  /** Convenience: populate from a NlogoxFile */
  fromNlogox(nlogox: NlogoxFile) {
    this.netlogoFileKey = nlogox.key;
    this.infoTab = nlogox.infoTab;
    this.previewImage = nlogox.previewImage.blob;
    return this;
  }
}

export class ModelBuilder {
  id = id('model000');
  visibility: 'public' | 'private' | 'unlisted' = 'public';
  isEndorsed = false;

  parent?: ModelBuilder;
  parentVersionNumber?: number;
  latestVersionNumber = 1;

  private _versions: ModelVersionBuilder[] = [];
  private _authors: { user: UserBuilder; role: 'owner' | 'contributor' }[] = [];
  private _permissions: { granteeUserId: string | null; permissionLevel: 'read' | 'write' }[] = [];
  private _additionalFiles: { taggedVersionNumber: number; fileKey: string }[] = [];

  addVersion(v: ModelVersionBuilder) {
    v._modelId = this.id;
    this._versions.push(v);
    this.latestVersionNumber = Math.max(this.latestVersionNumber, v.versionNumber);
    return this;
  }

  addAuthor(user: UserBuilder, role: 'owner' | 'contributor' = 'contributor') {
    this._authors.push({ user, role });
    return this;
  }

  addPermission(granteeUserId: string | null, level: 'read' | 'write' = 'read') {
    this._permissions.push({ granteeUserId, permissionLevel: level });
    return this;
  }

  addAdditionalFile(taggedVersionNumber: number, fileKey: string) {
    this._additionalFiles.push({ taggedVersionNumber, fileKey });
    return this;
  }

  async upsert() {
    // Model record
    await prisma.model.upsert({
      where: { id: this.id },
      update: {},
      create: {
        id: this.id,
        visibility: this.visibility,
        isEndorsed: this.isEndorsed,
        ...(this.parent && { parentModelId: this.parent.id }),
      },
    });

    // Versions
    for (const v of this._versions) {
      await v.upsert();
    }

    // Set latest version pointer + parent version
    await prisma.model.update({
      where: { id: this.id },
      data: {
        latestVersionNumber: this.latestVersionNumber,
        ...(this.parentVersionNumber != null && {
          parentVersionNumber: this.parentVersionNumber,
        }),
      },
    });

    // Authors
    for (const a of this._authors) {
      await prisma.modelAuthor.upsert({
        where: { modelId_userId: { modelId: this.id, userId: a.user.id } },
        update: {},
        create: { modelId: this.id, userId: a.user.id, role: a.role },
      });
    }

    // Permissions
    for (const p of this._permissions) {
      const permId = id('perm0000');
      await prisma.modelPermission.upsert({
        where: { id: permId },
        update: {},
        create: {
          id: permId,
          modelId: this.id,
          granteeUserId: p.granteeUserId,
          permissionLevel: p.permissionLevel,
        },
      });
    }

    // Additional files
    for (const af of this._additionalFiles) {
      await prisma.modelAdditionalFile.upsert({
        where: { id: id('addfile00') },
        update: {},
        create: {
          id: id('addfile00'),
          modelId: this.id,
          taggedVersionNumber: af.taggedVersionNumber,
          fileKey: af.fileKey,
        },
      });
    }

    return this;
  }
}

export class EventBuilder {
  id = id('event000');
  type = '';
  actor!: UserBuilder;
  resourceType = '';
  resourceId = '';
  payload: Record<string, any> = {};
  processedAt?: Date;

  async upsert() {
    await prisma.event.upsert({
      where: { id: this.id },
      update: {},
      create: {
        id: this.id,
        type: this.type,
        actorId: this.actor.id,
        resourceType: this.resourceType,
        resourceId: this.resourceId,
        payload: this.payload,
        ...(this.processedAt && { processedAt: this.processedAt }),
      },
    });
    return this;
  }
}
