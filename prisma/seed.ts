/**
 * Seeds the catalogue, the portal owner account, and store settings.
 *
 * Product names, vessel colours, crystals and sizes are taken from Hennys'
 * real photography. Prices are placeholders — every one of them is editable
 * in the portal at /store-portal/products.
 */
import { PrismaClient } from '@prisma/client'
import { hash } from '@node-rs/argon2'

const prisma = new PrismaClient()

type SeedProduct = {
  slug: string
  name: string
  tagline: string
  scent: string
  description: string
  story: string
  priceCents: number
  stock: number
  crystal: string
  crystalMeaning: string
  scentTop: string
  scentHeart: string
  scentBase: string
  burnTimeHours: number
  featured?: boolean
  onSale?: boolean
  salePercent?: number
  images: { url: string; alt: string }[]
}

const products: SeedProduct[] = [
  {
    slug: 'black-sea-mist',
    name: 'Black Sea Mist',
    tagline: 'Salt air, dark water, and a stone that keeps you steady.',
    scent: 'Sea Salt · Driftwood · Bergamot',
    description:
      'Cool salt spray over warm driftwood, set with raw black tourmaline and dried botanicals. Our most-loved candle.',
    story:
      'This one began on a grey shoreline in early spring — the kind of cold, bright morning where the sea and the sky are the same colour and the air tastes faintly of salt. It is a clean scent, but not a sharp one: bergamot lifts it at the top, driftwood and jasmine hold the middle, and a soft amber base keeps it warm enough to burn all evening. Raw black tourmaline is set into the surface of the wax, ringed with dried botanicals. Tourmaline is the stone people reach for when they want to feel steady — which is, more or less, what this candle is for.',
    priceCents: 3400,
    stock: 14,
    crystal: 'Black Tourmaline',
    crystalMeaning: 'Protection and grounding',
    scentTop: 'Bergamot, Sea Salt',
    scentHeart: 'Driftwood, Night Jasmine',
    scentBase: 'Amber, Soft Musk',
    burnTimeHours: 45,
    featured: true,
    images: [
      { url: '/images/products/black-sea-mist-lit.jpeg', alt: 'Black Sea Mist candle burning beside a piece of raw black tourmaline' },
      { url: '/images/products/black-sea-mist.jpeg', alt: 'Black Sea Mist candle with its moon-embossed lid, showing tourmaline set into the wax' },
    ],
  },
  {
    slug: 'moonlit-snow',
    name: 'Moonlit Snow',
    tagline: 'The hush of the first snow, lit from within.',
    scent: 'Frosted Fir · White Musk · Vanilla',
    description:
      'Cold air and evergreen softened by vanilla and white musk. Quiet, clean, and faintly luminous.',
    story:
      'There is a particular silence to the first real snowfall — everything muffled, the light turned silver-blue. Moonlit Snow is our attempt to bottle that. Frosted fir and a whisper of eucalyptus give it the cold-air opening; white musk and vanilla absolute keep it from ever feeling austere. Clear quartz is set into the wax, which is the stone of clarity and beginnings. Burn it in the last hour before bed, when the house has gone quiet.',
    priceCents: 3200,
    stock: 11,
    crystal: 'Clear Quartz',
    crystalMeaning: 'Clarity and new beginnings',
    scentTop: 'Cold Air Accord, Eucalyptus',
    scentHeart: 'Frosted Fir, Cyclamen',
    scentBase: 'White Musk, Vanilla Absolute',
    burnTimeHours: 45,
    featured: true,
    images: [
      { url: '/images/products/moonlit-snow.jpeg', alt: 'Moonlit Snow candle open on a dark surface beneath a field of stars' },
      { url: '/images/products/moonlit-snow-lit.jpeg', alt: 'A match lowered to the twin wicks of the Moonlit Snow candle' },
    ],
  },
  {
    slug: 'eucalyptus-and-lavender',
    name: 'Eucalyptus & Lavender',
    tagline: 'A long exhale at the end of a long day.',
    scent: 'Eucalyptus · French Lavender · Cedarwood',
    description:
      'Steam-room eucalyptus over true French lavender, grounded with cedar and set with amethyst.',
    story:
      'A customer once wrote that she burns this one in the quiet hours before daylight, and honestly we have not been able to describe it better since. Eucalyptus opens it up like a window; French lavender — the real thing, not the soapy version — settles underneath, and cedarwood keeps it from drifting too sweet. Amethyst is set into the surface, ringed with dried lavender buds. It is the candle we recommend to anyone who says they have trouble slowing down.',
    priceCents: 3400,
    stock: 9,
    crystal: 'Amethyst',
    crystalMeaning: 'Calm and intuition',
    scentTop: 'Eucalyptus, Green Bergamot',
    scentHeart: 'French Lavender, Chamomile',
    scentBase: 'Cedarwood, Powdered Musk',
    burnTimeHours: 45,
    featured: true,
    images: [
      { url: '/images/products/eucalyptus-lavender.jpeg', alt: 'Eucalyptus and Lavender candle burning on marble, surrounded by fresh lavender' },
    ],
  },
  {
    slug: 'amethyst-moon',
    name: 'Amethyst Moon',
    tagline: 'A ritual candle, crowned with amethyst and dried rose.',
    scent: 'Bulgarian Rose · Vanilla Absolute · Sandalwood',
    description:
      'Our ritual edition in a hand-finished periwinkle vessel with a gilded moon lid. Amethyst and rose quartz, set by hand.',
    story:
      'The ritual edition is the one we make most slowly. It is poured into a soft periwinkle vessel and capped with a gilded lid — a crescent moon inside a sunburst, pressed in gold. Bulgarian rose sits at the heart of it, wrapped in vanilla absolute and sandalwood so it reads warm rather than floral. Amethyst and rose quartz are placed by hand around the wick with dried rosebuds between them. Light it when you want the evening to feel like it means something.',
    priceCents: 3800,
    stock: 6,
    crystal: 'Amethyst & Rose Quartz',
    crystalMeaning: 'Intuition and an open heart',
    scentTop: 'Pink Pepper, Bergamot',
    scentHeart: 'Bulgarian Rose, Peony',
    scentBase: 'Vanilla Absolute, Sandalwood',
    burnTimeHours: 40,
    featured: true,
    images: [
      { url: '/images/products/amethyst-moon.jpeg', alt: 'Amethyst Moon ritual candle with its gilded crescent-moon lid, amethyst and dried roses' },
    ],
  },
  {
    slug: 'ginger-apple-spice',
    name: 'Ginger Apple Spice',
    tagline: 'The kitchen at dusk, with cinnamon still in the air.',
    scent: 'Ginger Root · Orchard Apple · Clove',
    description:
      'Fresh ginger and orchard apple over warm clove. Autumn, without the potpourri.',
    story:
      'Most spiced candles go straight to potpourri. This one starts with fresh ginger root instead — bright, a little peppery — and lets orchard apple carry the sweetness so the clove and cinnamon can stay in the background where they belong. Obsidian is set into the wax: a stone for letting things go, which felt right for a scent that belongs to the turning of a season.',
    priceCents: 3000,
    stock: 12,
    crystal: 'Obsidian',
    crystalMeaning: 'Release and renewal',
    scentTop: 'Fresh Ginger Root, Mandarin',
    scentHeart: 'Orchard Apple, Cinnamon Bark',
    scentBase: 'Clove, Tonka Bean',
    burnTimeHours: 45,
    images: [
      { url: '/images/products/ginger-apple-spice.jpeg', alt: 'A match lit above the Ginger Apple Spice candle beside a large green leaf' },
      { url: '/images/products/ginger-apple-spice-alt.jpeg', alt: 'Ginger Apple Spice candle on a black dish with fresh ginger root' },
    ],
  },
  {
    slug: 'mango-and-coconut-milk',
    name: 'Mango & Coconut Milk',
    tagline: 'Somewhere warm, where the light lasts longer.',
    scent: 'Alphonso Mango · Coconut Milk · Tiare Flower',
    description:
      'Ripe mango and soft coconut milk with tiare flower. Golden-hour warmth in an 8 oz vessel.',
    story:
      'Ripe alphonso mango, the creamy part of coconut rather than the sunscreen part, and tiare flower to keep it from turning into dessert. It is the brightest thing we make, and the one people buy in February. Carnelian is set into the wax — a stone associated with warmth and vitality, which is exactly what this candle is doing in the middle of a grey week.',
    priceCents: 3000,
    stock: 15,
    crystal: 'Carnelian',
    crystalMeaning: 'Warmth and vitality',
    scentTop: 'Alphonso Mango, Passionfruit',
    scentHeart: 'Coconut Milk, Tiare Flower',
    scentBase: 'Vanilla, Warm Sandalwood',
    burnTimeHours: 45,
    images: [
      { url: '/images/products/mango-coconut-milk.jpeg', alt: 'Mango and Coconut Milk candle in sunlight with fresh mango and coconut' },
    ],
  },
  {
    slug: 'starry-christmas-night',
    name: 'Starry Christmas Night',
    tagline: 'Midwinter, gold light, and a sky full of quiet.',
    scent: 'Balsam Fir · Orange Peel · Warm Clove',
    description:
      'Our winter edition in a brushed gold vessel. Balsam and orange peel with a gentle clove finish.',
    story:
      'Poured into a brushed gold vessel because midwinter deserves a little shine. Balsam fir is the backbone — resinous and green — and sweet orange peel cuts through it the way a clementine does on a cold afternoon. Clove and a touch of smoked vanilla close it out. Pyrite is set into the wax, the stone of abundance and light. Made in small batches each winter.',
    priceCents: 3600,
    stock: 8,
    crystal: 'Pyrite',
    crystalMeaning: 'Abundance and light',
    scentTop: 'Sweet Orange Peel, Pine Needle',
    scentHeart: 'Balsam Fir, Cinnamon',
    scentBase: 'Warm Clove, Smoked Vanilla',
    burnTimeHours: 45,
    onSale: true,
    salePercent: 15,
    images: [
      { url: '/images/products/starry-christmas-night.jpeg', alt: 'Starry Christmas Night candle in a gold vessel burning beside a fern' },
      { url: '/images/products/starry-christmas-night-lit.jpeg', alt: 'The gold Starry Christmas Night candle glowing beside an open book' },
    ],
  },
]

const settings: Record<string, string> = {
  store_name: 'Hennys M. Homemade Candles',
  store_email: 'support@hennysmcandles.com',
  currency: 'usd',
  // Money values in cents.
  shipping_flat_cents: '695',
  free_shipping_threshold_cents: '7500',
  tax_percent: '0',
  low_stock_threshold: '3',
  newsletter_discount_percent: '10',
  order_number_prefix: 'HM',
  announcement: 'Hand-poured in small batches · Free shipping over $75',
}

async function main() {
  console.log('Seeding Hennys M. Homemade Candles…\n')

  // --- Products -----------------------------------------------------------
  for (const [index, p] of products.entries()) {
    const { images, ...data } = p
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...data, sortOrder: index },
      create: { ...data, sortOrder: index },
    })

    await prisma.productImage.deleteMany({ where: { productId: product.id } })
    await prisma.productImage.createMany({
      data: images.map((img, i) => ({
        productId: product.id,
        url: img.url,
        alt: img.alt,
        sortOrder: i,
      })),
    })
    console.log(`  · ${p.name} — $${(p.priceCents / 100).toFixed(2)} · stock ${p.stock}`)
  }

  // --- Settings -----------------------------------------------------------
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }
  console.log(`\n  · ${Object.keys(settings).length} store settings`)

  // --- Reviews (real, from Hennys' own marketing) -------------------------
  const eucalyptus = await prisma.product.findUnique({
    where: { slug: 'eucalyptus-and-lavender' },
  })
  const reviewCount = await prisma.review.count()
  if (reviewCount === 0) {
    await prisma.review.createMany({
      data: [
        {
          productId: eucalyptus?.id ?? null,
          author: 'Kp',
          rating: 5,
          title: 'Intoxicating fragrance',
          body: 'I received this as a gift, and have enjoyed it to start my day in the quiet hours before daylight. A lovely calming scent.',
        },
        {
          author: 'Marisol R.',
          rating: 5,
          title: 'The crystals are real',
          body: 'I half expected plastic. They are actual stones, set by hand, and the whole thing burns clean down with no tunnelling.',
        },
        {
          author: 'Dana W.',
          rating: 5,
          title: 'Bought one, went back for four',
          body: 'The scent throw fills my whole living room without being overwhelming. Black Sea Mist is the one.',
        },
      ],
    })
    console.log('  · 3 reviews')
  }

  // --- Portal owner -------------------------------------------------------
  const email = process.env.PORTAL_OWNER_EMAIL
  const password = process.env.PORTAL_OWNER_PASSWORD
  if (!email || !password) {
    console.warn('\n  ! PORTAL_OWNER_EMAIL / PORTAL_OWNER_PASSWORD not set — skipping owner account.')
  } else {
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    })
    await prisma.user.upsert({
      where: { email },
      update: {},               // never silently reset an existing password
      create: { email, passwordHash, name: 'Hennys', role: 'OWNER' },
    })
    console.log(`\n  · Portal owner: ${email}`)
  }

  console.log('\nDone.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
