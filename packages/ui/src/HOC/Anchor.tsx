import type { JSX } from 'react';
import { FaLink } from 'react-icons/fa';

import { Link } from '../lib/utils/next';

type AnchorProps = {
  external?: boolean;
  children?: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

const Anchor = ({ external, children, ...props }: AnchorProps): JSX.Element => {
  if (external === true) {
    return (
      // Why not <Link>?
      // Because <Link> is only useful for internal navigation.
      <a target="_blank" rel="noopener noreferrer" {...props}>
        <FaLink className="mr-1 inline" />
        {children}
      </a>
    );
  }
  return <Link {...props}>{children}</Link>;
};

export default Anchor;
export type { AnchorProps };
