const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const monorepoRoot = path.join(root, '..', '..');
const distDir = path.join(root, 'dist');

async function build() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  execSync(`cp -r ${path.join(root, 'src')} ${distDir}/src`);
  execSync(`cp -r ${path.join(root, 'generated')} ${distDir}/generated`);

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  // Build and copy @repo/* packages
  const repoPkgs = Object.keys(pkg.dependencies || {}).filter((dep) => dep.startsWith('@repo/'));
  for (const pkg of repoPkgs) {
    execSync(`yarn workspace ${pkg} build`, { cwd: monorepoRoot, stdio: 'inherit' });
    const pkgName = pkg.replace('@repo/', '');
    const pkgDir = path.join(monorepoRoot, 'packages', pkgName);
    const dest = path.join(distDir, 'node_modules', '@repo', pkgName);
    fs.mkdirSync(dest, { recursive: true });
    execSync(`cp -r ${pkgDir}/dist ${dest}/dist`);
    fs.copyFileSync(path.join(pkgDir, 'package.json'), path.join(dest, 'package.json'));
  }

  // Generate package.json
  const distPkg = {
    name: pkg.name || 'server',
    type: 'module',
    private: true,
    dependencies: pkg.dependencies || {},
    imports: pkg.imports || {},
  };
  for (const dep of Object.keys(distPkg.dependencies)) {
    if (dep.startsWith('@repo/')) delete distPkg.dependencies[dep];
  }
  fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(distPkg, null, 2));

  // Install deps
  fs.copyFileSync(path.join(monorepoRoot, 'yarn.lock'), path.join(distDir, 'yarn.lock'));
  execSync('yarn install --production --frozen-lockfile', { cwd: distDir, stdio: 'inherit' });

  console.log('Build complete: dist/');
  console.log('Run with: node dist/src/index.ts');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});