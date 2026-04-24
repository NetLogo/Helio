export const deniedFileTypes = [".exe", ".bat", ".cmd", ".sh", ".dll"];
export const imageFileFormats = [
  ".jpeg",
  ".jpg",
  ".png",
  ".gif",
  ".bmp",
  ".svg",
  ".webp",
  ".avif",
  ".tiff",
];

// prettier-ignore
export const knownFileTypes: Record<string, {
  extensions: string[];
  icon: string;
  label: string;
}> = {
  'image': {
    extensions: ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.svg', '.webp', '.avif', '.tiff'],
    icon: 'i-lucide-image',
    label: 'Image'
  },
  'video': {
    extensions: ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.mpeg'],
    icon: 'i-lucide-video',
    label: 'Video'
  },
  'audio': {
    extensions: ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus', '.alac', '.wma', '.aiff'],
    icon: 'i-lucide-music',
    label: 'Audio'
  },
  'book': {
    extensions: ['.pdf', '.epub', '.mobi', '.azw3', '.fb2', '.djvu', '.cbz', '.cbr'],
    icon: 'i-lucide-book',
    label: 'Book'
  },
  'document': {
    extensions: ['.doc', '.docx', '.odt', '.rtf', '.txt', '.md', '.markdown', '.pages'],
    icon: 'i-lucide-file-text',
    label: 'Document'
  },
  'config': {
    extensions: ['.yaml', '.yml', '.ini', '.cfg', '.toml', '.env', '.xml'],
    icon: 'i-lucide-settings',
    label: 'Config'
  },

  'columndata': {
    extensions: ['.csv', '.tsv', '.xlsx', '.xls'],
    icon: 'i-lucide-file-spreadsheet',
    label: 'Spreadsheet Dataset'
  },
  'dataset': {
    extensions: ['.json', '.jsonl', '.parquet', '.avro', '.orc', '.db', '.sqlite',
                  '.sql', '.dbf', '.dta', '.sav', '.sas7bdat', '.hdf5', '.h5', '.nc',
                  '.rdata', '.rds', '.dta', '.spss', '.stata', '.feather'],
    icon: 'i-lucide-database',
    label: 'Dataset'
  },
  'binary': {
    extensions: ['.bin', '.exe', '.dll', '.so',
                 '.dylib','.msi', '.deb', '.rpm', '.apk', '.jar',
                 '.pyc', '.pyo', '.class', '.o', '.obj', '.elf',
                 '.AppImage'],
    icon: 'i-lucide-archive',
    label: 'Binary'
  },
  'code': {
    extensions: [
      // R, Python, Matplotlib, Jupyter
      '.r', '.rmd', '.rmarkdown', '.py', '.ipynb', '.matplotlib', '.mplstyle',
      // JavaScript/TypeScript
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
      // Java
      '.java', '.class',
      // C/C++/Go/C#/Rust
      '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs',
      // Web
      '.html', '.css', '.scss', '.less'
    ],
    icon: 'i-lucide-code',
    label: 'Code'
  },
  'email': {
    extensions: ['.eml', '.msg', '.mbox', '.pst', '.ost'],
    icon: 'i-lucide-mail',
    label: 'Email'
  },
  'archive': {
    extensions: ['.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz'],
    icon: 'i-lucide-archive',
    label: 'Archive'
  },
  'disc': {
    extensions: ['.iso', '.img', '.dmg', '.vmdk', '.qcow2', '.box', '.vhd', '.vhdx'],
    icon: 'i-lucide-disc',
    label: 'Disc'
  },
  'key': {
    extensions: ['.pem', '.key', '.csr', '.crt', '.cer', '.pfx', '.p12'],
    icon: 'i-lucide-key',
    label: 'Key'
  },
  'symlink': {
    extensions: ['.lnk', '.symlink', '.shortcut'],
    icon: 'i-lucide-link',
    label: 'Symlink'
  },
  'netlogo': {
    extensions: ['.nlogo', '.nlogo3d', '.nlogox', '.nlogox3d', '.nls'],
    icon: 'netlogo-netlogo-desktop',
    label: 'NetLogo File'
  }
};

export function getFileTypeDisplayInfo(fileName: string): { icon: string; label: string } {
  const extension = fileName.slice(fileName.lastIndexOf("."));
  for (const fileType of Object.values(knownFileTypes)) {
    if (fileType.extensions.includes(extension.toLowerCase())) {
      return { icon: fileType.icon, label: fileType.label };
    }
  }
  return { icon: "i-lucide-file", label: "Unknown" };
}
