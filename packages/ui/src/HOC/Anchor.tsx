import { FaLink } from 'react-icons/fa';

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
  return <a {...props}>{children}</a>;
};

export default Anchor;
export type { AnchorProps };
