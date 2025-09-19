// If we can import next/link, import it
// Otherwise, use a fallback component
// We do not know if we are in a Next.js environment or not
import type { JSX } from 'react';
import React from 'react';

type ModuleWithDefault<T> = { default: T | null };
// React component or string
type AnchorComponent = React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
let NextLink: AnchorComponent | undefined = undefined;
try {
  NextLink =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('next/link') as ModuleWithDefault<AnchorComponent>).default ??
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('next/link') as AnchorComponent);
} catch {
  // Pass. We are not in a Next.js environment
}

const FallbackLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>): JSX.Element => (
  <a {...props} />
);
const Link = NextLink ?? FallbackLink;
export { Link };

export type MaybeNextImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fill?: boolean;
  loader?: (args: { src: string; width: number; quality?: number }) => string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  loading?: 'lazy' | 'eager' | 'auto';
  overrideSrc?: string;
};

type ImageComponent = React.FC<MaybeNextImageProps>;
let NextImage: ImageComponent | undefined = undefined;
try {
  NextImage =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('next/image') as ModuleWithDefault<ImageComponent>).default ??
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('next/image') as ImageComponent);
} catch {
  // Pass. We are not in a Next.js environment
}

const FallbackImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  (props, ref) => {
    return <img ref={ref} {...props} />;
  }
);
FallbackImage.displayName = 'FallbackImage';

const Image = NextImage ?? FallbackImage;
export { Image };

export { isNextEnvironment } from '@repo/next-utils/detect-environment';
