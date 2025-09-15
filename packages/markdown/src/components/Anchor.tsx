import AnchorTagElement from '@repo/ui/HOC/Anchor';
import { Components } from 'react-markdown';

const Anchor: Components['a'] = ({ node, ...props }) => {
  const href = props.href || '';
  // external links
  if (/^https?:\/\//.test(href)) {
    return <AnchorTagElement {...props} target="_blank" rel="noopener noreferrer" />;
  }
  // docs link rewrite
  if (href.startsWith('https://ccl.northwestern.edu/netlogo/docs/')) {
    return (
      <AnchorTagElement
        {...props}
        href={href.replace('https://ccl.northwestern.edu/netlogo/docs/', '')}
      />
    );
  }
  return <AnchorTagElement {...props} />;
};

export default Anchor;
