import { FaLink } from 'react-icons/fa';

import { Link as NextLink } from '../lib/utils/next';
type AnchorProps = {
  external?: boolean;
  children?: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

const Anchor = ({ external, children, ...props }: AnchorProps) => {
  if (external) {
    return (
      // Why not <Link>?
      // Because <Link> is only useful for internal navigation.
      <a target="_blank" rel="noopener noreferrer" {...props}>
        <FaLink className="mr-1 inline" />
        {children}
      </a>
    );
  }
  return <NextLink {...props}>{children}</NextLink>;
};

export default Anchor;
export type { AnchorProps };
