// Filming harness: serve the real renderer in a plain browser, with
// src/film/stub.ts standing in for the main process and the capture device.
// Tooling only: nothing here is part of the app (see stub.ts).
//
//   npx vite --config src/film/film.config.mjs          # http://127.0.0.1:5199/
//
// Then point a browser (or stoatworks-backend's video/lib/film.mjs) at it.
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

export default defineConfig({
  root: resolve(root, 'src/renderer'),
  publicDir: resolve(root, 'public'),
  define: { __APP_VERSION__: JSON.stringify(`v${pkg.version}`) },
  resolve: { alias: { '@renderer': resolve(root, 'src/renderer/src') } },
  server: { host: '127.0.0.1', port: 5199, strictPort: true, fs: { allow: [root] } },
  plugins: [
    react(),
    {
      name: 'animatem-film-stub',
      transformIndexHtml(html) {
        return (
          html
            // The app's CSP forbids inline scripts, and Vite's dev client and
            // React's refresh preamble are inline. The packaged app keeps it.
            .replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, '')
            // The stand-in must be in place before the app's first render.
            .replace(
              '<script type="module" src="/src/main.tsx"></script>',
              `<script type="module" src="/@fs${resolve(root, 'src/film/stub.ts')}"></script>\n` +
                '    <script type="module" src="/src/main.tsx"></script>'
            )
        )
      }
    }
  ]
})
