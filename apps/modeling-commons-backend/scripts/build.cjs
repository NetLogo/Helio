const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parseLock } = require('../../../scripts/lib/yarn-lock.js');

const root = path.join(__dirname, '..');
const monorepoRoot = path.join(root, '..', '..');
const distDir = path.join(root, 'dist');

function reachableNames(lockText, rootNames) {
  const depsByName = new Map();
  for (const entry of parseLock(lockText).entries) {
    const deps = entry.body
      .filter((line) => line.startsWith('    '))
      .map((line) => line.trim().split(' ')[0].replace(/^"|"$/g, ''));
    for (const name of entry.names)
      depsByName.set(name, [...(depsByName.get(name) || []), ...deps]);
  }
  const seen = new Set();
  const queue = [...rootNames];
  while (queue.length) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    queue.push(...(depsByName.get(name) || []));
  }
  return seen;
}

async function build() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  execSync(`cp -r ${path.join(root, 'src')} ${distDir}/src`);
  execSync(`cp -r ${path.join(root, 'prisma')} ${path.join(distDir, 'prisma')}`);
  execSync(`cp ${path.join(root, 'prisma.config.ts')} ${path.join(distDir, 'prisma.config.ts')}`);
  execSync(`cp -r ${path.join(root, 'generated')} ${distDir}/generated`);

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const rootPkg = JSON.parse(fs.readFileSync(path.join(monorepoRoot, 'package.json'), 'utf8'));

  // Generate package.json
  const distPkg = {
    name: pkg.name || 'server',
    type: 'module',
    private: true,
    dependencies: pkg.dependencies || {},
    imports: pkg.imports || {},
  };

  const repoPkgs = Object.keys(distPkg.dependencies).filter((dep) => dep.startsWith('@repo/'));
  for (const dep of Object.keys(distPkg.dependencies)) {
    if (dep.startsWith('@repo/')) delete distPkg.dependencies[dep];
  }

  /* Without the root resolutions Yarn re-resolves ranges the lock only satisfies through them,
   * and Yarn 1 installs every resolution it is given, so only the reachable ones are kept. */
  const lockText = fs.readFileSync(path.join(monorepoRoot, 'yarn.lock'), 'utf8');
  const reachable = reachableNames(lockText, Object.keys(distPkg.dependencies));
  distPkg.resolutions = Object.fromEntries(
    Object.entries(rootPkg.resolutions || {}).filter(([name]) => reachable.has(name)),
  );
  fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(distPkg, null, 2));

  // Install deps
  fs.writeFileSync(path.join(distDir, 'yarn.lock'), lockText);
  execSync('yarn install --production --frozen-lockfile', { cwd: distDir, stdio: 'inherit' });

  // Build and copy @repo/* packages
  console.log('Building and copying @repo/* packages:', repoPkgs);
  for (const pkg of repoPkgs) {
    execSync(`yarn workspace ${pkg} build`, { cwd: monorepoRoot, stdio: 'inherit' });
    const pkgName = pkg.replace('@repo/', '');
    const pkgDir = path.join(monorepoRoot, 'packages', pkgName);
    const dest = path.join(distDir, 'node_modules', '@repo', pkgName);
    fs.mkdirSync(dest, { recursive: true });
    execSync(`cp -r ${pkgDir}/dist ${dest}/dist`);
    fs.copyFileSync(path.join(pkgDir, 'package.json'), path.join(dest, 'package.json'));
  }

  console.log('Build complete: dist/');
  console.log('Run with: node dist/src/index.ts');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
