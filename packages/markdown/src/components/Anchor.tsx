import AnchorTagElement from '@repo/ui/HOC/Anchor';
import type { Components } from 'react-markdown';

const Anchor: Components['a'] = (props) => {
  // eslint-disable-next-line react/prop-types, @typescript-eslint/no-unused-vars
  const { node, ...rest } = props;
  // eslint-disable-next-line react/prop-types
  const href = props.href ?? '';

  if (/^https?:\/\//.test(href)) {
    return <AnchorTagElement {...rest} target="_blank" rel="noopener noreferrer" />;
  }

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
