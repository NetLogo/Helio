// @ts-expect-error Linter can't access SCSS
import './globals.scss';

import { Inter } from 'next/font/google';

import type { JSX } from 'react';
import { Env } from '../env';
import { getDocumentedExtensionBuilders } from './(markdown)/[...slug]/(ExtensionDocs)';
import ClientFooter from './footer';
import RootMetadata from './metadata';
import type { NavbarLink } from './nav';
import ClientNavbar from './nav';
import { ScrollToHash } from './scripts';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata = RootMetadata;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const navbarLinks = await getNavbarLinks();
  const selectedVersion = Env.productVersion;

  return (
    <html lang="en">
      <body className={inter.variable}>
        <ScrollToHash />
        <ClientNavbar navbarLinks={navbarLinks} selectedVersion={selectedVersion} />
        {children}
        <ClientFooter />
      </body>
    </html>
  );
}

async function getNavbarLinks(): Promise<Array<NavbarLink>> {
  const extensionList = (await getDocumentedExtensionBuilders()).map((ext) => ({
    title: ext.fullName,
    href: `/extensions/${ext.name.toLowerCase()}.html`,
  }));

  return [
    {
      title: 'Home',
      href: '/',
    },
    {
      title: 'Learn NetLogo',
      href: '/whatis.html',
      children: [
        { title: 'What is NetLogo?', href: '/whatis.html' },
        { title: 'Tutorial #0 Sample Model', href: '/sample.html' },
        { title: 'Tutorial #1 Models', href: '/tutorial1.html' },
        { title: 'Tutorial #2 Commands', href: '/tutorial2.html' },
        { title: 'Tutorial #3 Procedures', href: '/tutorial3.html' },
      ],
    },
    {
      title: 'Documentation',
      href: '/dictionary.html',
      children: [
        { title: 'NetLogo Dictionary', href: '/dictionary.html' },
        { title: 'Interface Guide', href: '/interface.html' },
        { title: 'Interface Tab Guide', href: '/interfacetab.html' },
        { title: 'Info Tab Guide', href: '/infotab.html' },
        { title: 'Code Tab Guide', href: '/codetab.html' },
        { title: 'Programming Guide', href: '/programming.html' },
        { title: 'Transition Guide', href: '/transition.html' },
      ],
    },
    {
      title: 'Advanced Tools',
      href: 'extension-manager.html',
      columns: 2,
      children: [
        { title: 'Extension Manager', href: '/extension-manager.html' },
        { title: 'Shapes Editor', href: '/shapes.html' },
        { title: 'BehaviorSpace', href: '/behaviorspace.html' },
        { title: 'System Dynamics', href: '/systemdynamics.html' },
        { title: 'HubNet', href: '/hubnet.html' },
        { title: 'HubNet Authoring', href: '/hubnet-authoring.html' },
        { title: 'Logging', href: '/logging.html' },
        { title: 'Controlling', href: '/controlling.html' },
        { title: 'Mathematica Link', href: '/mathematica.html' },
        { title: 'NetLogo 3D', href: '/3d.html' },
      ],
    },
    {
      title: 'Extensions',
      href: '/extensions.html',
      columns: 2,
      children: [{ title: 'Extensions Guide', href: '/extensions.html' }, ...extensionList],
    },
    {
      title: 'FAQ',
      href: '/faq.html',
    },
  ];
}
