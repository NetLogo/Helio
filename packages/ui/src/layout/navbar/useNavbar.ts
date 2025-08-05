import useHideOnScroll from '@/hooks/useHideOnScroll';
import { isWindowDefined } from '@/utils/client';
import { NavbarDynamicProps, NavbarOptions } from './types';

export function useNavbar(options: NavbarOptions): NavbarDynamicProps {
  if (isWindowDefined()) {
    // Client-side logic
    const show = useHideOnScroll({
      enabled: Boolean(options.hideOnScroll),
      threshold: options.hideOnScroll?.threshold,
    });

    return { show };
  } else {
    // Server-side logic
    console.warn('useNavbar should only be used in a client-side context.');
    return { show: true };
  }
  return {};
}
