import type { JSX } from 'react';
import { LuChevronDown } from 'react-icons/lu';

import { ObjectFunctor } from '@repo/utils/std/objects';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/dropdownMenu';

export default function VersionSelectDropdown<K extends Record<string, VersionProps>>({
  selectedVersion,
  versions,
  onVersionChange,
}: VersionSelectDropdownProps<K>): JSX.Element {
  const versionsObject = new ObjectFunctor(versions)
    .mapValues((key, value) => {
      return {
        displayName: value.displayName ?? (key as string),
        selected: selectedVersion === key,
        disabled: value.disabled,
      };
    })
    .get();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="line-clamp-1 ellipsis">
        {versionsObject[selectedVersion].displayName} <LuChevronDown className="inline" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.entries(versionsObject).map(([key, value]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onVersionChange?.(key)}
            variant={value.selected ? 'selected' : 'default'}
            disabled={value.disabled}
          >
            {value.displayName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type VersionProps = {
  displayName?: string /** Default: version name */;
  disabled?: boolean /** Default: false */;
};
export type VersionSelectDropdownProps<K extends Record<string, VersionProps>> = {
  selectedVersion: keyof K | string;
  versions: K;
  onVersionChange?: (version: keyof K) => void;
};
