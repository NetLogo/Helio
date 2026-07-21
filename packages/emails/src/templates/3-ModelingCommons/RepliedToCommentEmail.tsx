import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { CTAButton } from '../../components/CTAButton.js';
import { Layout } from '../../components/Layout.js';
import { ModelCard, type EmailModel } from '../../components/ModelCard.js';
import { Branding, PREVIEW_BRANDING } from '../../types/branding.js';

export interface RepliedToCommentEmailProps {
  branding: Branding;
  userName: string;
  replierName: string;
  model: EmailModel;
  replyPreview: string;
  commentUrl: string;
  unsubscribeUrl: string;
}

function RepliedToCommentEmail({
  branding,
  userName,
  replierName,
  model,
  replyPreview,
  commentUrl,
  unsubscribeUrl,
}: RepliedToCommentEmailProps) {
  return (
    <Layout
      branding={branding}
      preview={`${replierName} replied to your comment on ${model.name}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text>Hi {userName},</Text>
      <Text>
        <strong>{replierName}</strong> replied to your comment on:
      </Text>
      <ModelCard model={model} brandColor={branding.brandColor} />
      <Text style={quote}>{replyPreview}</Text>
      <Section style={buttonRow}>
        <CTAButton href={commentUrl} brandColor={branding.brandColor}>
          View reply
        </CTAButton>
      </Section>
      <Text>
        Best regards,
        <br />
        The {branding.productName} Team
      </Text>
    </Layout>
  );
}

const quote: React.CSSProperties = {
  borderLeft: '3px solid #e5e7eb',
  paddingLeft: '12px',
  color: '#374151',
  fontStyle: 'italic',
  margin: '8px 0 16px',
};

const buttonRow: React.CSSProperties = {
  textAlign: 'center',
  margin: '24px 0',
};

RepliedToCommentEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  replierName: 'Marco',
  model: {
    name: 'Wolf Sheep Predation',
    url: 'https://modelingcommons.org/models/123',
    imageUrl: 'https://placehold.co/72x72/4e3bdd/ffffff?text=Model',
    authorName: 'Sam',
  },
  replyPreview: 'Good question — I calibrated them against the classic Lotka-Volterra curves.',
  commentUrl: 'https://modelingcommons.org/models/123/comments/789',
  unsubscribeUrl: 'https://modelingcommons.org/unsubscribe?token=abc',
} satisfies RepliedToCommentEmailProps;

export default RepliedToCommentEmail;
