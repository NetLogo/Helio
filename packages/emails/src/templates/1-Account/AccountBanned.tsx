import { Text } from '@react-email/components';
import { Layout } from '../../components/Layout.js';
import SupportLine from '../../components/SupportLine.js';
import { BasicProps } from '../../types/account.js';
import { PREVIEW_BRANDING } from '../../types/branding.js';

function AccountBannedEmail({ branding, userName }: BasicProps) {
  return (
    <Layout
      branding={branding}
      preview={`Your ${branding.productName} account has been banned.`}
    >
      <Text>Hi {userName},</Text>
      <Text>
        We&apos;re writing to inform you that your {branding.productName} account has
        been banned due to a violation of our terms of service.
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

AccountBannedEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
} satisfies BasicProps;

export default AccountBannedEmail;
