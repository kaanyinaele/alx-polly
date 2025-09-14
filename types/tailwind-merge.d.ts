// Minimal type shim for tailwind-merge to satisfy TypeScript in this project.
declare module 'tailwind-merge' {
  import type { ClassValue } from 'clsx';
  export function twMerge(...inputs: ClassValue[]): string;
}
