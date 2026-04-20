import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import type {
  ModelFamilyCardResponseDto,
  ModelFamilySummary,
} from '#src/modules/model/dtos/model.family-card.dto.ts';

const summaryArgs = {
  include: {
    versions: {
      orderBy: { versionNumber: 'desc' },
      take: 1,
      select: { title: true, description: true, versionNumber: true },
    },
    authors: {
      orderBy: { createdAt: 'asc' },
      take: 1,
      include: { user: { select: { name: true } } },
    },
    _count: { select: { versions: true } },
  },
} as const;

type SummaryRecord = {
  id: string;
  visibility: string;
  isEndorsed: boolean;
  createdAt: Date;
  latestVersionNumber: number | null;
  parentModelId: string | null;
  parentVersionNumber: number | null;
  versions: Array<{ title: string; description: string | null; versionNumber: number }>;
  authors: Array<{ user: { name: string | null } }>;
  _count: { versions: number };
};

function toSummary(record: SummaryRecord, linkedVersionNumber: number | null = null): ModelFamilySummary {
  const [latest] = record.versions;
  return {
    id: record.id,
    title: latest?.title ?? 'Untitled',
    description: latest?.description ?? null,
    visibility: record.visibility,
    isEndorsed: record.isEndorsed,
    createdAt: record.createdAt.toISOString(),
    latestVersionNumber: record.latestVersionNumber,
    parentModelId: record.parentModelId,
    parentVersionNumber: record.parentVersionNumber,
    authorName: record.authors[0]?.user.name ?? null,
    versionCount: record._count.versions,
    linkedVersionNumber,
  };
}

export default function makeGetModelFamilyCardQuery({ db }: Dependencies) {
  return {
    async execute(modelId: string): Promise<ModelFamilyCardResponseDto> {
      const self = await db.model.findFirst({
        where: { id: modelId, deletedAt: null },
        ...summaryArgs,
      });
      if (!self) throw new ModelNotFoundError(modelId);

      const [parent, siblings, children] = await Promise.all([
        self.parentModelId
          ? db.model.findFirst({
              where: { id: self.parentModelId, deletedAt: null },
              ...summaryArgs,
            })
          : Promise.resolve(null),
        self.parentModelId
          ? db.model.findMany({
              where: {
                parentModelId: self.parentModelId,
                id: { not: self.id },
                deletedAt: null,
              },
              orderBy: { createdAt: 'desc' },
              take: 50,
              ...summaryArgs,
            })
          : Promise.resolve([]),
        db.model.findMany({
          where: { parentModelId: self.id, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 50,
          ...summaryArgs,
        }),
      ]);

      return {
        self: toSummary(self as SummaryRecord),
        parent: parent ? toSummary(parent as SummaryRecord) : null,
        siblings: (siblings as SummaryRecord[]).map((s) => toSummary(s)),
        children: (children as SummaryRecord[]).map((c) => toSummary(c, c.parentVersionNumber)),
      };
    },
  };
}
