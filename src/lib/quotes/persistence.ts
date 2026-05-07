import {
  acceptDemoQuote,
  createDemoPdfExport,
  createDemoQuote,
  deleteDemoQuote,
  deleteDemoQuoteQuoterSignature,
  getDemoAuditEvents,
  getDemoClientQuoteView,
  getDemoPipelineCurrency,
  getDemoQuote,
  getDemoQuoteTemplate,
  listDemoQuoteTemplates,
  listDemoQuoteDocumentSignatures,
  listDemoLineItemData,
  getDemoQuoteVersions,
  lockDemoQuote,
  markDemoQuoteForWetSignature,
  createDemoQuoteTemplate,
  createDemoLineItemData,
  createDemoLineItemDataBatch,
  deleteDemoQuoteTemplateRecord,
  listDemoQuotes,
  deleteDemoLineItemData,
  placeDemoSignature,
  setDefaultDemoQuoteTemplate,
  ensureDemoQuoteShareLinks,
  sendDemoQuote,
  updateDemoLineItemData,
  updateDemoPipelineCurrency,
  updateDemoQuoteTemplateRecord,
  updateDemoQuoteTemplate,
  updateDemoQuote,
  updateDemoQuoteVisibility,
  updateDemoQuoteQuoterSignature,
  uploadDemoLineItemDataImage,
} from "@/lib/demo/store";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { renderQuotePdf } from "@/lib/pdf/render-pdf";
import type { QuoteTemplate } from "@/lib/quote-templates/types";
import type { LineItemDataDraft } from "@/lib/line-item-data/types";
import type {
  QuoteDraft,
  QuoteVisibility,
  SourceMethod,
} from "@/lib/quotes/types";
import {
  acceptSupabaseQuote,
  createSupabasePdfExport,
  createSupabaseQuote,
  createSupabaseQuoteTemplate,
  deleteSupabaseQuote,
  deleteSupabaseQuoteTemplateRecord,
  deleteSupabaseQuoteQuoterSignature,
  getSupabaseClientQuoteView,
  getSupabasePipelineCurrency,
  getSupabaseWorkspaceMembershipRole,
  getSupabaseQuote,
  getSupabaseQuoteTemplate,
  getSupabaseWorkspaceUsage,
  listSupabaseLineItemData,
  listSupabaseQuoteDocumentSignatures,
  createSupabaseLineItemData,
  createSupabaseLineItemDataBatch,
  deleteSupabaseLineItemData,
  listSupabaseAuditEvents,
  listSupabaseQuoteVersions,
  listSupabaseQuotes,
  listSupabaseQuoteTemplates,
  lockSupabaseQuote,
  markSupabaseQuoteForWetSignature,
  placeSupabaseSignature,
  recordSupabaseWetSignaturePrint,
  setSupabaseDefaultQuoteTemplate,
  ensureSupabaseQuoteShareLinks,
  sendSupabaseQuote,
  updateSupabaseLineItemData,
  updateSupabasePipelineCurrency,
  updateSupabaseQuoteTemplateRecord,
  updateSupabaseQuoteTemplate,
  updateSupabaseQuote,
  updateSupabaseQuoteVisibility,
  updateSupabaseQuoteQuoterSignature,
  uploadSupabaseLineItemDataImage,
  type QuoterContext,
  type WorkspaceUsageSummary,
} from "@/lib/quotes/supabase-store";

export type { QuoterContext };
export type { WorkspaceUsageSummary };

function shouldUseDemoPersistence() {
  return process.env.NODE_ENV !== "production" && !hasSupabaseAdminConfig();
}

export function usesDemoPersistence() {
  return shouldUseDemoPersistence();
}

export async function listQuotes(
  quoter: QuoterContext,
  options: { visibility?: QuoteVisibility } = {},
) {
  if (shouldUseDemoPersistence()) {
    return listDemoQuotes(options);
  }

  return listSupabaseQuotes(quoter, options);
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

export async function listQuoteTemplates(quoter: QuoterContext) {
  if (shouldUseDemoPersistence()) {
    return listDemoQuoteTemplates();
  }

  return listSupabaseQuoteTemplates(quoter);
}

export async function createQuoteTemplate(
  quoter: QuoterContext,
  input: { name: string; content?: QuoteTemplate },
) {
  if (shouldUseDemoPersistence()) {
    return createDemoQuoteTemplate(input);
  }

  return createSupabaseQuoteTemplate(quoter, input);
}

export async function updateQuoteTemplateRecord(
  quoter: QuoterContext,
  templateId: string,
  input: { name?: string; content?: QuoteTemplate },
) {
  if (shouldUseDemoPersistence()) {
    return updateDemoQuoteTemplateRecord(templateId, input);
  }

  return updateSupabaseQuoteTemplateRecord(quoter, templateId, input);
}

export async function deleteQuoteTemplateRecord(
  quoter: QuoterContext,
  templateId: string,
) {
  if (shouldUseDemoPersistence()) {
    return deleteDemoQuoteTemplateRecord(templateId);
  }

  return deleteSupabaseQuoteTemplateRecord(quoter, templateId);
}

export async function setDefaultQuoteTemplate(
  quoter: QuoterContext,
  templateId: string,
) {
  if (shouldUseDemoPersistence()) {
    return setDefaultDemoQuoteTemplate(templateId);
  }

  return setSupabaseDefaultQuoteTemplate(quoter, templateId);
}

export async function getWorkspaceUsage(
  quoter: QuoterContext,
): Promise<WorkspaceUsageSummary> {
  if (shouldUseDemoPersistence()) {
    const now = new Date().toISOString();

    return {
      workspaceId: "demo_org",
      workspaceRef: quoter.organizationId,
      workspaceCreatedAt: now,
      lockedQuoteCount: 0,
      wetSignaturePrintCount: 0,
    };
  }

  return getSupabaseWorkspaceUsage(quoter);
}

export async function getWorkspaceMembershipRole(quoter: QuoterContext) {
  if (shouldUseDemoPersistence()) {
    return "owner" as const;
  }

  return getSupabaseWorkspaceMembershipRole(quoter);
}

export async function recordWetSignaturePrint(
  quoter: QuoterContext,
  quoteId: string,
) {
  if (shouldUseDemoPersistence()) {
    return true;
  }

  return recordSupabaseWetSignaturePrint(quoter, quoteId);
}

export async function getPipelineCurrency(quoter: QuoterContext) {
  if (shouldUseDemoPersistence()) {
    return getDemoPipelineCurrency();
  }

  return getSupabasePipelineCurrency(quoter);
}

export async function updatePipelineCurrency(
  quoter: QuoterContext,
  currency: string,
) {
  if (shouldUseDemoPersistence()) {
    return updateDemoPipelineCurrency(currency);
  }

  return updateSupabasePipelineCurrency(quoter, currency);
}

export async function listLineItemData(quoter: QuoterContext) {
  if (shouldUseDemoPersistence()) {
    return listDemoLineItemData();
  }

  return listSupabaseLineItemData(quoter);
}

export async function createLineItemData(
  quoter: QuoterContext,
  draft: LineItemDataDraft,
) {
  if (shouldUseDemoPersistence()) {
    return createDemoLineItemData(draft);
  }

  return createSupabaseLineItemData(quoter, draft);
}

export async function createLineItemDataBatch(
  quoter: QuoterContext,
  drafts: LineItemDataDraft[],
) {
  if (shouldUseDemoPersistence()) {
    return createDemoLineItemDataBatch(drafts);
  }

  return createSupabaseLineItemDataBatch(quoter, drafts);
}

export async function updateLineItemData(
  quoter: QuoterContext,
  lineItemDataId: string,
  draft: LineItemDataDraft,
) {
  if (shouldUseDemoPersistence()) {
    return updateDemoLineItemData(lineItemDataId, draft);
  }

  return updateSupabaseLineItemData(quoter, lineItemDataId, draft);
}

export async function deleteLineItemData(
  quoter: QuoterContext,
  lineItemDataId: string,
) {
  if (shouldUseDemoPersistence()) {
    return deleteDemoLineItemData(lineItemDataId);
  }

  return deleteSupabaseLineItemData(quoter, lineItemDataId);
}

export async function uploadLineItemDataImage(
  quoter: QuoterContext,
  file: File,
) {
  if (shouldUseDemoPersistence()) {
    return uploadDemoLineItemDataImage(file);
  }

  return uploadSupabaseLineItemDataImage(quoter, file);
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

export async function markQuoteForWetSignature(
  quoter: QuoterContext,
  quoteId: string,
) {
  if (shouldUseDemoPersistence()) {
    return markDemoQuoteForWetSignature(quoteId);
  }

  return markSupabaseQuoteForWetSignature(quoter, quoteId);
}

export async function lockQuote(quoter: QuoterContext, quoteId: string) {
  if (shouldUseDemoPersistence()) {
    return lockDemoQuote(quoteId);
  }

  return lockSupabaseQuote(quoter, quoteId);
}

export async function updateQuoteVisibility(
  quoter: QuoterContext,
  quoteId: string,
  visibility: QuoteVisibility,
) {
  if (shouldUseDemoPersistence()) {
    return updateDemoQuoteVisibility(quoteId, visibility);
  }

  return updateSupabaseQuoteVisibility(quoter, quoteId, visibility);
}

export async function deleteQuote(quoter: QuoterContext, quoteId: string) {
  if (shouldUseDemoPersistence()) {
    return deleteDemoQuote(quoteId);
  }

  return deleteSupabaseQuote(quoter, quoteId);
}

export async function updateQuoteQuoterSignature(
  quoter: QuoterContext,
  input: {
    quoteId: string;
    imageBase64: string;
    sourceMethod: SourceMethod;
  },
) {
  if (shouldUseDemoPersistence()) {
    return updateDemoQuoteQuoterSignature(input);
  }

  return updateSupabaseQuoteQuoterSignature(quoter, input);
}

export async function deleteQuoteQuoterSignature(
  quoter: QuoterContext,
  quoteId: string,
) {
  if (shouldUseDemoPersistence()) {
    return deleteDemoQuoteQuoterSignature(quoteId);
  }

  return deleteSupabaseQuoteQuoterSignature(quoter, quoteId);
}

export async function sendQuote(quoter: QuoterContext, quoteId: string) {
  if (shouldUseDemoPersistence()) {
    return sendDemoQuote(quoteId);
  }

  return sendSupabaseQuote(quoter, quoteId);
}

export async function ensureQuoteShareLinks(
  quoter: QuoterContext,
  quoteId: string,
) {
  if (shouldUseDemoPersistence()) {
    return ensureDemoQuoteShareLinks(quoteId);
  }

  return ensureSupabaseQuoteShareLinks(quoter, quoteId);
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

export async function listQuoteDocumentSignatures(
  quoter: QuoterContext,
  quoteId: string,
  quoteVersionId: string,
) {
  if (shouldUseDemoPersistence()) {
    return listDemoQuoteDocumentSignatures(quoteId, quoteVersionId);
  }

  return listSupabaseQuoteDocumentSignatures(quoter, quoteId, quoteVersionId);
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
