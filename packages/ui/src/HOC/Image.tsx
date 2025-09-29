import React from 'react';

import { saveToPublicDir } from '@repo/next-utils/files';
import { getBlurredPlaceholder, getImageBuffer, getImageDimensions } from '@repo/next-utils/image';
import { createDefault } from '@repo/utils/algebraic/monads/defaults';
import { defined, truthy } from '@repo/utils/std/null';

import type { MaybeNextImageProps } from '../lib/utils/next';
import { Image as Im, isNextEnvironment } from '../lib/utils/next';

type ImageProps = MaybeNextImageProps & {
  nextOptions?: {
    /* Path segments from root (usually [process.cwd(), 'public']) to the image file. */
    root?: Array<string>;
    /* Whether to copy the image to the public directory during build. */
    copy?: boolean;
    /* The directory within the public directory to copy the image to. */
    publicSubdir?: Array<string>;
    /* Base path to prepend to the src if it is not absolute. */
    basePath?: string;
    /* Whether to allow sharing images between different pages.
     * If true and the same image is used on multiple pages,
     * it will only be copied once to the public directory.
     */
    shareImages?: boolean;
  };
};

type ImageCache = Map<string, string>;
const imageCache = (function (): { getInstance: () => ImageCache } {
  let instance: ImageCache | null = null;

  return {
    getInstance: function (): ImageCache {
      instance ??= new Map<string, string>();
      return instance;
    },
  };
})();

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  async ({ nextOptions: _nextOptions, ...props }: ImageProps, ref) => {
    const nextOptions = createDefault({
      root: [process.cwd(), 'public'],
      copy: false,
      publicSubdir: [] as Array<string>,
      basePath: undefined as string | undefined,
      shareImages: false,
    })(_nextOptions);

    let src = props.src ?? '';
    if (src.startsWith('http') || src.startsWith('data:')) return <img {...props} ref={ref} />;

    let width = props.width;
    let height = props.height;

    const nextProps: MaybeNextImageProps = {};
    if (isNextEnvironment()) {
      if (!src.startsWith('/') && !src.startsWith('.')) {
        src = `/${src}`;
      }

      try {
        const buffer = await getImageBuffer(src, nextOptions.root);
        if (!buffer) throw new Error(`Could not load image at path: ${src}`);

        if (truthy(nextOptions.copy)) {
          const cache = imageCache.getInstance();
          if (truthy(nextOptions.shareImages) && cache.has(src)) {
            src = cache.get(src) ?? src;
          } else {
            const oldSrc = src;
            const imageBasename = src.split('/').pop()?.split('?')[0] ?? 'image';
            const publicSubdir = nextOptions.publicSubdir ?? [];
            const publicPath = [...publicSubdir, imageBasename];
            saveToPublicDir(publicPath, buffer);
            src = `/${publicPath.join('/')}`;

            if (truthy(nextOptions.shareImages)) cache.set(oldSrc, src);
          }
        }

        if (defined(nextOptions.basePath) && src.startsWith('/')) {
          src = `${nextOptions.basePath}${src}`;
        }

        if (!defined(height) || !defined(width)) {
          const dimensions = await getImageDimensions(buffer);
          if (defined(dimensions.width) && defined(dimensions.height)) {
            width = dimensions.width;
            height = dimensions.height;
          } else {
            throw new Error('Image dimensions could not be determined');
          }
        }

        if (parseInt(width.toString()) > 40 && parseInt(height.toString()) > 40) {
          const blurPlaceholder = await getBlurredPlaceholder(buffer);
          nextProps.placeholder = defined(blurPlaceholder) ? 'blur' : 'empty';
          nextProps.blurDataURL = blurPlaceholder ?? undefined;
        }
      } catch (err: unknown) {
        console.warn(`Could not process image: ${src}. Error: ${err}`);

        if ([width, height].every((v) => !defined(v))) {
          return <img {...props} ref={ref} />;
        }
      }
    }

    return <Im {...props} src={src} width={width} height={height} {...nextProps} ref={ref} />;
  }
);
Image.displayName = 'Image';

export default Image;
