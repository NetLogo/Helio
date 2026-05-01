import { Link, Text } from '@react-email/components';
import { CTAButton } from '../../components/CTAButton.js';
import { Layout } from '../../components/Layout.js';
import SupportLine from '../../components/SupportLine.js';
import { BasicProps } from '../../types/account.js';
import { PREVIEW_BRANDING } from '../../types/branding.js';

interface AccountEmailChangeRequestProps extends BasicProps {
  newEmail: string;
  approveLink: string;
}
function AccountEmailChangeRequest({ branding, userName, newEmail, approveLink }: AccountEmailChangeRequestProps) {
  return (
    <Layout
      branding={branding}
      preview={`Approve your email change for your ${branding.productName} account.`}
    >
      <Text>Hi {userName},</Text>
      <Text>
        We received a request to change the email address associated with your {branding.productName} account to <strong>{newEmail}</strong>. Please click the button below to approve this change:
      </Text>
      <CTAButton href={approveLink} brandColor={branding.brandColor}>
        Approve Email Change
      </CTAButton>
      <Text style={{ fontSize: '13px', color: '#6b7280' }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <Link href={approveLink} style={{ color: branding.brandColor, wordBreak: 'break-all' }}>
          {approveLink}
        </Link>
      </Text>
      <Text>
        If you have any questions or believe this was a mistake, please contact our
        support team at <SupportLine branding={branding} />.
      </Text>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

AccountEmailChangeRequest.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  newEmail: 'janedoe@email.com',
  approveLink: 'https://modelingcommons.org/approve-email-change?token=abc123',
} satisfies AccountEmailChangeRequestProps;

export default AccountEmailChangeRequest;
