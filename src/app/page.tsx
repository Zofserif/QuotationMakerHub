import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileSignature,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-config";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-100">
      <section className="relative overflow-hidden bg-[url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center text-white">
        <div className="absolute inset-0 bg-stone-950/70" />
        <div className="relative mx-auto flex min-h-[82vh] max-w-7xl flex-col justify-between px-6 py-8 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FileSignature className="size-5" />
              {APP_NAME}
            </div>
            <LinkButton href="/dashboard" variant="secondary" size="sm">
              <LayoutDashboard className="size-4" />
              Dashboard
            </LinkButton>
          </nav>
          <div className="max-w-3xl py-16">
            <p className="mb-4 inline-flex rounded-md bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
              Structured quotes, secure links, browser signatures, PDF export
            </p>
            <h1 className="text-5xl font-bold leading-tight sm:text-6xl">
              {APP_NAME}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-100">
              Create polished quotations, send tokenized client links, collect
              acceptance signatures, and preserve an auditable final version.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/quotes/new" size="lg">
                Create quote
                <ArrowRight className="size-5" />
              </LinkButton>
              <LinkButton href="/dashboard" variant="secondary" size="lg">
                View dashboard
              </LinkButton>
            </div>
          </div>
          <div className="grid gap-3 pb-2 sm:grid-cols-3">
            {[
              ["Immutable versions", ShieldCheck],
              ["Camera signature cleanup", Camera],
              ["Acceptance locking", CheckCircle2],
            ].map(([label, Icon]) => (
              <div
                className="flex items-center gap-3 border-t border-white/25 pt-3 text-sm font-medium text-stone-100"
                key={String(label)}
              >
                <Icon className="size-4" />
                <span>{String(label)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
