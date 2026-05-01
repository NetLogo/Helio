import { Link, Text } from '@react-email/components';
import { CTAButton } from '../components/CTAButton.js';
import { Layout } from '../components/Layout.js';
import { PREVIEW_BRANDING, type Branding } from '../types/branding.js';

export interface VerifyEmailProps {
  branding: Branding;
  userName: string;
  verificationLink: string;
}

export function VerifyEmail({ branding, userName, verificationLink }: VerifyEmailProps) {
  return (
    <Layout
      branding={branding}
      preview={`Confirm your email to activate your ${branding.productName} account.`}
    >
      <Text>Hi {userName},</Text>
      <Text>
        Thank you for signing up for {branding.productName}! Please verify your email
        address by clicking the button below:
      </Text>
      <CTAButton href={verificationLink} brandColor={branding.brandColor}>
        Verify Email
      </CTAButton>
      <Text style={{ fontSize: '13px', color: '#6b7280' }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <Link href={verificationLink} style={{ color: branding.brandColor, wordBreak: 'break-all' }}>
          {verificationLink}
        </Link>
      </Text>
      <Text>If you did not create an account, you can safely ignore this email.</Text>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

VerifyEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  verificationLink: 'https://modelingcommons.org/verify?token=abc123',
} satisfies VerifyEmailProps;

export default VerifyEmail;
