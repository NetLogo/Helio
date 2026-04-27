import { Link, Text } from '@react-email/components';
import { Layout } from '../components/Layout.js';
import { PREVIEW_BRANDING, type Branding } from '../types/branding.js';

export interface WelcomeEmailProps {
  branding: Branding;
  userName: string;
}

export function WelcomeEmail({ branding, userName }: WelcomeEmailProps) {
  return (
    <Layout branding={branding} preview={`Welcome aboard ${branding.productName}.`}>
      <Text>Hi {userName},</Text>
      <Text>
        Welcome to {branding.productName}! We&apos;re excited to have you on board.
      </Text>
      <Text>
        If you have any questions or need assistance getting started, our support team
        is here to help — just reply to this email or reach us at{' '}
        <Link
          href={`mailto:${branding.supportEmail}`}
          style={{ color: branding.brandColor }}
        >
          {branding.supportEmail}
        </Link>
        .
      </Text>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

WelcomeEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
