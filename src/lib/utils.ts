import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Invoice, Order } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayCategory(order: { category?: string; sizeBreakdown?: { category: string }[] }) {
  if (order.sizeBreakdown && order.sizeBreakdown.length > 0) {
    const categories = Array.from(new Set(order.sizeBreakdown.map(i => i.category)));
    if (categories.length === 1) return categories[0];
    return 'Mixed Order';
  }
  return order.category || 'General';
}

export function calculateOrderSize(order: any): number {
  try {
    return encodeURI(JSON.stringify(order)).split(/%..|./).length - 1;
  } catch (e) {
    return 0;
  }
}

export function isOrderSizeValid(order: any, extraSize: number = 0): boolean {
  const currentSize = calculateOrderSize(order);
  const totalSize = currentSize + extraSize;
  const limit = 100000000; // 100MB MySQL limit

  if (totalSize > limit) {
    console.warn(`Order size validation failed: ${(totalSize / 1024).toFixed(0)}KB exceeds ${limit / 1024}KB limit`);
  }

  return totalSize < limit;
}

export function shareOrderToWhatsApp(order: Order) {
  try {
    const customer = order.customerInfo || {};
    const defaultPhone = (customer.phone || '').trim();
    
    const phoneInput = prompt(
      "Enter the WhatsApp phone number (with country code, e.g. 919876543210) to share this order.\n\nLeave empty to pick any contact directly inside WhatsApp:",
      defaultPhone
    );

    if (phoneInput === null) return; // User cancelled

    const phone = phoneInput.trim();
    const sizeLines = order.sizeBreakdown && order.sizeBreakdown.length > 0
      ? order.sizeBreakdown.map(s => `• ${s.category || 'Item'}: ${s.size || 'Standard'} (Qty: ${s.quantity || 1}) - ₹${((s.price || 0) * (s.quantity || 1)).toLocaleString('en-IN')}${s.colour ? ` | ${s.colour}` : ''}${s.printType ? ` | ${s.printType}` : ''}`).join('\n')
      : `• ${order.category || 'Order'} - Qty: ${order.quantity || 1}`;

    const totalAmt = order.financials?.totalAmount ?? (order as any).totalAmount ?? 0;
    const advance = order.financials?.advancePay ?? (order as any).advancePay ?? 0;
    const balance = order.financials?.balanceAmount ?? (order as any).balanceAmount ?? (totalAmt - advance);

    const message = `Hello *${customer.name || 'Valued Customer'}*,\n\n` +
      `Thank you for your order with *Pallywear*!\n\n` +
      `📦 *Order Details:* #${String(order.id).slice(-6).toUpperCase()}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `• *Category:* ${order.category || 'Apparel'}\n` +
      `• *Total Quantity:* ${order.quantity || 1} units\n` +
      `• *Status:* ${String(order.status || 'Received').toUpperCase()}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *Items / Breakdown:*\n${sizeLines}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Financial Summary:*\n` +
      `• Total Amount: ₹${Number(totalAmt).toLocaleString('en-IN')}\n` +
      (advance > 0 ? `• Advance Paid: ₹${Number(advance).toLocaleString('en-IN')}\n` : '') +
      `• Balance Due: ₹${Number(balance).toLocaleString('en-IN')}\n` +
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

