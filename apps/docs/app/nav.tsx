'use client';

import type { ReactNode } from 'react';
import { useLayoutEffect, useState } from 'react';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { FaFilePdf, FaGithub } from 'react-icons/fa6';

import NetLogoUserManualSVG from '@repo/ui/assets/brands/NetLogoUserManual.svg';
import Navbar from '@repo/ui/components/navbar/Navbar';
import Search from '@repo/ui/components/search';
import { isWindowDefined } from '@repo/ui/lib/utils/client';
import VersionSelectDropdown from '@repo/ui/widgets/VersionSelectDropdown';
import { zip } from '@repo/utils/std/array';

export default function ClientNavbar({
  navbarLinks,
  selectedVersion,
}: {
  navbarLinks: Array<NavbarLink>;
  selectedVersion: string;
}): ReactNode {
  const [links, setLinks] = useState(navbarLinks);
  const pathname = usePathname();
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

  return (
    <Navbar.Client
      id="main-navbar"
      brand={<Image src={NetLogoUserManualSVG as string} alt="NetLogo" />}
      brandHref={'/'}
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
            {link.children?.map((child) => (
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
        <Search indices={['Documenter']} />
        <VersionSelectDropdown
          versions={versions}
          selectedVersion={selectedVersion}
          onVersionChange={onVersionChange}
        />
        <Navbar.Action icon={<FaGithub />} href="https://github.com/NetLogo" />
        <Navbar.Action icon={<FaFilePdf />} href="/NetLogo_User_Manual.pdf" />
      </Navbar.ActionsContainer>
    </Navbar.Client>
  );
}

function arePathnamesCongruent(
  windowPathname: string,
  candidatePathname: string,
  { prefixPattern = /^\d+\./ } = {}
): boolean {
  const [windowParts, candidateParts] = [windowPathname, candidatePathname].map((pname) =>
    pname
      .split('/')
      .filter((p) => p.length > 0)
      .map((p) => p.replace(/\.html$/, ''))
      .map((p) => p.trim().split('#').at(0) ?? '')
  ) as [Array<string>, Array<string>];

  windowParts.unshift('<ROOT>');
  candidateParts.unshift('<ROOT>');

  const arePartsEqual = zip(windowParts, candidateParts).every(([w, c]) => w === c);
  const arePartsEqualWithPrefixIgnored = zip(
    windowParts.filter((p, i) => i > 1 || !prefixPattern.test(p)),
    candidateParts
  ).every(([w, c]) => w === c);

  return arePartsEqual || arePartsEqualWithPrefixIgnored;
}

function isSublinkActive(href: string | undefined): boolean {
  if (typeof window === 'undefined') return false;
  if (!(typeof href === 'string')) return false;
  try {
    const currentPath = window.location.pathname;
    return arePathnamesCongruent(currentPath, href);
  } catch {
    return false;
  }
}

function isLinkParentActive(link: NavbarLink): boolean {
  if (typeof window === 'undefined') return false;
  const currentPath = window.location.pathname;
  const isParentActiveOnItsOwn = arePathnamesCongruent(currentPath, link.href);
  return (
    isParentActiveOnItsOwn ||
    (link.children ?? []).some((child) => isSublinkActive(child.href)) ||
    false
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

const onVersionChange = (version: keyof typeof versions): void => {
  if (!isWindowDefined()) return;
  if (parseInt(version.charAt(0)) >= 7) {
    window.location.pathname = `/${version}`;
  } else {
    window.location.href = `https://ccl.northwestern.edu/netlogo/${version}/docs`;
  }
};

export type NavbarLink = {
  title: string;
  href: string;
  columns?: number;
  children?: Array<Omit<NavbarLink, 'children'>>;
  active?: boolean;
};
