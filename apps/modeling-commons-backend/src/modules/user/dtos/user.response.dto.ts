import { Type, type Static } from 'typebox';
import { baseResponseDtoSchema } from '#src/shared/api/response.base.ts';

export const userResponseDtoSchema = Type.Intersect([
  baseResponseDtoSchema,
  Type.Object({
    name: Type.Union([Type.String({ maxLength: 255, examples: ['John Doe'] }), Type.Null()]),
    isProfilePublic: Type.Boolean(),
    image: Type.Union([
      Type.String({
        description: "The URL of the user's profile image",
        examples: ['https://example.com/profile.jpg'],
        format: 'uri',
      }),
      Type.Null(),
    ]),
    emailVerified: Type.Optional(
      Type.Boolean({
        description: 'Indicates whether the user has verified their email address',
      }),
    ),
    systemRole: Type.Optional(Type.String({ description: 'admin | moderator | user' })),
    userKind: Type.Optional(Type.String({ description: 'student | teacher | researcher | other' })),
    bio: Type.Optional(
      Type.String({
        description: 'A short biography of the user',
        maxLength: 1000,
        examples: ['Modeler and educator based in New York.'],
      }),
    ),
    country: Type.Optional(
      Type.String({
        description: 'The user’s country of residence, if they choose to provide it',
        maxLength: 100,
        examples: ['US'],
      }),
    ),
    socialLinks: Type.Optional(
      Type.Array(
        Type.Object({
          rawValue: Type.String({
            description: 'The raw URL provided by the user for a social link',
            examples: ['https://twitter.com/johndoe'],
            maxLength: 2048,
          }),
          type: Type.String({
            description: 'The type of social link, if it can be inferred from the URL',
            examples: ['twitter', 'linkedin', 'github', 'facebook', 'instagram', 'other'],
          }),
        }),
      ),
    ),
    dob: Type.Optional(
      Type.Union([
        Type.String({
          description: 'The user’s date of birth, if they choose to provide it',
          format: 'date',
        }),
        Type.Null(),
      ]),
    ),
    affiliation: Type.Optional(
      Type.String({
        description: 'The user’s affiliation, if they choose to provide it',
        maxLength: 255,
        examples: [
          'NetLogo Team, Center for Connected Learning and Computer-Based Modeling, Northwestern University',
        ],
      }),
    ),
    onboardedAt: Type.Optional(
      Type.Union([Type.String({ format: 'date-time' }), Type.Null()], {
        description: 'Timestamp when the user completed onboarding, null if not yet onboarded',
      }),
    ),
  }),
]);

export type UserResponseDto = Static<typeof userResponseDtoSchema>;
