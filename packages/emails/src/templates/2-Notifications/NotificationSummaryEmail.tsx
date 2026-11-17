import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { Layout } from '../../components/Layout.js';
import { Branding, PREVIEW_BRANDING } from '../../types/branding.js';

export interface NotificationSummaryItem {
  text: string;
  url: string;
}

export interface NotificationSummaryEmailProps {
  branding: Branding;
  userName: string;
  notifications: NotificationSummaryItem[];
  moreCount: number;
  feedUrl: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
}

function NotificationSummaryEmail({
  branding,
  userName,
  notifications,
  moreCount,
  feedUrl,
  unsubscribeUrl,
  preferencesUrl,
}: NotificationSummaryEmailProps) {
  const count = notifications.length + moreCount;
  return (
    <Layout
      branding={branding}
      preview={`You have ${count} new notification${count === 1 ? '' : 's'}.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text>Hi {userName},</Text>
      <Text>Here is your notification summary:</Text>
      <Section>
        <ul style={list}>
          {notifications.map((item, index) => (
            <li key={index} style={listItem}>
              <Link href={item.url}>{item.text}</Link>
            </li>
          ))}
        </ul>
        {moreCount > 0 && (
          <Text>
            <Link href={feedUrl}>and {moreCount} more</Link>
          </Text>
        )}
      </Section>
      <Text>
        You can change how often we email you in your{' '}
        <Link href={preferencesUrl}>notification preferences</Link>.
      </Text>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

const list: React.CSSProperties = {
  margin: '0 0 16px',
  paddingLeft: '20px',
};

const listItem: React.CSSProperties = {
  marginBottom: '8px',
};

NotificationSummaryEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  notifications: [
    {
      text: 'Marco, Ana, and 3 others commented on Wolf Sheep Predation',
      url: 'https://modelingcommons.org/models/123',
    },
    {
      text: 'Marco commented on Virus on a Network',
      url: 'https://modelingcommons.org/models/124',
    },
  ],
  moreCount: 4,
  feedUrl: 'https://modelingcommons.org/notifications',
  unsubscribeUrl: 'https://modelingcommons.org/unsubscribe?token=abc',
  preferencesUrl: 'https://modelingcommons.org/settings/notifications',
} satisfies NotificationSummaryEmailProps;

export default NotificationSummaryEmail;
