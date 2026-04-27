import { Link } from '@react-email/components';
import { Branding } from '../types/branding.js';

function SupportLine({ branding }: { branding: Branding }) {
  return (
    <>
      <Link
        href={`mailto:${branding.supportEmail}`}
        style={{ color: branding.brandColor }}
      >
        {branding.supportEmail}
      </Link>
    </>
  );
}

export default SupportLine;
