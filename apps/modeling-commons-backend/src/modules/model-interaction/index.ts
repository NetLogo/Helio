import type { ModelInteractionRepository } from '#src/modules/model-interaction/database/model-interaction.repository.port.ts';
import type modelInteractionDomain from '#src/modules/model-interaction/domain/model-interaction.domain.ts';

declare global {
  export interface Dependencies {
    modelInteractionRepository: ModelInteractionRepository;
    modelInteractionDomain: ReturnType<typeof modelInteractionDomain>;
    modelInteractionService: ReturnType<
      typeof import('#src/modules/model-interaction/model-interaction.service.ts').default
    >;
  }
}
