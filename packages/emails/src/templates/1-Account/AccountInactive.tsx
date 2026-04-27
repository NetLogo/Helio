import { Text } from '@react-email/components';
import { Layout } from '../../components/Layout.js';
import SupportLine from '../../components/SupportLine.js';
import { BasicProps } from '../../types/account.js';
import { PREVIEW_BRANDING } from '../../types/branding.js';


export interface AccountInactiveEmailProps extends BasicProps {
  inactivityPeriod: string;
}

function AccountInactiveEmail({
  branding,
  userName,
  inactivityPeriod,
}: AccountInactiveEmailProps) {
  return (
    <Layout
      branding={branding}
      preview={`Your ${branding.productName} account has been inactive for ${inactivityPeriod}.`}
    >
      <Text>Hi {userName},</Text>
      <Text>
        We noticed that your {branding.productName} account has been inactive for{' '}
        {inactivityPeriod}.
      </Text>
      <Text>
        If you&apos;d like to keep your account active, just log in and use our
        services. If you have any questions, feel free to reach out to{' '}
        <SupportLine branding={branding} />.
      </Text>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

AccountInactiveEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  inactivityPeriod: '90 days',
} satisfies AccountInactiveEmailProps;

export default AccountInactiveEmail;
