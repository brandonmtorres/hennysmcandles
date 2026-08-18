import type { Metadata } from 'next'
import Link from 'next/link'
import { unsubscribeByToken } from '@/lib/newsletter'
import { ButtonLink } from '@/components/ui/Button'
import { ResubscribeButton } from '@/components/layout/ResubscribeButton'
import { ScriptText } from '@/components/brand/ScriptText'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Unsubscribed',
  robots: { index: false, follow: false },
}

/**
 * One-click unsubscribe.
 *
 * The token in the link is the whole authentication — no sign-in, no form,
 * no "are you sure". Anything that adds friction here gets a sender marked as
 * spam instead, which is worse for everyone. A way back is offered afterwards
 * in case the click was a mistake.
 */
export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await unsubscribeByToken(token)

  return (
    <section className="veil relative flex min-h-[70svh] items-center overflow-hidden px-5 py-24 sm:px-8">
      <div className="mx-auto w-full max-w-xl text-center">
        <span className="mx-auto block text-3xl" aria-hidden="true">
          ☾
        </span>

        {result.ok ? (
          <>
            <p className="label mt-9 text-gild/90">Unsubscribed</p>
            <h1 className="display-md mt-5 text-wax">
              You are off the <ScriptText className="text-gild">list</ScriptText>
            </h1>
            <p className="lede mx-auto mt-6 max-w-[44ch]">
              {result.email ? `${result.email} will not ` : 'You will not '}
              hear from the studio again. No hard feelings — thank you for having
              been here.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
              <ButtonLink href="/products" size="md">
                Keep browsing
              </ButtonLink>
              <ResubscribeButton token={token} />
            </div>
          </>
        ) : (
          <>
            <p className="label mt-9 text-gild/90">That link did not work</p>
            <h1 className="display-md mt-5 text-wax">Nothing to undo here</h1>
            <p className="lede mx-auto mt-6 max-w-[44ch]">
              This unsubscribe link is not one we recognise. It may have already
              been used, or the address may never have been on the list.
            </p>
            <p className="mt-8 text-[14px] text-smoke">
              If you are still receiving emails,{' '}
              <Link
                href="/contact"
                className="text-wax underline decoration-gild/50 underline-offset-[5px] transition-colors hover:text-gild"
              >
                write to Hennys
              </Link>{' '}
              and she will take you off by hand.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
