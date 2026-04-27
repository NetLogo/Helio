import { Button as ReButton } from '@react-email/components';
import * as React from 'react';

interface CTAButtonProps {
  href: string;
  brandColor: string;
  children: React.ReactNode;
}

export function CTAButton({ href, brandColor, children }: CTAButtonProps) {
  return (
    <ReButton
      href={href}
      style={{
        backgroundColor: brandColor,
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '6px',
        fontSize: '15px',
        fontWeight: 600,
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {children}
    </ReButton>
  );
}
