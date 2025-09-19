import ImageTagElement from '@repo/ui/HOC/Image';
import { Components } from 'react-markdown';

const Image: Components['img'] = ({ node, ...props }) => {
  return <ImageTagElement {...props} alt={props.alt || 'Screenshot'} />;
};

export default Image;
