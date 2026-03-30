import { Type, type Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const userIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
export type UserIdParams = Static<typeof userIdParamsSchema>;

export const UserKindDto = {
  student: 'student',
  teacher: 'teacher',
  researcher: 'researcher',
  other: 'other',
} as const;
export type UserKindDto = (typeof UserKindDto)[keyof typeof UserKindDto];

export const SystemRoleDto = {
  admin: 'admin',
  moderator: 'moderator',
  user: 'user',
} as const;
export type SystemRoleDto = (typeof SystemRoleDto)[keyof typeof SystemRoleDto];

export const updateUserRequestDtoSchema = Type.Object({
  userKind: Type.Optional(
    Type.Union([...Object.values(UserKindDto).map((kind) => Type.Literal(kind))]),
  ),
  isProfilePublic: Type.Optional(Type.Boolean()),
  systemRole: Type.Optional(
    Type.Union([...Object.values(SystemRoleDto).map((role) => Type.Literal(role))]),
  ),
});
export type UpdateUserRequestDto = Static<typeof updateUserRequestDtoSchema>;

export const userSearchQuerySchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    userKind: Type.Optional(
      Type.Enum(UserKindDto, {
        description: Object.values(UserKindDto).join(' | '),
      }),
    ),
    systemRole: Type.Optional(
      Type.Enum(SystemRoleDto, {
        description: Object.values(SystemRoleDto).join(' | '),
      }),
    ),
  }),
]);
export type UserSearchQuery = Static<typeof userSearchQuerySchema>;
