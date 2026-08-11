import { chromium } from 'playwright-core'
import fs from 'node:fs'
const EXE = fs.readdirSync('/root/.cache/ms-playwright').filter(d=>d.startsWith('chromium-')).sort().reverse()
  .map(d=>`/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`).find(p=>fs.existsSync(p))
const [,,file,name,width='760'] = process.argv
const b = await chromium.launch({executablePath:EXE, args:['--no-sandbox']})
const p = await b.newPage({viewport:{width:Number(width),height:1000}, deviceScaleFactor:2})
await p.goto('file://'+fs.realpathSync(file), {waitUntil:'networkidle'})
await p.screenshot({path:`/tmp/shots/${name}.png`, fullPage:true})
console.log(`/tmp/shots/${name}.png`)
await b.close()
