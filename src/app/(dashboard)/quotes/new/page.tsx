import { QuoteEditor } from "@/components/quote-editor/quote-editor";

export default function NewQuotePage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-stone-500">Draft</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-950">
          Create quotation
        </h1>
      </section>
      <QuoteEditor />
    </div>
  );
}
