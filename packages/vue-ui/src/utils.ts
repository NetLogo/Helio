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

export type ComponentSlots<T> = T extends new (...args: any) => any
  ? InstanceType<T>['$slots']
  : T extends (props: any, slots: infer S, ...args: any) => any
    ? S extends { slots: infer S2 }
      ? S2
      : never
    : never
