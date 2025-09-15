import { applyNextBasePathToSrcSet } from '@repo/next-utils/url';
import React from 'react';
import { applyNextBasePath, isNextEnvironment } from '../lib/utils/next';

const Image = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  (props, ref) => {
    let src = props.src;
    let srcSet = props.srcSet;
    if (isNextEnvironment()) {
      src = props.src ? applyNextBasePath(props.src) : undefined;
      srcSet = props.srcSet ? applyNextBasePathToSrcSet(props.srcSet) : undefined;
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...props} ref={ref} src={src} srcSet={srcSet} />
    );
  }
);
Image.displayName = 'Image';

export default Image;
