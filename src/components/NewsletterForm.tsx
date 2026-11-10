'use client';

import { Mail } from 'lucide-react';
import { useServerForm } from './useServerForm';
import { Msg } from './forms';
import { SubmitButton } from './AppleButton';
import { subscribeNewsletter } from '@/app/newsletter-actions';

/** Newsletter sign-up band. Double opt-in: nothing is sent until the person confirms from their inbox. */
export default function NewsletterForm({ source, title = 'Home-care tips, once in a while', blurb = 'Practical guides for Singapore and Malaysia homes: maintenance, warranties and money-saving checks. Unsubscribe any time.' }: { source: 'blog' | 'faq' | 'tools' | 'footer'; title?: string; blurb?: string }) {
  const { state, pending, formProps, formKey } = useServerForm(subscribeNewsletter, { resetOnSuccess: true });
  return (
    <section aria-labelledby={`nl-${source}`} className="rounded-[28px] border bg-surface p-6 hairline sm:p-8" data-testid="newsletter">
      <div className="flex items-start gap-4">
        <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tint/10 text-tint sm:grid"><Mail className="h-6 w-6" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 id={`nl-${source}`} className="text-[22px] font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-[15px] text-secondary">{blurb}</p>
          <form key={formKey} {...formProps} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="source" value={source} />
            {/* honeypot: hidden from people, filled by bots */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />
            <label className="min-w-0 flex-1"><span className="sr-only">E-mail address</span><input type="email" name="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" className="input" aria-label="E-mail address for the newsletter" /></label>
            <SubmitButton pending={pending}>Subscribe</SubmitButton>
          </form>
          <div className="mt-2" role="status"><Msg state={state} /></div>
          <p className="mt-2 text-[12px] text-secondary">We e-mail only when we have something useful. See our privacy policy.</p>
        </div>
      </div>
    </section>
  );
}
