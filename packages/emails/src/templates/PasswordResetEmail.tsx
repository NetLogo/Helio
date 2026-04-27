import { Link, Text } from '@react-email/components';
import { CTAButton } from '../components/CTAButton.js';
import { Layout } from '../components/Layout.js';
import { PREVIEW_BRANDING, type Branding } from '../types/branding.js';

export interface PasswordResetEmailProps {
  branding: Branding;
  userName: string;
  resetLink: string;
}

export function PasswordResetEmail({
  branding,
  userName,
  resetLink,
}: PasswordResetEmailProps) {
  return (
    <Layout branding={branding} preview={`Reset your ${branding.productName} password.`}>
      <Text>Hi {userName},</Text>
      <Text>
        We received a request to reset your password for your {branding.productName}{' '}
        account. Click the button below to set a new password:
      </Text>
      <CTAButton href={resetLink} brandColor={branding.brandColor}>
        Reset Password
      </CTAButton>
      <Text style={{ fontSize: '13px', color: '#6b7280' }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <Link href={resetLink} style={{ color: branding.brandColor, wordBreak: 'break-all' }}>
          {resetLink}
        </Link>
      </Text>
      <Text>
        If you did not request a password reset, you can safely ignore this email — your
        password will remain unchanged.
      </Text>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

PasswordResetEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  resetLink: 'https://acme.com/reset?token=abc123',
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
