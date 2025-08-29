'use client';
import NetLogoUserManualSVG from '@repo/ui/assets/brands/NetLogoUserManual.svg';
import Navbar from '@repo/ui/layout/navbar/Navbar';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { isWindowDefined } from '@repo/ui/utils/client';
import { useLayoutEffect, useState } from 'react';

export default function ClientNavbar() {
  const [links, setLinks] = useState(navbarLinks);
  const pathname = usePathname();

  if (isWindowDefined()) {
    useLayoutEffect(() => {
      setLinks((prevLinks) =>
        prevLinks.map((link) => ({
          ...link,
          active: isLinkParentActive(link),
          children: link.children?.map((child) => ({
            ...child,
            active: isSublinkActive(child.href),
          })),
        }))
      );
    }, [pathname]);
  }

  return (
    <Navbar.Client
      id="main-navbar"
      brand={<Image src={NetLogoUserManualSVG} alt="NetLogo" />}
      brandHref="/"
    >
      <Navbar.LinksContainer>
        {links.map((link) => (
          <Navbar.ItemClient
            key={link.title}
            title={link.title}
            href={link.href}
            columns={link.columns}
            active={link.active}
          >
            {link.children &&
              link.children.map((child) => (
                <Navbar.DropdownItem
                  key={child.title}
                  title={child.title}
                  href={child.href}
                  active={child.active}
                />
              ))}
          </Navbar.ItemClient>
        ))}
      </Navbar.LinksContainer>
      <Navbar.ActionsContainer>
        <Navbar.Action
          icon={<FontAwesomeIcon icon={faGithub} />}
          href="https://github.com/NetLogo"
        />
        <Navbar.Action
          icon={<FontAwesomeIcon icon={faFilePdf} />}
          href="/NetLogo_User_Manual.pdf"
        />
      </Navbar.ActionsContainer>
    </Navbar.Client>
  );
}

function isSublinkActive(href: string | undefined) {
  if (typeof window === 'undefined') return false;
  if (!href) return false;
  try {
    const currentPath = window.location.pathname;
    return new URL(href, window.location.href).pathname === currentPath;
  } catch {
    return false;
  }
}

function isLinkParentActive(link: NavbarLink) {
  if (typeof window === 'undefined') return false;
  const currentPath = window.location.pathname;
  return link.children?.some((child) => isSublinkActive(child.href)) || false;
}

const navbarLinks: NavbarLink[] = [
  {
    title: 'Home',
    href: './',
  },
  {
    title: 'Learn NetLogo',
    href: 'whatis.html',
    children: [
      { title: 'What is NetLogo?', href: 'whatis.html' },
      { title: 'Tutorial #0 Sample Model', href: 'sample.html' },
      { title: 'Tutorial #1 Models', href: 'tutorial1.html' },
      { title: 'Tutorial #2 Commands', href: 'tutorial2.html' },
      { title: 'Tutorial #3 Procedures', href: 'tutorial3.html' },
    ],
  },
  {
    title: 'Documentation',
    href: 'dictionary.html',
    children: [
      { title: 'NetLogo Dictionary', href: 'dictionary.html' },
      { title: 'Interface Guide', href: 'interface.html' },
      { title: 'Interface Tab Guide', href: 'interfacetab.html' },
      { title: 'Info Tab Guide', href: 'infotab.html' },
      { title: 'Code Tab Guide', href: 'codetab.html' },
      { title: 'Programming Guide', href: 'programming.html' },
      { title: 'Transition Guide', href: 'transition.html' },
      { title: 'Scaladoc', href: 'scaladoc' },
    ],
  },
  {
    title: 'Advanced Tools',
    href: 'extension-manager.html',
    columns: 2,
    children: [
      { title: 'Extension Manager', href: 'extension-manager.html' },
      { title: 'Shapes Editor', href: 'shapes.html' },
      { title: 'BehaviorSpace', href: 'behaviorspace.html' },
      { title: 'System Dynamics', href: 'systemdynamics.html' },
      { title: 'HubNet', href: 'hubnet.html' },
      { title: 'HubNet Authoring', href: 'hubnet-authoring.html' },
      { title: 'Logging', href: 'logging.html' },
      { title: 'Controlling', href: 'controlling.html' },
      { title: 'Mathematica Link', href: 'mathematica.html' },
      { title: 'NetLogo 3D', href: '3d.html' },
    ],
  },
  {
    title: 'Extensions',
    href: 'extensions.html',
    columns: 2,
    children: [{ title: 'Extensions Guide', href: 'extensions.html' }],
  },
  {
    title: 'FAQ',
    href: 'faq.html',
  },
];

interface NavbarLink {
  title: string;
  href: string;
  columns?: number;
  children?: Omit<NavbarLink, 'children'>[];
  active?: boolean;
}
