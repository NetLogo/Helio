import type { UserRecord } from './database/user.record.ts';
import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { UserEntity, UserPublicView } from '#src/modules/user/domain/user.types.ts';
import type { UserResponseDto } from '#src/modules/user/dtos/user.response.dto.ts';

export default function userMapper(): Mapper<UserEntity, UserRecord, UserResponseDto> & {
  toPublicResponse: (view: UserPublicView) => UserResponseDto;
} {
  return {
    toDomain(record: UserRecord): UserEntity {
      let socialLinks: UserEntity['socialLinks'] = null;
      if (record.socialLinks) {
        try {
          socialLinks = JSON.parse(record.socialLinks as string);
        } catch (error) {
          // If parsing fails, log the error and keep socialLinks as null
          console.error('Error parsing socialLinks for user', { userId: record.id, error });
        }
      }

      return {
        ...record,
        socialLinks,
        onboardedAt: record.onboardedAt ? new Date(record.onboardedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
      };
    },

    toResponse(entity: UserEntity): UserResponseDto {
      return {
        id: entity.id,
        name: entity.name,
        emailVerified: entity.emailVerified,
        image: entity.image,
        systemRole: entity.systemRole,
        userKind: entity.userKind,
        isProfilePublic: entity.isProfilePublic,
        dob: entity.dob ? entity.dob.toISOString().split('T')[0] : null, // Format as YYYY-MM-DD
        affiliation: entity.affiliation ?? undefined,
        bio: entity.bio ?? undefined,
        country: entity.country ?? undefined,
        socialLinks: entity.socialLinks as unknown as UserResponseDto['socialLinks'], // Type assertion since the structure is the same
        onboardedAt: entity.onboardedAt ? entity.onboardedAt.toISOString() : null,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
      };
    },

    toPersistence(entity: UserEntity): UserRecord {
      return {
        ...entity,
      };
    },

    toPublicResponse(view: UserPublicView): UserResponseDto {
      return {
        id: view.id,
        name: view.name,
        isProfilePublic: view.isProfilePublic,
        image: view.image,
        createdAt: view.createdAt.toISOString(),
        updatedAt: view.updatedAt.toISOString(),
      };
    },
  };
}
