import { prisma } from './providers.js';
import {
  UserBuilder,
  SessionBuilder,
  TagBuilder,
  FileUploader,
  ModelBuilder,
  ModelVersionBuilder,
  EventBuilder,
} from './builders.js';
import { readNlogox, fakeNlogox, fakeCsv, fakeReadme } from './files.js';

async function main() {
  console.log('Seeding database...');

  const alice = new UserBuilder();
  alice.name = 'Alice Bob';
  alice.email = 'alice@example.com';
  alice.userKind = 'researcher';
  alice.isProfilePublic = true;
  await alice.upsert();

  const bob = new UserBuilder();
  bob.name = 'Bob Rand';
  bob.email = 'bob@example.com';
  bob.userKind = 'teacher';
  bob.isProfilePublic = true;
  await bob.upsert();

  const carol = new UserBuilder();
  carol.name = 'Carol Tisue';
  carol.email = 'carol@example.com';
  carol.systemRole = 'moderator';
  carol.userKind = 'researcher';
  await carol.upsert();

  const dave = new UserBuilder();
  dave.name = 'Dave Student';
  dave.email = 'dave@example.com';
  dave.emailVerified = false;
  dave.userKind = 'student';
  await dave.upsert();

  const admin = new UserBuilder();
  admin.name = 'Admin';
  admin.email = 'admin@example.com';
  admin.systemRole = 'admin';
  admin.userKind = 'other';
  await admin.upsert();

  console.log('  ✓ 5 users + accounts');

  const sessionAlice = new SessionBuilder();
  sessionAlice.user = alice;
  sessionAlice.token = 'dev-session-token-alice-000001';
  await sessionAlice.upsert();

  const sessionBob = new SessionBuilder();
  sessionBob.user = bob;
  sessionBob.token = 'dev-session-token-bob-000002';
  await sessionBob.upsert();

  console.log('  ✓ 2 sessions');

  const ecology = new TagBuilder('ecology');
  const predatorPrey = new TagBuilder('predator-prey');
  const fire = new TagBuilder('fire');
  const emergence = new TagBuilder('emergence');
  const biology = new TagBuilder('biology');
  const network = new TagBuilder('network');
  const epidemiology = new TagBuilder('epidemiology');
  const swarmIntelligence = new TagBuilder('swarm-intelligence');

  await Promise.all(
    [ecology, predatorPrey, fire, emergence, biology, network, epidemiology, swarmIntelligence].map(
      (t) => t.upsert(),
    ),
  );
  console.log('  ✓ 8 tags');

  const nlogoxFiles = {
    wolfSheepV1: readNlogox('wolf-sheep-predation.nlogox', 'wolf-sheep-preview.png'),
    wolfSheepV2: readNlogox('wolf-sheep-predation-v2.nlogox', 'wolf-sheep-preview.png'),
    wolfSheepFork: readNlogox('wolf-sheep-predation-fork.nlogox', 'wolf-sheep-preview.png'),
    trafficGrid: readNlogox('traffic-grid.nlogox', 'traffic-grid-preview.png'),
    trafficBasic: readNlogox('traffic-basic.nlogox', 'traffic-grid-preview.png'),
    traffic2Lanes: readNlogox('traffic-2-lanes.nlogox', 'traffic-2-lanes-preview.png'),
    fire: readNlogox('fire.nlogox', 'fire-preview.png'),
    ants: readNlogox('ants.nlogox', 'ants-preview.png'),
  };

  const extraKeys = {
    virusNetwork: 'uploads/models/virus-network.nlogox',
    wolfSheepReadme: 'uploads/models/wolf-sheep-readme.md',
    wolfSheepData: 'uploads/models/wolf-sheep-data.csv',
    fireSpreadCsv: 'uploads/models/fire-spread-data.csv',
  };

  await FileUploader.uploadNlogoxFiles(nlogoxFiles);
  await new FileUploader(
    extraKeys.virusNetwork,
    fakeNlogox('Virus on a Network'),
    'application/xml',
    'virus-network.nlogox',
  ).upload();
  await new FileUploader(
    extraKeys.wolfSheepReadme,
    fakeReadme(),
    'text/markdown',
    'README.md',
  ).upload();
  await new FileUploader(
    extraKeys.wolfSheepData,
    fakeCsv(),
    'text/csv',
    'initial-data.csv',
  ).upload();
  await new FileUploader(
    extraKeys.fireSpreadCsv,
    fakeCsv(),
    'text/csv',
    'burn-results.csv',
  ).upload();
  console.log('  ✓ files uploaded');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Wolf Sheep Predation
  const wolfSheepV1 = new ModelVersionBuilder();
  wolfSheepV1.versionNumber = 1;
  wolfSheepV1.title = 'Wolf Sheep Predation';
  wolfSheepV1.description =
    'A classic predator-prey model exploring population dynamics between wolves, sheep, and grass.';
  wolfSheepV1.fromNlogox(nlogoxFiles.wolfSheepV1);
  wolfSheepV1.netlogoVersion = '7.0.0';
  wolfSheepV1.createdAt = oneWeekAgo;
  wolfSheepV1.finalizedAt = now;
  wolfSheepV1.tags = [ecology, predatorPrey, biology];
  wolfSheepV1.supplementaryFileKeys = [extraKeys.wolfSheepData];

  const wolfSheepV2 = new ModelVersionBuilder();
  wolfSheepV2.versionNumber = 2;
  wolfSheepV2.title = 'Wolf Sheep Predation';
  wolfSheepV2.description = 'Updated with energy-based movement and grass regrowth mechanics.';
  wolfSheepV2.fromNlogox(nlogoxFiles.wolfSheepV2);
  wolfSheepV2.netlogoVersion = '7.0.3';
  wolfSheepV2.tags = [ecology, predatorPrey, biology, emergence];
  wolfSheepV2.supplementaryFileKeys = [extraKeys.wolfSheepData];

  const wolfSheep = new ModelBuilder();
  wolfSheep.isEndorsed = true;
  wolfSheep.addVersion(wolfSheepV1);
  wolfSheep.addVersion(wolfSheepV2);
  wolfSheep.addAuthor(alice, 'owner');
  wolfSheep.addAuthor(bob, 'contributor');
  wolfSheep.addPermission(bob.id, 'read');
  wolfSheep.addAdditionalFile(1, extraKeys.wolfSheepReadme);
  await wolfSheep.upsert();

  // Fire Spread
  const fireV1 = new ModelVersionBuilder();
  fireV1.versionNumber = 1;
  fireV1.title = 'Fire';
  fireV1.description =
    "This project simulates the spread of a fire through a forest. It shows that the fire's chance of reaching the right edge of the forest depends critically on the density of trees. This is an example of a common feature of complex systems, the presence of a non-linear threshold or critical parameter.";
  fireV1.fromNlogox(nlogoxFiles.fire);
  fireV1.netlogoVersion = '6.4.0';
  fireV1.infoTab = '## WHAT IS IT?\n\nThis model simulates fire spreading through a forest.';
  fireV1.tags = [fire, emergence];

  const fireSpread = new ModelBuilder();
  fireSpread.isEndorsed = true;
  fireSpread.addVersion(fireV1);
  fireSpread.addAuthor(bob, 'owner');
  fireSpread.addAuthor(carol, 'contributor');
  fireSpread.addPermission(carol.id, 'write');
  fireSpread.addAdditionalFile(1, extraKeys.fireSpreadCsv);
  await fireSpread.upsert();

  // Ant Foraging
  const antsV1 = new ModelVersionBuilder();
  antsV1.versionNumber = 1;
  antsV1.title = 'Ants';
  antsV1.description =
    'In this project, a colony of ants forages for food. Though each ant follows a set of simple rules, the colony as a whole acts in a sophisticated way.';
  antsV1.fromNlogox(nlogoxFiles.ants);
  antsV1.netlogoVersion = '6.3.0';
  antsV1.infoTab = '## WHAT IS IT?\n\nThis model demonstrates emergent path-finding behavior.';
  antsV1.tags = [biology, swarmIntelligence, emergence];

  const antForaging = new ModelBuilder();
  antForaging.addVersion(antsV1);
  antForaging.addAuthor(carol, 'owner');
  antForaging.addPermission(null, 'read');
  await antForaging.upsert();

  // Virus on a Network
  const virusV1 = new ModelVersionBuilder();
  virusV1.versionNumber = 1;
  virusV1.title = 'Virus on a Network';
  virusV1.description =
    'Explores how a virus spreads through a network topology and the impact of vaccination strategies.';
  virusV1.netlogoFileKey = extraKeys.virusNetwork;
  virusV1.netlogoVersion = '6.4.0';
  virusV1.infoTab =
    '## WHAT IS IT?\n\nThis model shows virus spread dynamics on various network topologies.';
  virusV1.tags = [network, epidemiology, biology];

  const virusNetwork = new ModelBuilder();
  virusNetwork.visibility = 'private';
  virusNetwork.addVersion(virusV1);
  virusNetwork.addAuthor(alice, 'owner');
  virusNetwork.addAuthor(carol, 'contributor');
  await virusNetwork.upsert();

  // Wolf Sheep Fork
  const wolfSheepForkV1 = new ModelVersionBuilder();
  wolfSheepForkV1.versionNumber = 1;
  wolfSheepForkV1.title = 'Wolf Sheep - Seasonal Variant';
  wolfSheepForkV1.description =
    'A fork of Wolf Sheep Predation that adds seasonal grass growth patterns.';
  wolfSheepForkV1.fromNlogox(nlogoxFiles.wolfSheepFork);
  wolfSheepForkV1.netlogoVersion = '7.0.0';
  wolfSheepForkV1.tags = [ecology, predatorPrey];

  const wolfSheepFork = new ModelBuilder();
  wolfSheepFork.visibility = 'unlisted';
  wolfSheepFork.parent = wolfSheep;
  wolfSheepFork.parentVersionNumber = 2;
  wolfSheepFork.addVersion(wolfSheepForkV1);
  wolfSheepFork.addAuthor(dave, 'owner');
  await wolfSheepFork.upsert();

  // Traffic Basic
  const trafficBasicV1 = new ModelVersionBuilder();
  trafficBasicV1.versionNumber = 1;
  trafficBasicV1.title = 'Traffic Basic';
  trafficBasicV1.description =
    'A simple traffic flow model demonstrating basic congestion dynamics.';
  trafficBasicV1.fromNlogox(nlogoxFiles.trafficBasic);
  trafficBasicV1.netlogoVersion = '6.4.0';
  trafficBasicV1.tags = [emergence];

  const trafficBasicV2 = new ModelVersionBuilder();
  trafficBasicV2.versionNumber = 2;
  trafficBasicV2.title = 'Traffic Grid';
  trafficBasicV2.description =
    'An extension of the basic traffic model that simulates a grid of intersections and traffic lights.';
  trafficBasicV2.fromNlogox(nlogoxFiles.trafficGrid);
  trafficBasicV2.netlogoVersion = '7.0.0';
  trafficBasicV2.tags = [emergence];

  const trafficBasic = new ModelBuilder();
  trafficBasic.addVersion(trafficBasicV1);
  trafficBasic.addVersion(trafficBasicV2);
  trafficBasic.addAuthor(alice, 'owner');
  trafficBasic.addAuthor(bob, 'contributor');
  trafficBasic.addPermission(null, 'read');
  await trafficBasic.upsert();

  // Traffic 2 Lanes
  const traffic2LanesV1 = new ModelVersionBuilder();
  traffic2LanesV1.versionNumber = 1;
  traffic2LanesV1.title = 'Traffic – 2 Lanes';
  traffic2LanesV1.description =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros. Lorem ipsum dolor sit amet, consect etur adipiscing elit. Suspendisse varius enim in eros.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.  Suspendisse vauspendisse va.';
  traffic2LanesV1.fromNlogox(nlogoxFiles.traffic2Lanes);
  traffic2LanesV1.netlogoVersion = '7.0.0';
  traffic2LanesV1.tags = [emergence];

  const traffic2Lanes = new ModelBuilder();
  traffic2Lanes.parent = trafficBasic;
  traffic2Lanes.parentVersionNumber = 2;
  traffic2Lanes.addVersion(traffic2LanesV1);
  traffic2Lanes.addAuthor(bob, 'owner');
  traffic2Lanes.addPermission(null, 'read');
  await traffic2Lanes.upsert();

  console.log('  ✓ 7 models with versions, tags, authors, permissions');

  // ── Events ──────────────────────────────────────────────────────────────

  const e1 = new EventBuilder();
  e1.type = 'model.created';
  e1.actor = alice;
  e1.resourceType = 'model';
  e1.resourceId = wolfSheep.id;
  e1.payload = { title: 'Wolf Sheep Predation', visibility: 'public' };
  await e1.upsert();

  const e2 = new EventBuilder();
  e2.type = 'model_version.created';
  e2.actor = alice;
  e2.resourceType = 'model_version';
  e2.resourceId = `${wolfSheep.id}:1`;
  e2.payload = { modelId: wolfSheep.id, versionNumber: 1 };
  await e2.upsert();

  const e3 = new EventBuilder();
  e3.type = 'model_version.created';
  e3.actor = alice;
  e3.resourceType = 'model_version';
  e3.resourceId = `${wolfSheep.id}:2`;
  e3.payload = { modelId: wolfSheep.id, versionNumber: 2 };
  e3.processedAt = now;
  await e3.upsert();

  const e4 = new EventBuilder();
  e4.type = 'model.created';
  e4.actor = bob;
  e4.resourceType = 'model';
  e4.resourceId = fireSpread.id;
  e4.payload = { title: 'Fire Spread', visibility: 'public' };
  e4.processedAt = now;
  await e4.upsert();

  const e5 = new EventBuilder();
  e5.type = 'model.forked';
  e5.actor = dave;
  e5.resourceType = 'model';
  e5.resourceId = wolfSheepFork.id;
  e5.payload = { parentModelId: wolfSheep.id, parentVersionNumber: 2 };
  await e5.upsert();

  console.log('  ✓ 5 events');
  console.log('\nSeed completed successfully.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
