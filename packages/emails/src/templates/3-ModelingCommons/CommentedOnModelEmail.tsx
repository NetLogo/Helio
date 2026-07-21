import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { CTAButton } from '../../components/CTAButton.js';
import { Layout } from '../../components/Layout.js';
import { ModelCard, type EmailModel } from '../../components/ModelCard.js';
import { Branding, PREVIEW_BRANDING } from '../../types/branding.js';

export interface CommentedOnModelEmailProps {
  branding: Branding;
  userName: string;
  commenterName: string;
  model: EmailModel;
  commentPreview: string;
  commentUrl: string;
  unsubscribeUrl: string;
}

function CommentedOnModelEmail({
  branding,
  userName,
  commenterName,
  model,
  commentPreview,
  commentUrl,
  unsubscribeUrl,
}: CommentedOnModelEmailProps) {
  return (
    <Layout
      branding={branding}
      preview={`${commenterName} commented on ${model.name}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text>Hi {userName},</Text>
      <Text>
        <strong>{commenterName}</strong> commented on your model:
      </Text>
      <ModelCard model={model} brandColor={branding.brandColor} />
      <Text style={quote}>{commentPreview}</Text>
      <Section style={buttonRow}>
        <CTAButton href={commentUrl} brandColor={branding.brandColor}>
          View comment
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

CommentedOnModelEmail.PreviewProps = {
  branding: PREVIEW_BRANDING,
  userName: 'Jane',
  commenterName: 'Marco',
  model: {
    name: 'Wolf Sheep Predation',
    url: 'https://modelingcommons.org/models/123',
    imageUrl: 'https://placehold.co/72x72/4e3bdd/ffffff?text=Model',
    authorName: 'Jane',
  },
  commentPreview: 'This is a great model! How did you tune the reproduction rates?',
  commentUrl: 'https://modelingcommons.org/models/123/comments/456',
  unsubscribeUrl: 'https://modelingcommons.org/unsubscribe?token=abc',
} satisfies CommentedOnModelEmailProps;

export default CommentedOnModelEmail;
