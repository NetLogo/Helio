import { prisma } from './providers.js';
import { AssetUploader } from './assets.js';
import {
  DEV_PASSWORD,
  USERS,
  TAGS,
  MODELS,
  COMMENTS,
  DRAFTS,
  NOTIFICATION_PREFERENCES,
} from './manifest/index.js';
import {
  loadUsers,
  loadTags,
  loadModels,
  loadEngagement,
  loadComments,
  loadNotifications,
  loadDrafts,
  type IdMap,
} from './loaders.js';

async function main() {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'Refusing to seed: the seed sets a shared dev password on every seeded account.',
    );
  }
  console.log('Seeding database from manifest...');
  const uploader = new AssetUploader();

  const users = await loadUsers(USERS, DEV_PASSWORD);
  console.log(`  ✓ ${users.size} users (+ credential accounts, dev sessions)`);
  console.log(
    `    sign in as any seeded user, e.g. uri@example.com, with password "${DEV_PASSWORD}"`,
  );

  const tags = await loadTags(TAGS);
  console.log(`  ✓ ${tags.size} tags`);

  const models = await loadModels(MODELS, users, tags, uploader);
  console.log(`  ✓ ${models.length} models with versions, authors, permissions, files`);
  console.log(`  ✓ ${uploader.count} objects uploaded to storage`);

  const engagement = await loadEngagement(models, users);
  console.log(
    `  ✓ ${engagement.likes} likes, ${engagement.interactions} interactions, ${engagement.events} audit events`,
  );

  const modelIds: IdMap = new Map(models.map((m) => [m.key, m.id]));

  const comments = await loadComments(COMMENTS, users, modelIds);
  console.log(`  ✓ ${comments.comments} comments, ${comments.likes} comment likes`);

  const notifications = await loadNotifications(
    COMMENTS,
    MODELS,
    NOTIFICATION_PREFERENCES,
    users,
    modelIds,
  );
  console.log(
    `  ✓ ${notifications.notifications} notifications, ${notifications.preferences} notification preferences`,
  );

  const draftCount = await loadDrafts(DRAFTS, users, modelIds, uploader);
  console.log(`  ✓ ${draftCount} model drafts`);

  console.log('\nSeed completed successfully.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
