import {
  acceptDemoQuote,
  createDemoPdfExport,
  createDemoQuote,
  getDemoAuditEvents,
  getDemoClientQuoteView,
  getDemoQuote,
  getDemoQuoteTemplate,
  getDemoQuoteVersions,
  listDemoQuotes,
  placeDemoSignature,
  sendDemoQuote,
  updateDemoQuoteTemplate,
  updateDemoQuote,
} from "@/lib/demo/store";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { renderQuotePdf } from "@/lib/pdf/render-pdf";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { QuoteDraft, SourceMethod } from "@/lib/quotes/types";
import {
  acceptSupabaseQuote,
  createSupabasePdfExport,
  createSupabaseQuote,
  getSupabaseClientQuoteView,
  getSupabaseQuote,
  getSupabaseQuoteTemplate,
  listSupabaseAuditEvents,
  listSupabaseQuoteVersions,
  listSupabaseQuotes,
  placeSupabaseSignature,
  sendSupabaseQuote,
  updateSupabaseQuoteTemplate,
  updateSupabaseQuote,
  type QuoterContext,
} from "@/lib/quotes/supabase-store";

export type { QuoterContext };

function shouldUseDemoPersistence() {
  return process.env.NODE_ENV !== "production" && !hasSupabaseAdminConfig();
}

export async function listQuotes(quoter: QuoterContext) {
  if (shouldUseDemoPersistence()) {
    return listDemoQuotes();
  }

  return listSupabaseQuotes(quoter);
}

export async function getQuote(quoter: QuoterContext, quoteId: string) {
  if (shouldUseDemoPersistence()) {
    return getDemoQuote(quoteId);
  }

  return getSupabaseQuote(quoter, quoteId);
}

export async function getQuoteTemplate(quoter: QuoterContext) {
  if (shouldUseDemoPersistence()) {
    return getDemoQuoteTemplate();
  }

  return getSupabaseQuoteTemplate(quoter);
}

export async function updateQuoteTemplate(
  quoter: QuoterContext,
  template: QuoteTemplate,
) {
  if (shouldUseDemoPersistence()) {
    return updateDemoQuoteTemplate(template);
  }

  return updateSupabaseQuoteTemplate(quoter, template);
}

export async function createQuote(
  quoter: QuoterContext,
  draft: QuoteDraft,
) {
  if (shouldUseDemoPersistence()) {
    return createDemoQuote(draft);
  }

  return createSupabaseQuote(quoter, draft);
}

export async function updateQuote(
  quoter: QuoterContext,
  quoteId: string,
  draft: QuoteDraft,
) {
  if (shouldUseDemoPersistence()) {
    return updateDemoQuote(quoteId, draft);
  }

  return updateSupabaseQuote(quoter, quoteId, draft);
}

export async function sendQuote(quoter: QuoterContext, quoteId: string) {
  if (shouldUseDemoPersistence()) {
    return sendDemoQuote(quoteId);
  }

  return sendSupabaseQuote(quoter, quoteId);
}

export async function getClientQuoteView(token: string) {
  if (shouldUseDemoPersistence()) {
    return getDemoClientQuoteView(token);
  }

  return getSupabaseClientQuoteView(token);
}

export async function placeSignature(input: {
  token: string;
  signatureFieldId: string;
  imageBase64: string;
  sourceMethod: SourceMethod;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (shouldUseDemoPersistence()) {
    return placeDemoSignature(input);
  }

  return placeSupabaseSignature(input);
}

export async function acceptQuote(input: {
  token: string;
  typedName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (shouldUseDemoPersistence()) {
    return acceptDemoQuote(input);
  }

  return acceptSupabaseQuote(input);
}

export async function listQuoteVersions(
  quoter: QuoterContext,
  quoteId: string,
) {
  if (shouldUseDemoPersistence()) {
    return getDemoQuoteVersions(quoteId);
  }

  return listSupabaseQuoteVersions(quoter, quoteId);
}

export async function listAuditEvents(
  quoter: QuoterContext,
  quoteId: string,
) {
  if (shouldUseDemoPersistence()) {
    return getDemoAuditEvents(quoteId);
  }

  return listSupabaseAuditEvents(quoter, quoteId);
}

export async function createQuotePdfExport(
  quoter: QuoterContext,
  quoteId: string,
) {
  if (shouldUseDemoPersistence()) {
    const exportRecord = createDemoPdfExport(quoteId);
    const version = getDemoQuoteVersions(quoteId).at(-1);

    if (!exportRecord || !version) {
      return null;
    }

    const rendered = await renderQuotePdf({
      quoteId,
      quoteVersionId: version.id,
      requestedByClerkUserId: quoter.clerkUserId,
    });

    return {
      exportRecord,
      version,
      sha256: rendered.sha256,
    };
  }

  return createSupabasePdfExport(quoter, quoteId);
}
