import Anchor from '@repo/ui/HOC/Anchor';
import beginnersLinks from './beginners-links.json';
import importantLinks from './important-links.json';

export default function Page() {
  const productVersion = process.env['PRODUCT_VERSION'];
  return (
    <main className="md:my-5 px-2 mx-auto nl-container-width">
      <div className="grid md:grid-cols-12 pt-5 gap-5">
        <div className="md:col-span-8 nl-container-free">
          <h1 className="nl-col no-stylized-heading mt-0">
            <span className="break-after">NetLogo</span>
            {productVersion} Documentation
          </h1>
          <p>
            Welcome to the documentation for NetLogo {productVersion}. Download
            the latest version
            <a href="https://www.netlogo.org/download">here</a>.
          </p>
          <p>
            Please read the{' '}
            <a href="versions.html#version-700-beta2-july-2025">
              Release Notes
            </a>{' '}
            for information about new features, bug fixes, and other changes in
            this version. For help running models made in old versions, see the
            <a href="transition.html#changes-for-netlogo-700">
              Transition Guide
            </a>
            .
          </p>
          <p>
            If you use or refer to NetLogo in a publication, we ask that you
            cite it. For the correct citation, see the{' '}
            <a href="copyright.html">Copyright and License Information</a> page.
          </p>
          <div className="highlight highlight-warning">
            <p>
              NetLogo {productVersion} is a beta release. It is not recommended
              for production use, but we welcome your feedback on the new
              features and changes.
            </p>
          </div>
        </div>
        <img
          className="md:col-span-4"
          src="images/netlogo-banner_2x.webp"
          alt="NetLogo {productVersion} Banner"
          srcSet="images/netlogo-banner_1x.webp 1x, images/netlogo-banner_2x.webp 2x"
        />
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-1 md:col-span-6">
          <h3>Important Links</h3>
          <ul>
            {importantLinks.map((link, index) => (
              <li key={index}>
                <Anchor href={link.href} external={link.external}>
                  {link.text}
                </Anchor>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-1 md:col-span-6">
          <h3>Beginner's Guide</h3>
          <ul>
            {beginnersLinks.map((link, index) => (
              <li key={index}>
                <Anchor href={link.href} external={link.external}>
                  {link.text}
                </Anchor>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
