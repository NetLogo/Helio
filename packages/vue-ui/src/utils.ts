import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: Array<ClassValue>): string {
  return twMerge(clsx(inputs))
}

export type ComponentProps<T> = T extends new (...args: any) => any
  ? InstanceType<T>['$props']
  : T extends (props: infer P, ...args: any) => any
    ? P
    : never
