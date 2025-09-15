import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faLink } from '@fortawesome/free-solid-svg-icons';
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
        <FontAwesomeIcon icon={faLink} className="mr-1" />
        {children}
      </a>
    );
  }
  return <NextLink {...props}>{children}</NextLink>;
};

export default Anchor;
export type { AnchorProps };
