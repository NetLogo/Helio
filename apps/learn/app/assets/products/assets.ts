import $behaviorSearchLogo from '@repo/vue-ui/assets/brands/products/logos/behavior-search.svg?url&no-inline';
import $hubnetWebLogo from '@repo/vue-ui/assets/brands/products/logos/hubnet-web.svg?url&no-inline';
import $netlogo3dLogo from '@repo/vue-ui/assets/brands/products/logos/netlogo-3d.png?url&no-inline';
import $netlogoDesktopLogo from '@repo/vue-ui/assets/brands/products/logos/netlogo-desktop.svg?url&no-inline';
import $netlogoWebLogo from '@repo/vue-ui/assets/brands/products/logos/netlogo-web.svg?url&no-inline';
import $nettangoLogo from '@repo/vue-ui/assets/brands/products/logos/nettango.svg?url&no-inline';

import $behaviorSearchIcon from '@repo/vue-ui/assets/brands/products/icons/behavior-search.svg?url&no-inline';
import $hubnetWebIcon from '@repo/vue-ui/assets/brands/products/icons/hubnet-web.svg?url&no-inline';
import $netlogo3dIcon from '@repo/vue-ui/assets/brands/products/icons/netlogo-3d.png?url&no-inline';
import $netlogoDesktopIcon from '@repo/vue-ui/assets/brands/products/icons/netlogo-desktop.svg?url&no-inline';
import $netlogoWebIcon from '@repo/vue-ui/assets/brands/products/icons/netlogo-web.svg?url&no-inline';
import $nettangoIcon from '@repo/vue-ui/assets/brands/products/icons/nettango.svg?url&no-inline';
import $turtleUniverseIcon from '@repo/vue-ui/assets/brands/products/icons/turtle-sim.png?url&no-inline';

const assets = {
  'logo/netlogo-desktop': $netlogoDesktopLogo,
  'logo/netlogo-web': $netlogoWebLogo,
  'logo/netlogo-3d': $netlogo3dLogo,
  'logo/nettango': $nettangoLogo,
  'logo/behavior-search': $behaviorSearchLogo,
  'logo/hubnet-web': $hubnetWebLogo,
  'icon/netlogo-desktop': $netlogoDesktopIcon,
  'icon/netlogo-web': $netlogoWebIcon,
  'icon/netlogo-3d': $netlogo3dIcon,
  'icon/nettango': $nettangoIcon,
  'icon/behavior-search': $behaviorSearchIcon,
  'icon/hubnet-web': $hubnetWebIcon,
  'icon/turtle-universe': $turtleUniverseIcon,
} as const;

export { assets };
