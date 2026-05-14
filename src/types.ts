export type LeadType = 'Hot' | 'Warm' | 'Cold';

export interface Lead {
  id: string;
  name: string;
  number: string;
  companyName: string;
  gst: string;
  leadType: LeadType;
  entryDate: string;
  forecastedValue: number;
  convertedValue: number;
  totalOrderValue: number;
  discountCode?: string;
  discountAmount?: number;
  netTotal?: number;
  createdBy: string; // User ID
  createdByName: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  rate: number;
  quantity: number;
  tax: number;
  discount: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  createdAt: string;
  dueDate: string;
  fromName: string;
  fromEmail: string;
  fromPhone: string;
  fromAddress: string;
  billToName: string;
  billToEmail: string;
  billToPhone: string;
  billToAddress: string;
  shipToAddress?: string;
  trackingNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  salesTax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  paymentInstructions?: string;
  paymentMethod?: 'GPay' | 'PhonePay' | 'Cash' | 'Account' | 'UPI';
  productType?: string;
  productSubCategory?: string;
  customerPhoneNumber?: string;
  companySignature?: string;
  bankName?: string;
  bankAccountName?: string;
  bankIfscCode?: string;
  bankAccountNumber?: string;
  createdBy: string;
  createdByName: string;
  leadId: string;
}
