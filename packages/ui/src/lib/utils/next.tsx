// If we can import next/link, import it
// Otherwise, use a fallback component
// We do not know if we are in a Next.js environment or not
import React from 'react';

// React component or string
let NextLink: React.ComponentType<any> | undefined = undefined;
try {
  NextLink = require('next/link').default || require('next/link');
} catch (error) {
  // Pass. We are not in a Next.js environment
}

const FallbackLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a {...props} />
);
const Link = NextLink || FallbackLink;
export { Link };
