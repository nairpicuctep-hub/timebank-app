#!/usr/bin/env node
/* Verifies that all four message catalogs share an identical set of keys.
   Run: node scripts/check-i18n.mjs
   Exits non-zero (and prints the diff) if any locale is missing/extra keys
   relative to the EN base. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const msgDir = join(here, '..', 'messages')
const locales = ['en', 'nl', 'fr', 'ro']
const base = 'en'

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = true
  }
  return out
}

const load = (l) => flatten(JSON.parse(readFileSync(join(msgDir, `${l}.json`), 'utf8')))
const cats = Object.fromEntries(locales.map((l) => [l, load(l)]))
const baseKeys = Object.keys(cats[base]).sort()

let ok = true
for (const l of locales) {
  if (l === base) continue
  const keys = cats[l]
  const missing = baseKeys.filter((k) => !(k in keys))
  const extra = Object.keys(keys).filter((k) => !(k in cats[base]))
  if (missing.length || extra.length) {
    ok = false
    console.error(`\n✗ ${l}.json out of sync with ${base}.json`)
    if (missing.length) console.error(`  missing (${missing.length}): ${missing.join(', ')}`)
    if (extra.length) console.error(`  extra   (${extra.length}): ${extra.join(', ')}`)
  }
}

if (ok) {
  console.log(`✓ all ${locales.length} catalogs aligned — ${baseKeys.length} keys each`)
  process.exit(0)
} else {
  console.error('\nCatalogs are NOT key-aligned. Fix before committing.')
  process.exit(1)
}
