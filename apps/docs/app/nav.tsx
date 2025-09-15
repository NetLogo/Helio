'use client';

import { ReactNode, useLayoutEffect, useState } from 'react';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import NetLogoUserManualSVG from '@repo/ui/assets/brands/NetLogoUserManual.svg';
import Navbar from '@repo/ui/components/navbar/Navbar';
import { isWindowDefined } from '@repo/ui/lib/utils/client';
import VersionSelectDropdown from '@repo/ui/widgets/VersionSelectDropdown';

export default function ClientNavbar({
  navbarLinks,
}: {
  navbarLinks: Array<NavbarLink>;
}): ReactNode {
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
        <VersionSelectDropdown
          versions={versions}
          selectedVersion="7.0.0-beta2"
          onVersionChange={onVersionChange}
        />
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
    const candidatePath = new URL(href, window.location.href).pathname;
    return currentPath === candidatePath;
  } catch {
    return false;
  }
}

function isLinkParentActive(link: NavbarLink) {
  if (typeof window === 'undefined') return false;
  const currentPath = window.location.pathname;
  const candidatePath = new URL(link.href, window.location.href).pathname;
  const isParentActiveOnItsOwn = candidatePath === currentPath;
  return (
    isParentActiveOnItsOwn || link.children?.some((child) => isSublinkActive(child.href)) || false
  );
}

const versions = {
  '7.0.0-beta2': { displayName: '7.0.0 Beta 2' },
  '6.4.0': {},
  '6.3.0': {},
  '6.2.2': {},
  '6.1.1': {},
  '6.0.4': {},
  '6.0beta': { displayName: '6.0 Beta' },
  '5.3.1': {},
  '5.2.1': {},
  '5.1.0': {},
  '5.0': {},
  '4.1': {},
  '4.0': {},
  '3.2': {},
  '3.1': {},
  '3.0': {},
  '2.1': { disabled: true },
  '2.0': { disabled: true },
  '1.2': { disabled: true },
  '1.1': { disabled: true },
  '1.0': { disabled: true },
} as const;

const onVersionChange = (version: keyof typeof versions) => {
  if (!isWindowDefined()) return;
  if (parseInt(version.charAt(0)) >= 7) {
    window.location.pathname = `/${version}`;
  } else {
    window.location.href = `https://ccl.northwestern.edu/netlogo/${version}/docs`;
  }
};

export interface NavbarLink {
  title: string;
  href: string;
  columns?: number;
  children?: Array<Omit<NavbarLink, 'children'>>;
  active?: boolean;
}
