import useHideOnScroll from '@/hooks/useHideOnScroll';
import { isWindowDefined } from '@/lib/utils/client';
import { NavbarDynamicProps, NavbarOptions } from './types';

export function useNavbar(options: NavbarOptions): NavbarDynamicProps {
  if (isWindowDefined()) {
    // Client-side logic
    const show = useHideOnScroll({
      enabled: Boolean(options.hideOnScroll),
      threshold: options.hideOnScroll?.threshold,
      aggregateThreshold: options.hideOnScroll?.aggregateThreshold ?? true,
    });

    return { show };
  } else {
    // Server-side logic
    return { show: true };
  }
}
