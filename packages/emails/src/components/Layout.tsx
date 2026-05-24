import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import type { Branding } from '../types/branding.js';

interface LayoutProps {
  branding: Branding;
  preview: string;
  unsubscribeUrl?: string;
  children: React.ReactNode;
}

export function Layout({ branding, preview, unsubscribeUrl, children }: LayoutProps) {
  const year = new Date().getFullYear();

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={{ ...header, backgroundColor: branding.brandColor }}>
            {branding.logoUrl ? <Img
              src={branding.logoUrl}
              alt={branding.productName}
              height={32}
              style={logo}
            /> : <Text style={{ color: '#ffffff', fontSize: '20px', fontWeight: 'bold' }}>{branding.productName}</Text>}
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {year} {branding.productName}. All rights reserved.
            </Text>
            <Text style={footerText}>
              Need help? Contact{' '}
              <Link href={`mailto:${branding.supportEmail}`} style={footerLink}>
                {branding.supportEmail}
              </Link>
              {unsubscribeUrl ? (
                <>
                  {' · '}
                  <Link href={unsubscribeUrl} style={footerLink}>
                    Unsubscribe
                  </Link>
                </>
              ) : null}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: '#f4f5f7',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  margin: '0 auto',
  maxWidth: '600px',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  marginTop: '24px',
  marginBottom: '24px',
};

const header: React.CSSProperties = {
  padding: '24px 32px',
};

const logo: React.CSSProperties = {
  display: 'block',
  border: 0,
  height: '32px',
};

const content: React.CSSProperties = {
  padding: '32px',
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '1.6',
};

const hr: React.CSSProperties = {
  borderColor: '#eeeeee',
  margin: 0,
};

const footer: React.CSSProperties = {
  padding: '20px 32px',
  backgroundColor: '#fafafa',
  textAlign: 'center',
};

const footerText: React.CSSProperties = {
  color: '#888888',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '4px 0',
};

const footerLink: React.CSSProperties = {
  color: '#888888',
  textDecoration: 'underline',
};
