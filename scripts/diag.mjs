import { chromium } from 'playwright-core'
import fs from 'node:fs'
const EXE = fs.readdirSync('/root/.cache/ms-playwright').filter(d=>d.startsWith('chromium-')).sort().reverse()
  .map(d=>`/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`).find(p=>fs.existsSync(p))
const b = await chromium.launch({executablePath:EXE, args:['--no-sandbox']})
const p = await b.newPage({viewport:{width:1440,height:900}})
p.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,300)))
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE:', m.text().slice(0,200)) })

await p.goto('http://localhost:3000/products', {waitUntil:'domcontentloaded'})
await p.waitForTimeout(3000)

const info = await p.evaluate(() => {
  const all = [...document.querySelectorAll('.reveal')]
  return {
    choreoAttr: document.documentElement.getAttribute('data-choreo'),
    total: all.length,
    withIsVisible: all.filter(e=>e.classList.contains('is-visible')).length,
    sample: all.slice(0,4).map(e => {
      const r = e.getBoundingClientRect()
      return {
        tag: e.tagName, cls: e.className.slice(0,50),
        top: Math.round(r.top), height: Math.round(r.height),
        opacity: getComputedStyle(e).opacity,
        isVisible: e.classList.contains('is-visible'),
      }
    }),
  }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
