'use client';

import NetLogoUserManualSVG from '@repo/ui/assets/brands/NetLogoUserManual.svg';
import Footer from '@repo/ui/layout/footer/Footer';
import Image from 'next/image';

export default function ClientFooter() {
  return (
    <Footer sections={3}>
      <Footer.Container>
        <Footer.BrandSection
          brand={<Image src={NetLogoUserManualSVG} alt="NetLogo User Manual" />}
          brandHref="https://www.netlogo.org/"
        >
          <hr className="w-full border-gray-300 my-4" />
          <p>
            NetLogo is a programmable modeling environment for simulating
            natural and social phenomena. It was authored by Uri Wilensky in
            1999 and has been in continuous development ever since at the Center
            for Connected Learning and Computer-Based Modeling.
          </p>
        </Footer.BrandSection>

        <Footer.LinksSection
          span={3}
          title="Related Links"
          links={[
            {
              title: 'NetLogo Home',
              href: 'https://www.netlogo.org/',
              external: true,
            },
            {
              title: 'Center for Connected Learning',
              href: 'https://ccl.northwestern.edu/',
              external: true,
            },
            {
              title: 'NetLogo Web',
              href: 'https://www.netlogoweb.org/',
              external: true,
            },
            {
              title: 'NetTango Web',
              href: 'https://ccl.northwestern.edu/nettangoweb/',
              external: true,
            },
            { title: 'NetLogo 3D', href: '3d.html', external: false },
            {
              title: 'BehaviorSearch',
              href: 'https://www.behaviorsearch.org/',
              external: true,
            },
            { title: 'Contact Us', href: 'contact.html', external: false },
          ]}
        />

        <Footer.Section span={5}>
          <p id="copyright" className="mt-2">
            Copyright © 1999- Uri Wilensky and the{' '}
            <Footer.CopyrightLink href="https://ccl.northwestern.edu/" external>
              Center for Connected Learning and Computer-Based Modeling
            </Footer.CopyrightLink>{' '}
            at{' '}
            <Footer.CopyrightLink href="https://www.northwestern.edu/" external>
              Northwestern University
            </Footer.CopyrightLink>
            . All rights reserved.
          </p>
          <p>
            This program is free software; you can redistribute it and/or modify
            it under the terms of the GNU General Public License as published by
            the Free Software Foundation; either version 2 of the{' '}
            <Footer.CopyrightLink href="copyright.html">
              License
            </Footer.CopyrightLink>
            , or (at your option) any later version.
          </p>
          <p>
            Commercial licenses are also available. To inquire about commercial
            licenses, please contact Uri Wilensky at{' '}
            <Footer.CopyrightLink href="mailto:netlogo-commercial-admin@ccl.northwestern.edu">
              netlogo-commercial-admin@ccl.northwestern.edu
            </Footer.CopyrightLink>
            .
          </p>
          <p>
            For more information, visit the{' '}
            <Footer.CopyrightLink href="https://www.netlogo.org/" external>
              NetLogo website
            </Footer.CopyrightLink>
            .
          </p>
        </Footer.Section>
      </Footer.Container>
    </Footer>
  );
}
