import clsx from 'clsx';

const cn = (...classes: clsx.ClassValue[]): string => {
  return clsx(classes);
};

export { cn };
