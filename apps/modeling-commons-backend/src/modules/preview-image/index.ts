declare global {
  export interface Dependencies {
    previewImageService: ReturnType<
      typeof import('#src/modules/preview-image/preview-image.service.ts').default
    >;
  }
}
