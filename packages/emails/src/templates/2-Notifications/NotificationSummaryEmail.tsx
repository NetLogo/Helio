import { Text } from '@react-email/components';
import { Layout } from '../../components/Layout.js';
import { Branding, PREVIEW_BRANDING } from '../../types/branding.js';

export interface NotificationSummaryEmailProps {
  branding: Branding;
  userName: string;
  notifications: string[];
  unsubscribeUrl: string;
}

function NotificationSummaryEmail({
  branding,
  userName,
  notifications,
  unsubscribeUrl,
}: NotificationSummaryEmailProps) {
  const count = notifications.length;
  return (
    <Layout
      branding={branding}
      preview={`You have ${count} new notification${count === 1 ? '' : 's'}.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text>Hi {userName},</Text>
      <Text>Here is your notification summary:</Text>
      <ul style={{ margin: '0 0 16px', paddingLeft: '20px' }}>
        {notifications.map((n, i) => (
          <li key={i} style={{ marginBottom: '8px' }}>
            {n}
          </li>
        ))}
      </ul>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

NotificationSummaryEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  notifications: [
    'Your weekly report is ready.',
    'New comment on your post.',
    'Your subscription renews in 3 days.',
  ],
  unsubscribeUrl: 'https://modelingcommons.org/unsubscribe?token=abc',
} satisfies NotificationSummaryEmailProps;

export default NotificationSummaryEmail;
