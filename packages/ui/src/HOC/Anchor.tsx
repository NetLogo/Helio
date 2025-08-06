import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faLink } from '@fortawesome/free-solid-svg-icons';

import { Link } from '@/utils/next';

type AnchorProps = {
  external?: boolean;
  children?: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

const Anchor = ({ external, children, ...props }: AnchorProps) => {
  if (external) {
    return (
      <Link target="_blank" rel="noopener noreferrer" {...props}>
        <FontAwesomeIcon icon={faLink} className="mr-1" />
        {children}
      </Link>
    );
  }
  return <Link {...props}>{children}</Link>;
};

export default Anchor;
export type { AnchorProps };
