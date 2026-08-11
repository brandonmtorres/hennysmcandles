import { chromium } from 'playwright-core'
import fs from 'node:fs'
const EXE = fs.readdirSync('/root/.cache/ms-playwright').filter(d=>d.startsWith('chromium-')).sort().reverse()
  .map(d=>`/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`).find(p=>fs.existsSync(p))
const b = await chromium.launch({executablePath:EXE, args:['--no-sandbox']})
const p = await b.newPage({viewport:{width:1440,height:900}, deviceScaleFactor:1})
await p.goto('http://localhost:3000/', {waitUntil:'networkidle'})
await p.waitForTimeout(700)

const info = await p.evaluate(() => {
  const img = [...document.querySelectorAll('img')].find(i => i.src.includes('black-sea-mist-lit'))
  const box = img.getBoundingClientRect()
  return { left: Math.round(box.left), width: Math.round(box.width), height: Math.round(box.height),
           naturalW: img.naturalWidth, naturalH: img.naturalHeight }
})
console.log('image box:', JSON.stringify(info))
const scale = Math.max(info.width/info.naturalW, info.height/info.naturalH)
console.log(`scaled: ${Math.round(info.naturalW*scale)}x${Math.round(info.naturalH*scale)} → horizontal overflow ${Math.round(info.naturalW*scale - info.width)}px`)

for (const pos of ['35%','50%','65%','80%']) {
  await p.evaluate((v) => {
    const img = [...document.querySelectorAll('img')].find(i => i.src.includes('black-sea-mist-lit'))
    img.style.objectPosition = v + ' center'
  }, pos)
  await p.waitForTimeout(350)
  await p.screenshot({path:`/tmp/shots/crop-${pos.replace('%','')}.png`, clip:{x:600,y:0,width:840,height:900}})
}
console.log('wrote crop probes')
await b.close()
