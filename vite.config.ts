import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(
    // 打开以启用 React Compiler
    //   {
    //   babel: {
    //     plugins: ['babel-plugin-react-compiler'],
    //   },
    // }
  )],
  assetsInclude: ['**/*.pcd'],
  build: {
    chunkSizeWarningLimit: 1500, // 调整警告阈值，Three.js 比较大，适当调高
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
