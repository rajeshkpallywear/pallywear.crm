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
  assignedTo?: string;
  assignedToName?: string;
  status?: string;
  description?: string;
  isOnlineLead?: boolean | number;
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
  creatorRole?: string;
  leadId: string;
  designName?: string;
  designAmount?: number;
  designGst?: number;
  designDiscount?: number;
  designNotes?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  ACCOUNTS = 'accounts',
  ORDER_MANAGEMENT = 'order_management',
  PRODUCTION = 'production',
  DELIVERY = 'delivery',
  MARKETING = 'marketing',
  DESIGNER = 'designer',
  DIGITIZER = 'digitizer',
  ONLINETEAM = 'onlineteam',
  VENDOR = 'vendor',
  INVENTORY_MANAGEMENT = 'inventory_management',
  HR = 'hr'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  password?: string;
  status?: 'Active' | 'Blocked' | string;
  isBlocked?: boolean;
  faceRegistered?: boolean;
  faceData?: string;
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACCOUNTS = 'accounts',
  DESIGN = 'design',
  ORDER_MANAGEMENT = 'order_management',
  PRODUCTION = 'production',
  DELIVERY = 'delivery',
  DELIVERED = 'delivered',
  HOLD = 'hold'
}

export interface SizeBreakdown {
  category: string;
  size: string;
  quantity: number;
  price: number;
  colour?: string;
  printType?: string;
  sleeve?: string;
  pocket?: string;
  material?: string;
  model?: string;
}

export interface Financials {
  totalAmount: number;
  advancePay: number;
  balanceAmount: number;
}

export interface Order {
  id: string;
  customerInfo: {
    name: string;
    phone: string;
    address: string;
  };
  category: string;
  quantity: number;
  details: Record<string, any>;
  sizeBreakdown: SizeBreakdown[];
  financials: Financials;
  status: OrderStatus;
  isUrgent?: boolean;
  notes?: string;
  staffImages: string[];
  staffPdfs: string[];
  staffAttachments?: string[];
  accountsAttachments: string[];
  orderManagementAttachments: string[];
  designAttachments?: string[];
  machineFiles?: string[];
  sentByAccounts?: boolean;
  createdAt: number;
  updatedAt: number;
  holdReason?: string;
  previousStatus?: OrderStatus;
  assignedDesigner?: string;
  createdBy?: string;
  createdByName?: string;
  clientName?: string;
  designName?: string;
  designAmount?: number;
  designGst?: number;
  designDiscount?: number;
  designNotes?: string;
  accountsNotes?: string;
  original_design_file?: string;
  original_design_filename?: string;
  original_design_zip?: string;
  original_design_zip_filename?: string;
  marketing_image?: string;
  marketing_notes?: string;
  claimedBy?: string;
  claimedByName?: string;
  claimedAt?: number;
  designCompleted?: boolean;
  designSentToMarketing?: boolean;
  designCompletedAt?: number;
}

export interface InventoryMovement {
  id: string;
  type: 'inward' | 'outward';
  vendor?: string;
  customer?: string;
  date: string;
  transportName?: string;
  transportNumber?: string;
  orderId?: string;
  product: string;
  productType: string;
  sleeve?: string;
  pocket?: string;
  quantity: number;
  colour?: string;
  gsm?: string;
  size?: string;
  createdAt: number;
}

export interface SidebarMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  attachment?: string;
  recipientId?: string;
  createdAt: number;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day' | 'Paid Leave' | 'Unpaid Leave';

export interface StaffAttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string; // HH:MM AM/PM
  checkOutTime?: string; // HH:MM AM/PM
  workHours: number;
  overtimeHours?: number;
  notes?: string;
  verificationMode?: 'Biometric' | 'System' | 'Manual' | 'Face ID';
  createdAt?: number;
  updatedAt?: number;
}

export interface EmployeeSalaryProfile {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  epfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  pfNumber?: string;
  designation?: string;
  updatedAt?: number;
}

export interface SalarySlip {
  id: string;
  slipNumber: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  designation?: string;
  month: string; // e.g., 'September'
  year: number; // e.g., 2026
  workingDays: number;
  presentDays: number;
  paidLeaves: number;
  unpaidLeaves: number;
  basicSalary: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  bonus: number;
  incentive: number;
  overtimePay: number;
  grossEarnings: number;
  epfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  tdsDeduction: number;
  lopDeduction: number;
  advanceDeduction: number;
  totalDeductions: number;
  netSalary: number;
  status: 'Paid' | 'Pending' | 'Processing';
  paymentDate?: string;
  paymentMethod?: 'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque';
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  pfNumber?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

