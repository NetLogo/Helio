import { Column, Img, Link, Row, Section, Text } from '@react-email/components';
import * as React from 'react';

export interface EmailModel {
  name: string;
  url: string;
  imageUrl?: string;
  authorName?: string;
}

interface ModelCardProps {
  model: EmailModel;
  brandColor: string;
}

/**
 * Reusable preview of a Modeling Commons model: thumbnail, linked title, and
 * optional author. Shared by the discussion emails so every model reference
 * looks the same.
 */
export function ModelCard({ model, brandColor }: ModelCardProps) {
  return (
    <Section style={card}>
      <Row>
        {model.imageUrl ? (
          <Column style={thumbCol}>
            <Link href={model.url}>
              <Img
                src={model.imageUrl}
                alt={model.name}
                width={72}
                height={72}
                style={thumb}
              />
            </Link>
          </Column>
        ) : null}
        <Column style={infoCol}>
          <Link href={model.url} style={{ ...title, color: brandColor }}>
            {model.name}
          </Link>
          {model.authorName ? <Text style={author}>by {model.authorName}</Text> : null}
        </Column>
      </Row>
    </Section>
  );
}

const card: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #eeeeee',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const thumbCol: React.CSSProperties = {
  width: '88px',
  verticalAlign: 'top',
};

const thumb: React.CSSProperties = {
  borderRadius: '6px',
  border: '1px solid #eeeeee',
  objectFit: 'cover',
  display: 'block',
};

const infoCol: React.CSSProperties = {
  verticalAlign: 'top',
};

const title: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
};

const author: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '4px 0 0',
};
