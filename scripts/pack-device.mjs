import { readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const OUT = 'firmware/tempra_diag/data'
const BUDGET_BYTES = 900 * 1024

const files = dir => readdirSync(dir).flatMap(name => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? files(path) : [path]
})

renameSync(join(OUT, 'device.html'), join(OUT, 'index.html'))
let total = 0
for (const path of files(OUT)) {
  const packed = gzipSync(readFileSync(path), { level: 9 })
  writeFileSync(path + '.gz', packed)
  rmSync(path)
  total += packed.length
  console.log(`${(packed.length / 1024).toFixed(1).padStart(7)} KB  ${path}.gz`)
}
console.log(`${(total / 1024).toFixed(1).padStart(7)} KB  total (budget ${BUDGET_BYTES / 1024} KB)`)
if (total > BUDGET_BYTES) {
  console.error('Device web app is larger than the LittleFS budget')
  process.exit(1)
}
