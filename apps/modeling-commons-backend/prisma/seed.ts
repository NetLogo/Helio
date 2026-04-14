import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import fs from 'node:fs';
import path from 'node:path';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });
const seedFilesPath = path.join(import.meta.dirname, 'seed-files');

const getNonRandomUUID = (() => {
  const counter: Record<string, number> = {};

  return (prefix: string, from: number = 0) => {
    if (!counter[prefix]) {
      counter[prefix] = from;
    }
    if (prefix.length != 8) {
      throw new Error(`Prefix must be 8 characters long: ${prefix}`);
    }
    const id = `${prefix}-0000-4000-a000-${counter[prefix].toString().padStart(12, '0')}`;
    counter[prefix]++;
    return id;
  };
})();

const ids = {
  // Users
  alice: '10000000-0000-4000-a000-000000000001',
  bob: '10000000-0000-4000-a000-000000000002',
  carol: '10000000-0000-4000-a000-000000000003',
  dave: '10000000-0000-4000-a000-000000000004',
  admin: '10000000-0000-4000-a000-000000000099',

  // Models
  wolfSheep: '20000000-0000-4000-a000-000000000001',
  fireSpread: '20000000-0000-4000-a000-000000000002',
  antForaging: '20000000-0000-4000-a000-000000000003',
  virusNetwork: '20000000-0000-4000-a000-000000000004',
  wolfSheepFork: '20000000-0000-4000-a000-000000000005',
  trafficBasic: '20000000-0000-4000-a000-000000000006',
  traffic2Lanes: '20000000-0000-4000-a000-000000000007',

  // Files
  fireSpreadNlogox: '40000000-0000-4000-a000-000000000003',
  antForagingNlogox: '40000000-0000-4000-a000-000000000004',
  virusNetworkNlogox: '40000000-0000-4000-a000-000000000005',
  wolfSheepForkNlogox: '40000000-0000-4000-a000-000000000006',
  wolfSheepReadme: '40000000-0000-4000-a000-000000000010',
  wolfSheepData: '40000000-0000-4000-a000-000000000011',
  fireSpreadCsv: '40000000-0000-4000-a000-000000000012',

  // Tags
  tagEcology: '50000000-0000-4000-a000-000000000001',
  tagPredatorPrey: '50000000-0000-4000-a000-000000000002',
  tagFire: '50000000-0000-4000-a000-000000000003',
  tagEmergence: '50000000-0000-4000-a000-000000000004',
  tagBiology: '50000000-0000-4000-a000-000000000005',
  tagNetwork: '50000000-0000-4000-a000-000000000006',
  tagEpidemiology: '50000000-0000-4000-a000-000000000007',
  tagSwarmIntelligence: '50000000-0000-4000-a000-000000000008',

  // Permissions
  permBobReadWolfSheep: '60000000-0000-4000-a000-000000000001',
  permCarolWriteFireSpread: '60000000-0000-4000-a000-000000000002',
  permPublicReadAntForaging: '60000000-0000-4000-a000-000000000003',

  // Events
  event1: '70000000-0000-4000-a000-000000000001',
  event2: '70000000-0000-4000-a000-000000000002',
  event3: '70000000-0000-4000-a000-000000000003',
  event4: '70000000-0000-4000-a000-000000000004',
  event5: '70000000-0000-4000-a000-000000000005',

  // Accounts (Better Auth credential accounts)
  accountAlice: '80000000-0000-4000-a000-000000000001',
  accountBob: '80000000-0000-4000-a000-000000000002',
  accountCarol: '80000000-0000-4000-a000-000000000003',
  accountDave: '80000000-0000-4000-a000-000000000004',
  accountAdmin: '80000000-0000-4000-a000-000000000099',

  // Sessions
  sessionAlice: '90000000-0000-4000-a000-000000000001',
  sessionBob: '90000000-0000-4000-a000-000000000002',

  // Additional files
  additionalFile1: 'a0000000-0000-4000-a000-000000000001',
  additionalFile2: 'a0000000-0000-4000-a000-000000000002',

  // Model version files
  mvFile1: 'b0000000-0000-4000-a000-000000000001',
  mvFile2: 'b0000000-0000-4000-a000-000000000002',
} as const;

// Helpers

function fakeNlogox(title: string): Buffer {
  // Minimal placeholder representing an nlogox XML file
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>\n<model><title>${title}</title></model>`,
    'utf-8',
  );
}

function fakeCsv(): Buffer {
  return Buffer.from('tick,wolves,sheep\n0,50,100\n1,48,105\n2,45,112\n', 'utf-8');
}

function fakeReadme(): Buffer {
  return Buffer.from('# Wolf Sheep Predation\n\nA classic predator-prey model.', 'utf-8');
}

function readInfoTab(xmlString: string): string | undefined {
  return `
  # Info Tab Content
  This is a placeholder for the info tab content extracted from the nlogox file.
  In a real implementation, you would parse the XML and extract the relevant section.
  `;
}

function readNlogox(
  filename: string,
  previewImgName: string,
): {
  id: string;
  filename: string;
  blob: Buffer;
  contentType: string;
  previewImage: {
    blob: Buffer;
    contentType: string;
  };
  sizeBytes: bigint;
  infoTab: string | undefined;
} {
  const filepath = path.join(seedFilesPath, filename);
  const stats = fs.statSync(filepath);
  const content = fs.readFileSync(filepath, 'utf-8');
  const infoTab = readInfoTab(content);

  const previewImagePath = path.join(seedFilesPath, previewImgName);
  const imageBlob = fs.readFileSync(previewImagePath);
  const previewImageExt = path.extname(previewImgName).toLowerCase();
  const mimes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
  };
  const previewImageContentType = mimes[previewImageExt] || 'application/octet-stream';

  return {
    id: getNonRandomUUID('40000000', 12),
    filename,
    blob: Buffer.from(content, 'utf-8'),
    contentType: 'application/xml',
    previewImage: {
      blob: imageBlob,
      contentType: previewImageContentType,
    },
    sizeBytes: BigInt(stats.size),
    infoTab,
  };
}

const seedNlogoxFiles = {
  wolfSheepNlogox1: readNlogox('wolf-sheep-predation.nlogox', 'wolf-sheep-preview.png'),
  wolfSheepNlogox2: readNlogox('wolf-sheep-predation-v2.nlogox', 'wolf-sheep-preview.png'),
  wolfSheepNlogoxFork: readNlogox('wolf-sheep-predation-fork.nlogox', 'wolf-sheep-preview.png'),
  trafficGridNlogox: readNlogox('traffic-grid.nlogox', 'traffic-grid-preview.png'),
  trafficBasicNlogox: readNlogox('traffic-basic.nlogox', 'traffic-grid-preview.png'),
  traffic2LanesNlogox: readNlogox('traffic-2-lanes.nlogox', 'traffic-2-lanes-preview.png'),
};

// Seed
async function main() {
  console.log('Seeding database...');

  // 1. Users
  const users = [
    {
      id: ids.alice,
      name: 'Alice Bob',
      email: 'alice@example.com',
      emailVerified: true,
      systemRole: 'user' as const,
      userKind: 'researcher' as const,
      isProfilePublic: true,
    },
    {
      id: ids.bob,
      name: 'Bob Rand',
      email: 'bob@example.com',
      emailVerified: true,
      systemRole: 'user' as const,
      userKind: 'teacher' as const,
      isProfilePublic: true,
    },
    {
      id: ids.carol,
      name: 'Carol Tisue',
      email: 'carol@example.com',
      emailVerified: true,
      systemRole: 'moderator' as const,
      userKind: 'researcher' as const,
      isProfilePublic: false,
    },
    {
      id: ids.dave,
      name: 'Dave Student',
      email: 'dave@example.com',
      emailVerified: false,
      systemRole: 'user' as const,
      userKind: 'student' as const,
      isProfilePublic: false,
    },
    {
      id: ids.admin,
      name: 'Admin',
      email: 'admin@example.com',
      emailVerified: true,
      systemRole: 'admin' as const,
      userKind: 'other' as const,
      isProfilePublic: false,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: u,
    });
  }
  console.log(`  ✓ ${users.length} users`);

  // 2. Accounts (Better Auth credential type)
  const accounts = [
    { id: ids.accountAlice, userId: ids.alice, accountId: ids.alice, providerId: ids.alice },
    { id: ids.accountBob, userId: ids.bob, accountId: ids.bob, providerId: ids.bob },
    { id: ids.accountCarol, userId: ids.carol, accountId: ids.carol, providerId: ids.carol },
    { id: ids.accountDave, userId: ids.dave, accountId: ids.dave, providerId: ids.dave },
    { id: ids.accountAdmin, userId: ids.admin, accountId: ids.admin, providerId: ids.admin },
  ];

  for (const a of accounts) {
    await prisma.account.upsert({
      where: { id: a.id },
      update: {},
      create: a,
    });
  }
  console.log(`  ✓ ${accounts.length} accounts`);

  // 3. Sessions (active dev sessions for Alice & Bob)
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sessions = [
    {
      id: ids.sessionAlice,
      userId: ids.alice,
      token: 'dev-session-token-alice-000001',
      expiresAt: thirtyDaysFromNow,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (seed)',
    },
    {
      id: ids.sessionBob,
      userId: ids.bob,
      token: 'dev-session-token-bob-000002',
      expiresAt: thirtyDaysFromNow,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (seed)',
    },
  ];

  for (const s of sessions) {
    await prisma.session.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log(`  ✓ ${sessions.length} sessions`);

  // 4. Tags
  const tags = [
    { id: ids.tagEcology, name: 'ecology' },
    { id: ids.tagPredatorPrey, name: 'predator-prey' },
    { id: ids.tagFire, name: 'fire' },
    { id: ids.tagEmergence, name: 'emergence' },
    { id: ids.tagBiology, name: 'biology' },
    { id: ids.tagNetwork, name: 'network' },
    { id: ids.tagEpidemiology, name: 'epidemiology' },
    { id: ids.tagSwarmIntelligence, name: 'swarm-intelligence' },
  ];

  for (const t of tags) {
    await prisma.tag.upsert({
      where: { id: t.id },
      update: {},
      create: t,
    });
  }
  console.log(`  ✓ ${tags.length} tags`);

  // 5. Files (nlogox files + supplementary)

  const files = [
    ...Object.values(seedNlogoxFiles).map((f) => ({
      id: f.id,
      filename: `${f.filename}`,
      contentType: f.contentType,
      sizeBytes: f.sizeBytes,
      blob: f.blob,
    })),
    {
      id: ids.fireSpreadNlogox,
      filename: 'fire-spread.nlogox',
      contentType: 'application/xml',
      sizeBytes: BigInt(380) as bigint,
      blob: fakeNlogox('Fire Spread'),
    },
    {
      id: ids.antForagingNlogox,
      filename: 'ant-foraging.nlogox',
      contentType: 'application/xml',
      sizeBytes: BigInt(410) as bigint,
      blob: fakeNlogox('Ant Foraging'),
    },
    {
      id: ids.virusNetworkNlogox,
      filename: 'virus-network.nlogox',
      contentType: 'application/xml',
      sizeBytes: BigInt(390) as bigint,
      blob: fakeNlogox('Virus on a Network'),
    },
    {
      id: ids.wolfSheepReadme,
      filename: 'README.md',
      contentType: 'text/markdown',
      sizeBytes: BigInt(58) as bigint,
      blob: fakeReadme(),
    },
    {
      id: ids.wolfSheepData,
      filename: 'initial-data.csv',
      contentType: 'text/csv',
      sizeBytes: BigInt(52) as bigint,
      blob: fakeCsv(),
    },
    {
      id: ids.fireSpreadCsv,
      filename: 'burn-results.csv',
      contentType: 'text/csv',
      sizeBytes: BigInt(52) as bigint,
      blob: fakeCsv(),
    },
  ];

  for (const f of files) {
    await prisma.file.upsert({
      where: { id: f.id },
      update: {},
      // @ts-expect-error -- Shared vs. Non-Shared Buffer
      create: f,
    });
  }
  console.log(`  ✓ ${files.length} files`);

  // 6. Models (without latestVersionId — set after versions exist)
  const models = [
    { id: ids.wolfSheep, visibility: 'public' as const, isEndorsed: true },
    { id: ids.fireSpread, visibility: 'public' as const, isEndorsed: true },
    { id: ids.antForaging, visibility: 'public' as const, isEndorsed: false },
    { id: ids.virusNetwork, visibility: 'private' as const, isEndorsed: false },
    {
      id: ids.wolfSheepFork,
      visibility: 'unlisted' as const,
      isEndorsed: false,
      parentModelId: ids.wolfSheep,
    },
    { id: ids.trafficBasic, visibility: 'public' as const, isEndorsed: false },
    {
      id: ids.traffic2Lanes,
      visibility: 'public' as const,
      isEndorsed: false,
      parentModelId: ids.trafficBasic,
    },
  ];

  for (const m of models) {
    await prisma.model.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    });
  }
  console.log(`  ✓ ${models.length} models`);

  // 7. Model versions
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const versions = [
    {
      modelId: ids.wolfSheep,
      versionNumber: 1,
      title: 'Wolf Sheep Predation',
      description:
        'A classic predator-prey model exploring population dynamics between wolves, sheep, and grass.',
      nlogoxFileId: seedNlogoxFiles.wolfSheepNlogox1.id,
      netlogoVersion: '7.0.0',
      infoTab: seedNlogoxFiles.wolfSheepNlogox1.infoTab,
      createdAt: oneWeekAgo,
      finalizedAt: now,
      previewImage: seedNlogoxFiles.wolfSheepNlogox1.previewImage.blob,
    },
    {
      modelId: ids.wolfSheep,
      versionNumber: 2,
      title: 'Wolf Sheep Predation',
      description: 'Updated with energy-based movement and grass regrowth mechanics.',
      nlogoxFileId: seedNlogoxFiles.wolfSheepNlogox2.id,
      netlogoVersion: '7.0.3',
      infoTab: seedNlogoxFiles.wolfSheepNlogox2.infoTab,
      previewImage: seedNlogoxFiles.wolfSheepNlogox2.previewImage.blob,
    },
    {
      modelId: ids.wolfSheepFork,
      versionNumber: 1,
      title: 'Wolf Sheep - Seasonal Variant',
      description: 'A fork of Wolf Sheep Predation that adds seasonal grass growth patterns.',
      nlogoxFileId: seedNlogoxFiles.wolfSheepNlogoxFork.id,
      netlogoVersion: '7.0.0',
      infoTab: seedNlogoxFiles.wolfSheepNlogoxFork.infoTab,
      previewImage: seedNlogoxFiles.wolfSheepNlogoxFork.previewImage.blob,
    },
    {
      modelId: ids.trafficBasic,
      versionNumber: 1,
      title: 'Traffic Basic',
      description: 'A simple traffic flow model demonstrating basic congestion dynamics.',
      nlogoxFileId: seedNlogoxFiles.trafficBasicNlogox.id,
      netlogoVersion: '6.4.0',
      infoTab: seedNlogoxFiles.trafficBasicNlogox.infoTab,
      previewImage: seedNlogoxFiles.trafficBasicNlogox.previewImage.blob,
    },
    {
      modelId: ids.trafficBasic,
      versionNumber: 2,
      title: 'Traffic Grid',
      description:
        'An extension of the basic traffic model that simulates a grid of intersections and traffic lights.',
      nlogoxFileId: seedNlogoxFiles.trafficGridNlogox.id,
      netlogoVersion: '7.0.0',
      infoTab: seedNlogoxFiles.trafficGridNlogox.infoTab,
      previewImage: seedNlogoxFiles.trafficGridNlogox.previewImage.blob,
    },
    {
      modelId: ids.traffic2Lanes,
      versionNumber: 1,
      title: 'Traffic – 2 Lanes',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros. Lorem ipsum dolor sit amet, consect etur adipiscing elit. Suspendisse varius enim in eros.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.  Suspendisse vauspendisse va.',

      nlogoxFileId: seedNlogoxFiles.traffic2LanesNlogox.id,
      netlogoVersion: '7.0.0',
      infoTab: seedNlogoxFiles.traffic2LanesNlogox.infoTab,
      previewImage: seedNlogoxFiles.traffic2LanesNlogox.previewImage.blob,
    },
    {
      modelId: ids.fireSpread,
      versionNumber: 1,
      title: 'Fire Spread',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros. Lorem ipsum dolor sit amet, consect etur adipiscing elit. Suspendisse varius enim in eros.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.  Suspendisse vauspendisse va.',
      nlogoxFileId: ids.fireSpreadNlogox,
      netlogoVersion: '6.4.0',
      infoTab: '## WHAT IS IT?\n\nThis model simulates fire spreading through a forest.',
    },
    {
      modelId: ids.antForaging,
      versionNumber: 1,
      title: 'Ant Foraging',
      description:
        'Models how ants use pheromone trails to find the shortest path between their nest and a food source.',
      nlogoxFileId: ids.antForagingNlogox,
      netlogoVersion: '6.3.0',
      infoTab: '## WHAT IS IT?\n\nThis model demonstrates emergent path-finding behavior.',
    },
    {
      modelId: ids.virusNetwork,
      versionNumber: 1,
      title: 'Virus on a Network',
      description:
        'Explores how a virus spreads through a network topology and the impact of vaccination strategies.',
      nlogoxFileId: ids.virusNetworkNlogox,
      netlogoVersion: '6.4.0',
      infoTab:
        '## WHAT IS IT?\n\nThis model shows virus spread dynamics on various network topologies.',
    },
  ];

  for (const v of versions) {
    await prisma.modelVersion.upsert({
      where: { modelId_versionNumber: { modelId: v.modelId, versionNumber: v.versionNumber } },
      update: {},
      // @ts-expect-error -- Shared vs. Non-Shared Buffer
      create: v,
    });
  }
  console.log(`  ✓ ${versions.length} model versions`);

  // 8. Set latest version pointers
  const modelUpdates = [
    { id: ids.wolfSheep, data: { latestVersionNumber: 2 } },
    { id: ids.fireSpread, data: { latestVersionNumber: 1 } },
    { id: ids.antForaging, data: { latestVersionNumber: 1 } },
    { id: ids.virusNetwork, data: { latestVersionNumber: 1 } },
    {
      id: ids.wolfSheepFork,
      data: { latestVersionNumber: 1, parentVersionNumber: 2 },
    },
    { id: ids.trafficBasic, data: { latestVersionNumber: 2 } },
    { id: ids.traffic2Lanes, data: { latestVersionNumber: 1, parentVersionNumber: 2 } },
  ];

  for (const m of modelUpdates) {
    await prisma.model.update({ where: { id: m.id }, data: m.data });
  }
  console.log('  ✓ latest version pointers set');

  // 9. Model version files (supplementary files attached to versions)
  const mvFiles = [
    { id: ids.mvFile1, modelId: ids.wolfSheep, versionNumber: 1, fileId: ids.wolfSheepData },
    { id: ids.mvFile2, modelId: ids.wolfSheep, versionNumber: 2, fileId: ids.wolfSheepData },
  ];

  for (const mvf of mvFiles) {
    await prisma.modelVersionFile.upsert({
      where: { id: mvf.id },
      update: {},
      create: mvf,
    });
  }
  console.log(`  ✓ ${mvFiles.length} model version files`);

  // 10. Model version tags
  const spreadTags = (modelId: string, versionNumber: number, tagIds: string[]) =>
    tagIds.map((tagId) => ({ modelId, versionNumber, tagId }));

  const versionTags = [
    spreadTags(ids.wolfSheep, 1, [ids.tagEcology, ids.tagPredatorPrey, ids.tagBiology]),
    spreadTags(ids.wolfSheep, 2, [
      ids.tagEcology,
      ids.tagPredatorPrey,
      ids.tagBiology,
      ids.tagEmergence,
    ]),
    spreadTags(ids.fireSpread, 1, [ids.tagFire, ids.tagEmergence]),
    spreadTags(ids.antForaging, 1, [ids.tagBiology, ids.tagSwarmIntelligence, ids.tagEmergence]),
    spreadTags(ids.virusNetwork, 1, [ids.tagNetwork, ids.tagEpidemiology, ids.tagBiology]),
    spreadTags(ids.wolfSheepFork, 1, [ids.tagEcology, ids.tagPredatorPrey]),
    spreadTags(ids.trafficBasic, 1, [ids.tagEmergence]),
    spreadTags(ids.trafficBasic, 2, [ids.tagEmergence]),
    spreadTags(ids.traffic2Lanes, 1, [ids.tagEmergence]),
  ].flat();

  for (const vt of versionTags) {
    await prisma.modelVersionTag.upsert({
      where: {
        modelId_versionNumber_tagId: {
          modelId: vt.modelId,
          versionNumber: vt.versionNumber,
          tagId: vt.tagId,
        },
      },
      update: {},
      create: vt,
    });
  }
  console.log(`  ✓ ${versionTags.length} version tags`);

  // 11. Model additional files (model-level, version-tagged)
  const additionalFiles = [
    {
      id: ids.additionalFile1,
      modelId: ids.wolfSheep,
      taggedVersionNumber: 1,
      fileId: ids.wolfSheepReadme,
    },
    {
      id: ids.additionalFile2,
      modelId: ids.fireSpread,
      taggedVersionNumber: 1,
      fileId: ids.fireSpreadCsv,
    },
  ];

  for (const af of additionalFiles) {
    await prisma.modelAdditionalFile.upsert({
      where: { id: af.id },
      update: {},
      create: af,
    });
  }
  console.log(`  ✓ ${additionalFiles.length} additional files`);

  // 12. Model authors
  const authors = [
    { modelId: ids.wolfSheep, userId: ids.alice, role: 'owner' as const },
    { modelId: ids.wolfSheep, userId: ids.bob, role: 'contributor' as const },
    { modelId: ids.fireSpread, userId: ids.bob, role: 'owner' as const },
    { modelId: ids.fireSpread, userId: ids.carol, role: 'contributor' as const },
    { modelId: ids.antForaging, userId: ids.carol, role: 'owner' as const },
    { modelId: ids.virusNetwork, userId: ids.alice, role: 'owner' as const },
    { modelId: ids.virusNetwork, userId: ids.carol, role: 'contributor' as const },
    { modelId: ids.wolfSheepFork, userId: ids.dave, role: 'owner' as const },
    { modelId: ids.trafficBasic, userId: ids.alice, role: 'owner' as const },
    { modelId: ids.trafficBasic, userId: ids.bob, role: 'contributor' as const },
    { modelId: ids.traffic2Lanes, userId: ids.bob, role: 'owner' as const },
  ];

  for (const a of authors) {
    await prisma.modelAuthor.upsert({
      where: { modelId_userId: { modelId: a.modelId, userId: a.userId } },
      update: {},
      create: a,
    });
  }
  console.log(`  ✓ ${authors.length} model authors`);

  // 13. Model permissions
  const permissions = [
    {
      id: ids.permBobReadWolfSheep,
      modelId: ids.wolfSheep,
      granteeUserId: ids.bob,
      permissionLevel: 'read' as const,
    },
    {
      id: ids.permCarolWriteFireSpread,
      modelId: ids.fireSpread,
      granteeUserId: ids.carol,
      permissionLevel: 'write' as const,
    },
    {
      id: ids.permPublicReadAntForaging,
      modelId: ids.antForaging,
      granteeUserId: null,
      permissionLevel: 'read' as const,
    },
    {
      id: getNonRandomUUID('60000000', 100),
      modelId: ids.trafficBasic,
      granteeUserId: null,
      permissionLevel: 'read' as const,
    },
    {
      id: getNonRandomUUID('60000000', 100),
      modelId: ids.traffic2Lanes,
      granteeUserId: null,
      permissionLevel: 'read' as const,
    },
  ];

  for (const p of permissions) {
    await prisma.modelPermission.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }
  console.log(`  ✓ ${permissions.length} model permissions`);

  // 14. Events (domain event log)
  const events = [
    {
      id: ids.event1,
      type: 'model.created',
      actorId: ids.alice,
      resourceType: 'model',
      resourceId: ids.wolfSheep,
      payload: { title: 'Wolf Sheep Predation', visibility: 'public' },
    },
    {
      id: ids.event2,
      type: 'model_version.created',
      actorId: ids.alice,
      resourceType: 'model_version',
      resourceId: `${ids.wolfSheep}:1`,
      payload: { modelId: ids.wolfSheep, versionNumber: 1 },
    },
    {
      id: ids.event3,
      type: 'model_version.created',
      actorId: ids.alice,
      resourceType: 'model_version',
      resourceId: `${ids.wolfSheep}:2`,
      payload: { modelId: ids.wolfSheep, versionNumber: 2 },
      processedAt: new Date(),
    },
    {
      id: ids.event4,
      type: 'model.created',
      actorId: ids.bob,
      resourceType: 'model',
      resourceId: ids.fireSpread,
      payload: { title: 'Fire Spread', visibility: 'public' },
      processedAt: new Date(),
    },
    {
      id: ids.event5,
      type: 'model.forked',
      actorId: ids.dave,
      resourceType: 'model',
      resourceId: ids.wolfSheepFork,
      payload: { parentModelId: ids.wolfSheep, parentVersionNumber: 2 },
    },
  ];

  for (const e of events) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: {},
      create: e,
    });
  }
  console.log(`  ✓ ${events.length} events`);

  console.log('\nSeed completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
