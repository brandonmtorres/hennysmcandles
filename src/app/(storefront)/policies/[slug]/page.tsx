import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Policy = {
  title: string
  intro: string
  sections: { heading: string; body: string[] }[]
}

const POLICIES: Record<string, Policy> = {
  shipping: {
    title: 'Shipping & returns',
    intro:
      'Everything is packed by hand in the studio. Here is exactly what to expect.',
    sections: [
      {
        heading: 'Dispatch',
        body: [
          'In-stock orders leave the studio within one to two business days. Orders placed over a weekend go out on Monday.',
          'When a scent is out of stock it is because the batch has genuinely run out, not because a warehouse is slow. Restocks are usually poured within two to three weeks.',
        ],
      },
      {
        heading: 'Delivery and cost',
        body: [
          'Standard shipping is a flat $6.95 and typically arrives in two to five business days. Orders over $75 ship free.',
          'We currently ship to the United States, Canada, the United Kingdom and Australia. International orders may attract customs charges, which are the recipient’s responsibility.',
        ],
      },
      {
        heading: 'If something arrives broken',
        body: [
          'Candles are glass and wax travelling through a parcel network, and occasionally one does not survive. Send a photo within 14 days of delivery and it will be replaced or refunded — whichever you prefer.',
        ],
      },
      {
        heading: 'Returns',
        body: [
          'Unused, unburned candles can be returned within 30 days of delivery for a full refund of the item price. Return postage is yours unless the item arrived damaged or incorrect.',
          'A candle that has been lit cannot be returned, for straightforward hygiene and safety reasons. If a scent genuinely is not working for you, write in anyway — something can usually be sorted out.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy',
    intro:
      'The short version: we collect what is needed to send you a candle, and nothing else.',
    sections: [
      {
        heading: 'What is collected',
        body: [
          'When you place an order: your name, email address, shipping address, and the contents of the order. When you join the mailing list: your email address only. When you write in through the contact form: your name, email address, and message.',
          'Card details are never collected, seen, or stored by this site. Payment is handled entirely by Stripe on their own hosted page.',
        ],
      },
      {
        heading: 'What it is used for',
        body: [
          'Fulfilling your order, emailing you about that order, and — only if you asked for it — occasional notes about new pours. Nothing is sold, rented, or shared with advertisers.',
        ],
      },
      {
        heading: 'Who else sees it',
        body: [
          'Stripe processes payments and receives the information required to do so. A shipping carrier receives your delivery address. An email provider delivers order confirmations. That is the complete list.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'Every marketing email has an unsubscribe link that works immediately. You can request a copy of your data or ask for it to be deleted by writing to hello@hennysmcandles.com; order records required for tax purposes are the one exception.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms & conditions',
    intro: 'The agreement between you and Hennys M. Homemade Candles.',
    sections: [
      {
        heading: 'Orders',
        body: [
          'Placing an order is an offer to buy. It is accepted when the confirmation email is sent. If an item turns out to be unavailable after payment, the order is cancelled and refunded in full.',
          'Prices are shown in US dollars and may change, but never after an order is confirmed.',
        ],
      },
      {
        heading: 'Products',
        body: [
          'Everything is hand-poured, so slight variation in colour, crystal placement, and surface finish between candles is expected — that is the nature of small batches, not a defect.',
          'Crystals and dried botanicals are decorative and sit in the wax, not in the flame. Keep them clear of the wick while burning.',
        ],
      },
      {
        heading: 'Safe use and liability',
        body: [
          'A candle is an open flame. Follow the burning guidance supplied with every order and printed on the site. Never leave a burning candle unattended, and keep it away from children, pets, and anything flammable.',
          'To the extent permitted by law, liability is limited to the value of the product purchased. Nothing here limits liability for death or personal injury caused by negligence.',
        ],
      },
      {
        heading: 'Governing law',
        body: [
          'These terms are governed by the laws of the United States. Questions about any of this can go to hello@hennysmcandles.com.',
        ],
      },
    ],
  },
}

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const policy = POLICIES[slug]
  if (!policy) return { title: 'Not found' }
  return { title: policy.title, description: policy.intro }
}

export default async function PolicyPage({ params }: Params) {
  const { slug } = await params
  const policy = POLICIES[slug]
  if (!policy) notFound()

  return (
    <article className="veil px-5 pb-28 pt-16 sm:px-8 sm:pt-24">
      <div className="mx-auto max-w-3xl">
        <p className="label text-gild/90">Policies</p>
        <h1 className="display-lg mt-5 text-wax">{policy.title}</h1>
        <p className="lede mt-6 max-w-[52ch]">{policy.intro}</p>

        <div className="mt-16">
          {policy.sections.map((section, i) => (
            <section
              key={section.heading}
              className="reveal border-t border-wax/12 py-9 first:border-t-0 first:pt-0"
              style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}
            >
              <h2 className="display-sm text-wax">{section.heading}</h2>
              <div className="prose-hm mt-4 text-[15px] leading-[1.78] text-smoke">
                {section.body.map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-wax/12 pt-8 text-[13px] text-smoke/70">
          Last updated {new Date().toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
          . Questions? Write to hello@hennysmcandles.com.
        </p>
      </div>
    </article>
  )
}
