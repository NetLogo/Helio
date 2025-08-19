import { Components } from 'react-markdown';

const Image: Components['img'] = ({ node, ...props }) => {
  return (
    <img {...props} className="screenshot" alt={props.alt || 'Screenshot'} />
  );
};

export default Image;
