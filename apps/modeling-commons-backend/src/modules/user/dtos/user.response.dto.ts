import { Type, type Static } from 'typebox';
import { baseResponseDtoSchema } from '#src/shared/api/response.base.ts';

export const userResponseDtoSchema = Type.Intersect([
  baseResponseDtoSchema,
  Type.Object({
    name: Type.Union([Type.String({ maxLength: 255, examples: ['John Doe'] }), Type.Null()]),
    email: Type.Union([
      Type.String({
        description: "The user's email address",
        examples: ['john.doe@example.com'],
        minLength: 5,
        maxLength: 1024,
        format: 'email',
      }),
      Type.Null(),
    ]),
    emailVerified: Type.Boolean({
      description: 'Indicates whether the user has verified their email address',
    }),
    image: Type.Union([
      Type.String({
        description: "The URL of the user's profile image",
        examples: ['https://example.com/profile.jpg'],
        format: 'url',
      }),
      Type.Null(),
    ]),
    systemRole: Type.String({ description: 'admin | moderator | user' }),
    userKind: Type.String({ description: 'student | teacher | researcher | other' }),
    isProfilePublic: Type.Boolean(),
  }),
]);

export type UserResponseDto = Static<typeof userResponseDtoSchema>;
