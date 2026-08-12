/**
 * Canonical dump of a target DB, with the random id segments of every storage
 * key normalised out, so two dumps of logically identical data diff cleanly.
 * See lib/normalize-key.ts for exactly what gets collapsed.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { normalizeKey } from '../lib/normalize-key.ts';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL']! }),
});

const norm = (key: string | null) => (key === null ? null : normalizeKey(key));
// A version file keeps the node name it was uploaded under; renaming a node in
// the legacy app does not move objects in storage, so the trailing filename can
// legitimately differ from a from-scratch archive. Compare the path only.
const normVersionKey = (key: string | null) =>
  key === null ? null : norm(key)!.replace(/\/[^/]*$/, '/<filename>');
const iso = (d: Date | null) => (d === null ? null : d.toISOString());

async function main() {
  const users = await prisma.user.findMany({
    where: { legacyId: { not: null } },
    orderBy: { legacyId: 'asc' },
  });

  const models = await prisma.model.findMany({
    where: { legacyId: { not: null } },
    orderBy: { legacyId: 'asc' },
    include: {
      versions: {
        orderBy: { versionNumber: 'asc' },
        include: { tags: { include: { tag: true } } },
      },
      authors: { include: { user: true } },
      additionalFiles: true,
    },
  });

  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });

  console.log(
    JSON.stringify(
      {
        users: users.map((u) => ({
          legacyId: u.legacyId,
          email: u.email,
          name: u.name,
          bio: u.bio,
          dob: iso(u.dob),
          image: norm(u.image),
          socialLinks: u.socialLinks,
          createdAt: iso(u.createdAt),
          softDeleted: u.deletedAt !== null,
        })),
        tags: tags.map((t) => ({ legacyId: t.legacyId, name: t.name, displayName: t.displayName })),
        softDeletedModels: models.filter((m) => m.deletedAt).map((m) => m.legacyId),
        models: models
          .filter((m) => !m.deletedAt)
          .map((m) => ({
            legacyId: m.legacyId,
            visibility: m.visibility,
            isEndorsed: m.isEndorsed,
            createdAt: iso(m.createdAt),
            latestVersionNumber: m.latestVersionNumber,
            authors: m.authors
              .map((a) => ({ userLegacyId: a.user.legacyId, role: a.role }))
              .sort((a, b) => (a.userLegacyId ?? 0) - (b.userLegacyId ?? 0)),
            versions: m.versions.map((v) => ({
              versionNumber: v.versionNumber,
              title: v.title,
              description: v.description,
              netlogoFileKey: normVersionKey(v.netlogoFileKey),
              netlogoVersion: v.netlogoVersion,
              infoTab: v.infoTab,
              previewImageFileKey: norm(v.previewImageFileKey),
              createdAt: iso(v.createdAt),
              finalizedAt: iso(v.finalizedAt),
              tags: v.tags.map((t) => t.tag.name).sort(),
            })),
            additionalFiles: m.additionalFiles
              .map((f) => ({
                fileKey: norm(f.fileKey),
                taggedVersionNumber: f.taggedVersionNumber,
                createdAt: iso(f.createdAt),
              }))
              .sort((a, b) => (a.fileKey! < b.fileKey! ? -1 : 1)),
          })),
      },
      null,
      2,
    ),
  );
}

main().finally(() => prisma.$disconnect());
