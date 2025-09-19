// If we can import next/link, import it
// Otherwise, use a fallback component
// We do not know if we are in a Next.js environment or not
import React from 'react';

// React component or string
let NextLink: React.ComponentType<any> | undefined = undefined;
try {
  NextLink = require('next/link').default || require('next/link');
} catch (error) {
  // Pass. We are not in a Next.js environment
}

const FallbackLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />;
const Link = NextLink || FallbackLink;
export { Link };

let NextImage: React.ComponentType<any> | undefined = undefined;
try {
  NextImage = require('next/image').default || require('next/image');
} catch (error) {
  // Pass. We are not in a Next.js environment
}

const FallbackImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  (props, ref) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={ref} {...props} />
    );
  }
);
FallbackImage.displayName = 'FallbackImage';

const Image = NextImage || FallbackImage;
export { Image };

export { isNextEnvironment } from '@repo/next-utils/detect-environment';
