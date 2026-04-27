import { Text } from '@react-email/components';
import { Layout } from '../../components/Layout.js';
import { Branding, PREVIEW_BRANDING } from '../../types/branding.js';

export interface NotificationEmailProps {
  branding: Branding;
  userName: string;
  notificationContent: string;
  unsubscribeUrl: string;
}

function NotificationEmail({
  branding,
  userName,
  notificationContent,
  unsubscribeUrl,
}: NotificationEmailProps) {
  return (
    <Layout
      branding={branding}
      preview={`New notification from ${branding.productName}.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text>Hi {userName},</Text>
      <Text>{notificationContent}</Text>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

NotificationEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  notificationContent: 'Your weekly report is ready to view.',
  unsubscribeUrl: 'https://acme.com/unsubscribe?token=abc',
} satisfies NotificationEmailProps;

export default NotificationEmail;
