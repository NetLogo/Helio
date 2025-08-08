'use client';
import NetLogoUserManualSVG from '@repo/ui/assets/brands/NetLogoUserManual.svg';
import Navbar from '@repo/ui/layout/navbar/Navbar';
import Image from 'next/image';

export default function ClientNavbar() {
  return (
    <Navbar.Client
      id="main-navbar"
      brand={<Image src={NetLogoUserManualSVG} alt="NetLogo" />}
      brandHref="/"
    >
      <Navbar.LinksContainer>
        {navbarLinks.map((link) => (
          <Navbar.ItemClient
            key={link.title}
            title={link.title}
            href={link.href}
            columns={link.columns}
          >
            {link.children &&
              link.children.map((child) => (
                <Navbar.DropdownItem
                  key={child.title}
                  title={child.title}
                  href={child.href}
                />
              ))}
          </Navbar.ItemClient>
        ))}
      </Navbar.LinksContainer>
      <Navbar.ActionsContainer>
        <Navbar.Action title="GitHub" href="https://github.com/NetLogo" />
      </Navbar.ActionsContainer>
    </Navbar.Client>
  );
}

const navbarLinks = [
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
