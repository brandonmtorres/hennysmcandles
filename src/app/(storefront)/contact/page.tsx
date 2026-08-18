import type { Metadata } from 'next'
import { ContactForm } from '@/components/layout/ContactForm'
import { ScriptText } from '@/components/brand/ScriptText'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Questions about a scent, an order, or a custom batch? Send Hennys a message.',
}

const FAQ = [
  {
    q: 'How long does an order take to ship?',
    a: 'One to two days for anything in stock. Everything is packed by hand, so orders placed over a weekend go out on Monday.',
  },
  {
    q: 'Are the crystals real?',
    a: 'Yes. Amethyst, black tourmaline, clear quartz, carnelian, obsidian, pyrite and rose quartz, set into the surface of the wax by hand. Lift yours out when the candle is finished and keep it.',
  },
  {
    q: 'What is the wax made of?',
    a: '100% natural soy wax with phthalate-free fragrance oil and a lead-free cotton wick. No paraffin, no dyes.',
  },
  {
    q: 'Do you take custom or wedding orders?',
    a: 'Often, depending on the season and the size of the batch. Send a message with roughly what you have in mind and Hennys will tell you what is possible.',
  },
  {
    q: 'Something arrived broken. What now?',
    a: 'Send a photo within 14 days and it will be replaced or refunded, no argument.',
  },
]

export default function ContactPage() {
  return (
    <>
      <header className="veil border-b border-wax/8 px-5 pb-14 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <p className="label text-gild/90">Contact</p>
          <h1 className="display-lg mt-5 max-w-[16ch] text-wax">
            Say <ScriptText className="text-gild">hello</ScriptText>
          </h1>
          <p className="lede mt-6 max-w-[48ch]">
            Questions about a scent, an order, or a custom batch go straight to Hennys.
            Expect a reply within a day or two.
          </p>
        </div>
      </header>

      <section className="veil-deep px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <ContactForm />

          <div>
            <h2 className="display-md text-wax">Answered already</h2>
            <dl className="mt-10">
              {FAQ.map((item, i) => (
                <div
                  key={item.q}
                  className="reveal border-t border-wax/12 py-6 first:border-t-0 first:pt-0"
                  style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}
                >
                  <dt className="text-[16px] leading-snug text-wax">{item.q}</dt>
                  <dd className="mt-2.5 max-w-[54ch] text-[14.5px] leading-relaxed text-smoke">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-12 border-t border-wax/12 pt-8">
              <p className="label mb-4 text-wax">Elsewhere</p>
              <a
                href="https://instagram.com/hennysm.candles"
                target="_blank"
                rel="noreferrer noopener"
                className="text-[15px] text-smoke underline decoration-wax/20 underline-offset-[6px] transition-colors hover:text-gild hover:decoration-gild"
              >
                @hennysm.candles
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
