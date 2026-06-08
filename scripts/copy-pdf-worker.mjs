// Copy the pdf.js worker from the installed pdfjs-dist into /public so it is
// served same-origin and ALWAYS version-matched to the installed package.
// The previous approach pointed GlobalWorkerOptions.workerSrc at cdnjs, which
// 404s for versions cdnjs doesn't host (e.g. 6.0.227) → "Setting up fake worker
// failed". Runs on postinstall (local + Vercel) and prebuild.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// resolve the worker relative to the actually-installed pdfjs-dist
let src
try {
  src = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build', 'pdf.worker.min.mjs')
} catch {
  console.warn('[copy-pdf-worker] pdfjs-dist not found — skipping')
  process.exit(0)
}
if (!existsSync(src)) {
  console.warn(`[copy-pdf-worker] worker not found at ${src} — skipping`)
  process.exit(0)
}

const destDir = join(root, 'public')
const dest = join(destDir, 'pdf.worker.min.mjs')
mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.log('[copy-pdf-worker] copied worker → public/pdf.worker.min.mjs')
