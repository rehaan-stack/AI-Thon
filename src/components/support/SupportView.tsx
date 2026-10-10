import React from 'react';
import { LifeBuoy, Mail, Phone, ArrowUpRight } from 'lucide-react';

const SUPPORT_EMAIL = 'rehaanbaig8@gmail.com';
const SUPPORT_PHONE = '9390105151';

export function SupportView() {
  return (
    <div className="mx-auto min-h-full w-full max-w-5xl space-y-8 pb-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <LifeBuoy size={25} />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Tabulytix support</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">How can we help?</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Contact us for help with importing files, quality diagnostics, cleaning workflows, or exporting your results.
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2" aria-label="Support contact details">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Mail size={21} />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Email support</p>
          <p className="mt-2 break-all text-base font-bold text-slate-900">{SUPPORT_EMAIL}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
            Send an email <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </a>

        <a
          href={`tel:${SUPPORT_PHONE}`}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Phone size={21} />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Phone support</p>
          <p className="mt-2 text-base font-bold text-slate-900">{SUPPORT_PHONE}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
            Call support <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </a>
      </section>
    </div>
  );
}
