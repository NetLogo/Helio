import { ObjectFunctor } from '@/lib/utils/objects';
import { LuChevronDown } from 'react-icons/lu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/dropdownMenu';

export default function VersionSelectDropdown<
  K extends Record<string, VersionProps>,
>({
  selectedVersion,
  versions,
  onVersionChange,
}: VersionSelectDropdownProps<K>) {
  const versionsObject = new ObjectFunctor(versions)
    .map((key, value) => {
      return {
        displayName: value.displayName || (key as string),
        selected: selectedVersion === key,
        disabled: value.disabled,
      };
    })
    .get();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="line-clamp-1 ellipsis">
        {versionsObject[selectedVersion]?.displayName}{' '}
        <LuChevronDown className="inline" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.entries(versionsObject).map(([key, value]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onVersionChange?.(key)}
            variant={(value.selected && 'selected') || 'default'}
            disabled={value.disabled}
          >
            {value.displayName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface VersionProps {
  displayName?: string /** Default: version name */;
  disabled?: boolean /** Default: false */;
}
export interface VersionSelectDropdownProps<
  K extends Record<string, VersionProps>,
> {
  selectedVersion: keyof K;
  versions: K;
  onVersionChange?: (version: keyof K) => void;
}
