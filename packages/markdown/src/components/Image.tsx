import ImageTagElement from '@repo/ui/HOC/Image';
import { isNonEmptyString } from '@repo/utils/std/string';
import type { Components } from 'react-markdown';

// eslint-disable-next-line @typescript-eslint/no-unused-vars, react/prop-types
const Image: Components['img'] = ({ node, ...props }) => {
  return (
    // eslint-disable-next-line react/prop-types
    <ImageTagElement {...props} alt={isNonEmptyString(props.alt) ? props.alt : 'Screenshot'} />
  );
};

export default Image;
