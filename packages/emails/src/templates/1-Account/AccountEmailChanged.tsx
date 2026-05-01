import { Text } from '@react-email/components';
import { Layout } from '../../components/Layout.js';
import SupportLine from '../../components/SupportLine.js';
import { BasicProps } from '../../types/account.js';
import { PREVIEW_BRANDING } from '../../types/branding.js';

interface AccountEmailChangedProps extends BasicProps {
  newEmail: string;
}
function AccountEmailChanged({ branding, userName, newEmail }: AccountEmailChangedProps) {
  return (
    <Layout
      branding={branding}
      preview={`Your ${branding.productName} account email address has been changed.`}
    >
      <Text>Hi {userName},</Text>
      <Text>
        Your email address associated with your {branding.productName} account has been successfully changed to <strong>{newEmail}</strong>.
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
    </Layout >
  );
}

AccountEmailChanged.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  newEmail: 'jane.doe@example.com',
} satisfies AccountEmailChangedProps;

export default AccountEmailChanged;
