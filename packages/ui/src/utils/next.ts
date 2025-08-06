// If we can import next/link, import it
// Otherwise, use a fallback component
// We do not know if we are in a Next.js environment or not
import React from 'react';

// React component or string
let Link: React.ComponentType<any> | string = 'a';
try {
  Link = require('next/link').default || require('next/link');
} catch (error) {
  // Pass
}

export { Link };
