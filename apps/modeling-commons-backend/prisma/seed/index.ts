import { prisma } from './providers.js';
import { AssetUploader } from './assets.js';
import { USERS, TAGS, MODELS, COMMENTS, DRAFTS } from './manifest/index.js';
import {
  loadUsers,
  loadTags,
  loadModels,
  loadEngagement,
  loadComments,
  loadDrafts,
  type IdMap,
} from './loaders.js';

async function main() {
  console.log('Seeding database from manifest...');
  const uploader = new AssetUploader();

  const users = await loadUsers(USERS);
  console.log(`  ✓ ${users.size} users (+ credential accounts, dev sessions)`);

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