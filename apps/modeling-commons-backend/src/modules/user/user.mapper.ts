import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { UserEntity, SystemRole, UserKind } from '#src/modules/user/domain/user.types.ts';
import type { UserResponseDto } from '#src/modules/user/dtos/user.response.dto.ts';

export type UserRecord = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  systemRole: SystemRole;
  userKind: UserKind;
  isProfilePublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export default function userMapper(): Mapper<UserEntity, UserRecord, UserResponseDto> {
  return {
    toDomain(record: UserRecord): UserEntity {
      return {
        id: record.id,
        name: record.name,
        email: record.email,
        emailVerified: record.emailVerified,
        image: record.image,
        systemRole: record.systemRole,
        userKind: record.userKind,
        isProfilePublic: record.isProfilePublic,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
      };
    },

    toResponse(entity: UserEntity): UserResponseDto {
      return {
        id: entity.id,
        name: entity.name,
        email: entity.email,
        emailVerified: entity.emailVerified,
        image: entity.image,
        systemRole: entity.systemRole,
        userKind: entity.userKind,
        isProfilePublic: entity.isProfilePublic,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
      };
    },

    toPersistence(entity: UserEntity): UserRecord {
      return {
        id: entity.id,
        name: entity.name,
        email: entity.email,
        emailVerified: entity.emailVerified,
        image: entity.image,
        systemRole: entity.systemRole,
        userKind: entity.userKind,
        isProfilePublic: entity.isProfilePublic,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        deletedAt: entity.deletedAt,
      };
    },
  };
}
