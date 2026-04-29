export type ToggleText = {
  enabled: boolean;
  value: string;
};

export type QuoteTemplate = {
  logo: {
    enabled: boolean;
    dataUrl?: string;
  };
  company: {
    name: ToggleText;
    address: string;
    telephone: ToggleText;
    phone: ToggleText;
    email: ToggleText;
    vatRegTin: ToggleText;
    dateLabel: string;
    showQuoteNumber: boolean;
  };
  offerTitle: ToggleText;
  customer: {
    clientNameLabel: string;
    clientCompany: ToggleText;
    address: ToggleText;
    email: ToggleText;
    contactNumber: ToggleText;
  };
  requestSummary: ToggleText;
  lineItems: {
    showItemNumber: boolean;
    showDescriptionPicture: boolean;
    detailedDescriptionLabel: string;
    showQuantity: boolean;
    unit: {
      enabled: boolean;
      options: string[];
    };
    unitPrice: {
      currency: string;
      display: "symbol" | "text";
    };
    vat: {
      enabled: boolean;
      mode: "inclusive" | "exclusive";
      rate: number;
    };
  };
  paymentTerms: string;
  termsAndConditions: string;
  signature: {
    clientNameInputEnabled: boolean;
    nameCase: "uppercase" | "title";
  };
  footer: ToggleText;
};
