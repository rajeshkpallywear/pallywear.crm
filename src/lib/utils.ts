import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Invoice, Order } from '../types';
export { downloadFile } from './fileDownload';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayCategory(order?: any): string {
  if (!order) return 'General';
  if (typeof order === 'string') return order.trim() || 'General';
  if (order.sizeBreakdown && Array.isArray(order.sizeBreakdown) && order.sizeBreakdown.length > 0) {
    const categories = Array.from(new Set(order.sizeBreakdown.map((i: any) => i?.category || i?.name).filter(Boolean)));
    if (categories.length === 1) return (categories[0] as string) || 'General';
    if (categories.length > 1) return 'Mixed Order';
  }
  return order.category || 'General';
}

export function calculateOrderSize(order: any): number {
  try {
    if (!order) return 0;
    const str = typeof order === 'string' ? order : JSON.stringify(order);
    return str ? str.length : 0;
  } catch (e) {
    return 0;
  }
}

export function isOrderSizeValid(order: any, extraSize: number = 0): boolean {
  try {
    const currentSize = calculateOrderSize(order);
    const totalSize = currentSize + extraSize;
    // Allow up to 500MB for production design archives, vectors, and order assets
    const limit = 500 * 1024 * 1024;

    if (totalSize > limit) {
      console.warn(`Order size validation warning: ${(totalSize / (1024 * 1024)).toFixed(1)}MB exceeds limit`);
      return false;
    }

    return true;
  } catch (e) {
    return true;
  }
}

export function shareOrderToWhatsApp(order: Order) {
  try {
    const customer = (order.customerInfo || {}) as any;
    let phone = (customer.phone || order.customerPhone || (order as any).phone || '').toString().trim();

    // If phone is missing, prompt user for number
    if (!phone) {
      const phoneInput = prompt(
        "Enter the customer's WhatsApp phone number (with country code, e.g. 919876543210):\n\nLeave empty to pick contact inside WhatsApp:",
        ""
      );
      if (phoneInput === null) return; // User cancelled
      phone = phoneInput.trim();
    }

    const sizeLines = order.sizeBreakdown && order.sizeBreakdown.length > 0
      ? order.sizeBreakdown.map(s => `• ${s.category || order.category || 'Item'}: ${s.size || 'Standard'} (Qty: ${s.quantity || 1}) - ₹${((s.price || 0) * (s.quantity || 1)).toLocaleString('en-IN')}${s.colour ? ` | ${s.colour}` : ''}${s.printType ? ` | ${s.printType}` : ''}`).join('\n')
      : `• ${order.category || 'Order'} - Qty: ${order.quantity || 1}`;

    const totalAmt = Number(order.financials?.totalAmount ?? (order as any).totalAmount ?? 0);
    const advance = Number(order.financials?.advancePay ?? (order as any).advancePay ?? 0);
    const balance = Number(order.financials?.balanceAmount ?? (order as any).balanceAmount ?? Math.max(0, totalAmt - advance));

    const halfAmt = Math.round(totalAmt * 0.5);
    const fullAmt = totalAmt;

    const rawId = String(order.id || '').replace(/^#/, '');
    const cleanId = rawId.trim();
    const displayOrderId = cleanId.length > 6 ? cleanId.slice(-6).toUpperCase() : cleanId.toUpperCase();

    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://pallywear.com';
    const payLink50 = `${origin}/pay/${encodeURIComponent(cleanId)}?pct=50`;
    const payLink100 = `${origin}/pay/${encodeURIComponent(cleanId)}?pct=100`;

    const customerDisplayName = customer.name || (order as any).customerName || customer.contactPerson || 'Valued Customer';

    const message = `Hello *${customerDisplayName}*,\n\n` +
      `Thank you for your order with *Pallywear*!\n\n` +
      `📦 *Order Details:* #${displayOrderId}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `• *Category:* ${order.category || 'Apparel'}\n` +
      `• *Total Quantity:* ${order.quantity || 1} units\n` +
      `• *Status:* ${String(order.status || 'Received').toUpperCase()}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *Items / Breakdown:*\n${sizeLines}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Financial Summary:*\n` +
      `• Total Amount: ₹${totalAmt.toLocaleString('en-IN')}\n` +
      `• 50% : ₹${halfAmt.toLocaleString('en-IN')}\n` +
      `👉 Pay 50% Online: ${payLink50}\n\n` +
      `• 100 %: ₹${fullAmt.toLocaleString('en-IN')}\n` +
      `👉 Pay 100% Online: ${payLink100}\n` +
      (advance > 0 ? `\n• Paid Amount: ₹${advance.toLocaleString('en-IN')}\n• Pending Pay: ₹${balance.toLocaleString('en-IN')}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `We are processing your order. For any queries, feel free to reply directly to this message.`;

    let whatsappUrl = '';
    if (phone) {
      let cleanPhone = phone.replace(/[^\d+]/g, '');
      if (cleanPhone.length === 10 && !cleanPhone.startsWith('+')) {
        cleanPhone = '91' + cleanPhone;
      } else if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    } else {
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }

    window.open(whatsappUrl, '_blank');
  } catch (err) {
    console.error('Error sharing order to WhatsApp:', err);
    alert('Could not open WhatsApp sharing. Please check order details.');
  }
}

export function shareInvoiceToWhatsApp(invoice: Invoice) {
  try {
    const defaultPhone = (invoice.billToPhone || invoice.customerPhoneNumber || '').trim();
    
    const phoneInput = prompt(
      "Enter the WhatsApp phone number (with country code, e.g. 919876543210) to share this invoice.\n\nLeave empty to pick any contact directly inside WhatsApp:",
      defaultPhone
    );

    if (phoneInput === null) return; // User cancelled

    const phone = phoneInput.trim();
    const itemsList = invoice.items && invoice.items.length > 0
      ? invoice.items.map(item => `• ${item.description || 'Item'} (Qty: ${item.quantity || 1}) - ₹${Number(item.amount || (item.rate * item.quantity) || 0).toLocaleString('en-IN')}`).join('\n')
      : `• ${invoice.productType?.toUpperCase() || 'Product'} (Qty: 1)`;
    
    const total = Number(invoice.total || 0);
    const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'On Demand';

    const message = `Hello *${invoice.billToName || 'Customer'}*,\n\n` +
        `This is a message from *${invoice.fromName || 'Pallywear Gifting Solutions'}*.\n\n` +
        `Here are the details for your Invoice *#${invoice.invoiceNumber || 'NEW'}*:\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `• *Total Amount:* ₹${total.toLocaleString('en-IN')}\n` +
        `• *Due Date:* ${dueDateStr}\n` +
        `• *Payment Method:* ${invoice.paymentMethod || 'GPay'}\n` +
        (itemsList ? `━━━━━━━━━━━━━━━━━━━\n• *Items:*\n${itemsList}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `Please proceed with the payment. Thank you for choosing Pallywear!`;

    let whatsappUrl = '';
    if (phone) {
      let cleanPhone = phone.replace(/[^\d+]/g, '');
      if (cleanPhone.length === 10 && !cleanPhone.startsWith('+')) {
        cleanPhone = '91' + cleanPhone;
      } else if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    } else {
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }

    window.open(whatsappUrl, '_blank');
  } catch (err) {
    console.error('Error sharing invoice to WhatsApp:', err);
    alert('Could not open WhatsApp sharing. Please check invoice details.');
  }
}

