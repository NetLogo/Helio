<template>
  <div class="font-mono text-sm">
    <div class="flex items-center gap-2 py-1">
      <Icon :name="iconName" class="w-4 h-4" :class="iconClass" />
      <span :class="node.type === 'directory' ? 'font-semibold' : ''">{{ node.name }}</span>
      <span v-if="node.sizeKB && node.type === 'file'" class="text-gray-500 text-xs ml-2">
        ({{ formatSize(node.sizeKB) }})
      </span>
    </div>
    <div v-if="node.children && node.children.length > 0" class="ml-5 border-l border-gray-300 pl-3">
      <DatasetFileTree v-for="(child, idx) in node.children" :key="idx" :node="child" />
    </div>
  </div>
</template>

<script setup lang="ts">
export type FileTreeNode = {
  name: string;
  type: 'file' | 'directory';
  sizeKB?: number;
  icon?: string;
  children?: FileTreeNode[];
};

type Props = {
  node: FileTreeNode;
};

const props = defineProps<Props>();

const iconName = computed(() => {
  if (props.node.icon) return props.node.icon;
  if (props.node.type === 'directory') return 'i-lucide-folder';

  // Detect file type by extension
  const ext = props.node.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'csv':
    case 'tsv':
      return 'i-lucide-file-spreadsheet';
    case 'json':
    case 'xml':
      return 'i-lucide-file-code';
    case 'txt':
    case 'md':
      return 'i-lucide-file-text';
    case 'zip':
    case 'tar':
    case 'gz':
      return 'i-lucide-file-archive';
    default:
      return 'i-lucide-file';
  }
});

const iconClass = computed(() => {
  return props.node.type === 'directory' ? 'text-blue-600' : 'text-gray-600';
});

function formatSize(sizeKB: number): string {
  if (sizeKB < 1024) return `${sizeKB} KB`;
  const sizeMB = sizeKB / 1024;
  if (sizeMB < 1024) return `${sizeMB.toFixed(1)} MB`;
  const sizeGB = sizeMB / 1024;
  return `${sizeGB.toFixed(2)} GB`;
}
</script>
