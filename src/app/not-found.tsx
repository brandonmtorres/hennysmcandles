import Link from 'next/link'
import { ScriptText } from '@/components/brand/ScriptText'

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-pitch px-6 py-24 text-center">
      <div className="max-w-md">
        <span className="block text-4xl" aria-hidden="true">
          ☾
        </span>
        <p className="label mt-9 text-gild/90">Page not found</p>
        <h1 className="display-lg mt-5 text-wax">
          Nothing lit <ScriptText className="text-gild">here</ScriptText>
        </h1>
        <p className="lede mt-5">
          This page has burned down. The collection is still glowing.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3">
          <Link
            href="/products"
            className="label-sm text-wax underline decoration-gild/50 underline-offset-[6px] transition-colors hover:text-gild"
          >
            Explore the collection
          </Link>
          <Link
            href="/"
            className="label-sm text-smoke underline decoration-wax/20 underline-offset-[6px] transition-colors hover:text-wax"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  )
}
