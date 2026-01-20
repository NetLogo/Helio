import type { VersionProps } from '@repo/vue-ui/widgets/VersionSelectDropdown.vue';

type LiveVersionData = {
  name: string;
  value: string;
  disabled?: boolean;
};

function toNumericVersion(version: string): number {
  const versionPattern = /^(?<major>\d+)(\.(?<minor>\d+))?(\.(?<patch>\d+))?(?<extra>.*)?$/;
  const match = version.trim().match(versionPattern);
  if (match && match.groups) {
    const major = parseInt(match.groups.major || '0');
    const minor = parseInt(match.groups.minor || '0');
    const patch = parseInt(match.groups.patch || '0');
    const extra = match.groups.extra ? 0 : 1;

    return major * 100 + minor * 10 + patch + extra * 0.1;
  }
  return 0;
}

const pullVersionsFromSource = async (
  currentVersions: Record<string, VersionProps>,
  url: string,
): Promise<Record<string, VersionProps>> => {
  try {
    const data = await $fetch<Array<LiveVersionData>>(url);

    const normalizeLiveVersionsToProps = (version: LiveVersionData): VersionProps => ({
      displayName: version.name,
      disabled: version.disabled ?? false,
    });

    const liveVersionPropsReducer = (
      acc: Record<string, VersionProps>,
      version: LiveVersionData,
    ): Record<string, VersionProps> => {
      acc[version.value] = normalizeLiveVersionsToProps(version);
      return acc;
    };

    const sortVersions = (versions: Record<string, VersionProps>): Record<string, VersionProps> => {
      const sortedEntries = Object.entries(versions).sort((a, b) => {
        const versionA = a[0];
        const versionB = b[0];

        const numericA = toNumericVersion(versionA);
        const numericB = toNumericVersion(versionB);

        if (numericA !== 0 && numericB !== 0) {
          return numericB - numericA;
        }

        return versionB.localeCompare(versionA, undefined, { numeric: true, sensitivity: 'base' });
      });
      return Object.fromEntries(sortedEntries);
    };

    return sortVersions({
      ...currentVersions,
      ...data.reduce(liveVersionPropsReducer, {}),
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
  }

  return currentVersions;
};

const onVersionChange = (
  version: string,
  { productWebsite, productVersion }: { productWebsite: string; productVersion: string },
): void => {
  let uri = window.location.pathname
    .split('/')
    .filter((part) => part.length > 0)
    .filter((part) => part !== productVersion)
    .join('/');

  if (version === productVersion) {
    return; // NOOP
  } else if (parseInt(version.charAt(0)) >= 7) {
    const pathname = `${version}/${uri}`;
    if (import.meta.dev) {
      window.location.pathname = `/${pathname}`;
    } else {
      window.location.href = `${productWebsite}/${pathname}`;
    }
  } else {
    if (uri.endsWith('/') || uri.length === 0) {
      uri += 'index';
    }
    if (!uri.endsWith('.html')) {
      uri += '.html';
    }
    window.location.href = `https://ccl.northwestern.edu/netlogo/${version}/docs/${uri}`;
  }
};

export { onVersionChange, pullVersionsFromSource };
