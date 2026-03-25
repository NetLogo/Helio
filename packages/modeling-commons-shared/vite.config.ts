import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ModelingCommonsShared',
      formats: ['es'],
      fileName: (format) => 'index.js'
    },
    rollupOptions: {
      external: []
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
})
