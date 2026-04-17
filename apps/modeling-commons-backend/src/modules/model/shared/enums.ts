import { ModelVisibility } from '#prisma/index';
import { enumSchema } from '#src/shared/schemas/enum-from-prisma.ts';

export { ModelVisibility };
export const visibilitySchema = enumSchema(ModelVisibility);
