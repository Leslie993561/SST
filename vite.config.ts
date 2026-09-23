import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` é o caminho onde o Portal Recursos Humanos publica este app (via
// rewrite do Next, em next.config.ts). Sem ele o HTML pediria os assets em
// /assets/... na raiz do portal, que é outro app.
export default defineConfig({
  base: '/sst/',
  plugins: [react()],
})
