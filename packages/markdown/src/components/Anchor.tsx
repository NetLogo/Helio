import { Components } from 'react-markdown';

const Anchor: Components['a'] = ({ node, ...props }) => {
  const href = props.href || '';
  // external links
  if (/^https?:\/\//.test(href)) {
    return <a {...props} target="_blank" rel="noopener noreferrer" />;
  }
  // docs link rewrite
  if (href.startsWith('https://ccl.northwestern.edu/netlogo/docs/')) {
    return (
      <a
        {...props}
        href={href.replace('https://ccl.northwestern.edu/netlogo/docs/', '')}
      />
    );
  }
  return <a {...props} />;
};

export default Anchor;
