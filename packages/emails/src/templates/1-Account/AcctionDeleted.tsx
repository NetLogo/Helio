import { Text } from '@react-email/components';
import { Layout } from '../../components/Layout.js';
import SupportLine from '../../components/SupportLine.js';
import { BasicProps } from '../../types/account.js';
import { PREVIEW_BRANDING } from '../../types/branding.js';



function AccountDeletedEmail({ branding, userName }: BasicProps) {
  return (
    <Layout
      branding={branding}
      preview={`Your ${branding.productName} account has been deleted.`}
    >
      <Text>Hi {userName},</Text>
      <Text>Your {branding.productName} account has been successfully deleted.</Text>
      <Text>
        If you did not request this deletion, please contact our support team
        immediately at <SupportLine branding={branding} />.
      </Text>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

AccountDeletedEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
} satisfies BasicProps;

export default AccountDeletedEmail;
