import React from 'react';

const Image = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  (props, ref) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...props} ref={ref} />
    );
  }
);
Image.displayName = 'Image';

export default Image;
