import { ArrowRight, Send, CheckCircle2, Form } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LinkButton } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app-config";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950">
      <section
        className="relative min-h-screen overflow-hidden bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/Business%20Agreement.jpg')" }}
      >
        <div className="absolute inset-0 bg-stone-950/70" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-6 py-8 sm:px-8 lg:px-10">
          <nav className="flex items-center">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <BrandLogo variant="badge" />
              {APP_NAME}
            </div>
          </nav>
          <div className="max-w-3xl py-16">
            <p className="mb-4 inline-flex rounded-md bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
              For Business that sends custom quotes
            </p>
            <h1 className="text-5xl font-bold leading-tight sm:text-6xl">
              {/* {APP_NAME}  */}
              Your Business Partner that Converts YES to Signed
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-100">
              Create a quotation for your next client for FREE and get a real-time signature and
              close the sale all in one sitting.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/dashboard" size="lg">
                CREATE A QUOTE NOW
                <ArrowRight className="size-5" />
              </LinkButton>
            </div>
          </div>
          <div className="grid gap-3 pb-2 sm:grid-cols-3">
            {[
              ["Create Your Quote", Form],
              ["Send to Client", Send],
              ["Signature in minutes", CheckCircle2],
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
