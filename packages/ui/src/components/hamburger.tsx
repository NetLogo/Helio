import { cn } from '@/lib/utils/cn';
import type { JSX } from 'react';

export default function Hamburger({
  className,
  ...rest
}: React.ComponentProps<'label'>): JSX.Element {
  return (
    <label
      className={cn('xl:hidden flex flex-col gap-1 cursor-pointer transition-transform', className)}
      {...rest}
    >
      {Array(3)
        .fill(0)
        .map((_, idx) => (
          <span key={idx} className="block w-[22px] h-[2px] bg-current"></span>
        ))}
    </label>
  );
}
