import { chromium } from 'playwright-core'
import fs from 'node:fs'
const EXE = fs.readdirSync('/root/.cache/ms-playwright').filter(d=>d.startsWith('chromium-')).sort().reverse()
  .map(d=>`/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`).find(p=>fs.existsSync(p))
const b = await chromium.launch({executablePath:EXE, args:['--no-sandbox']})
const p = await b.newPage({viewport:{width:1440,height:900}})
await p.goto('http://localhost:3000/', {waitUntil:'networkidle'})
await p.waitForTimeout(800)
const info = await p.evaluate(() => {
  const img = document.querySelector('section img')
  const box = img.parentElement.getBoundingClientRect()
  return {
    container: {w: Math.round(box.width), h: Math.round(box.height)},
    natural: {w: img.naturalWidth, h: img.naturalHeight},
    objectPosition: getComputedStyle(img).objectPosition,
    sectionH: Math.round(document.querySelector('section').getBoundingClientRect().height),
  }
})
const {container, natural} = info
const scale = Math.max(container.w/natural.w, container.h/natural.h)
const scaledW = natural.w*scale
console.log(JSON.stringify(info, null, 2))
console.log(`scaled image width: ${Math.round(scaledW)}px vs container ${container.w}px → ${Math.round(scaledW-container.w)}px cropped horizontally`)
await b.close()
