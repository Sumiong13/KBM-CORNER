import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // Add '-swc' here

export default defineConfig({
  plugins: [react()],
})
