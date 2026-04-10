import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { UserEntity, UserPublicView } from '#src/modules/user/domain/user.types.ts';
import type { UserRecord } from '#src/modules/user/user.mapper.ts';
import type { UserResponseDto } from '#src/modules/user/dtos/user.response.dto.ts';
import type { UserPublicResponseDto } from '#src/modules/user/dtos/user.public.response.dto.ts';
import type { UserRepository } from '#src/modules/user/database/user.repository.port.ts';
import type userDomain from '#src/modules/user/domain/user.domain.ts';

declare global {
  export interface Dependencies {
    userMapper: Mapper<UserEntity, UserRecord, UserResponseDto> & {
      toPublicResponse: (view: UserPublicView) => UserPublicResponseDto;
    };
    userRepository: UserRepository;
    userDomain: ReturnType<typeof userDomain>;
    userService: ReturnType<typeof import('#src/modules/user/user.service.ts').default>;
  }
}
