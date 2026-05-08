import { Prisma } from '#prisma/index';

const dateRangeQueryArgs = (
  fromDate: string | undefined,
  toDate: string | undefined,
  key = 'createdAt',
): Prisma.ModelWhereInput => {
  const conditions: Prisma.ModelWhereInput[] = [];

  if (fromDate) {
    conditions.push({ [key]: { gte: new Date(fromDate) } });
  }
  if (toDate) {
    conditions.push({ [key]: { lte: new Date(toDate) } });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
};

export default dateRangeQueryArgs;
