import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';

interface InvoiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice?: Invoice | null; // if provided, we are editing; else creating
    onSubmit: (invoiceData: any) => Promise<void>;
}

interface InvoiceItemInput {
    id: string;
    productType: string;
    productSubCategory: string;
    size: string;
    unitPrice: number;
    quantity: number;
    taxRate: number;
    discountRate: number;
}

export default function InvoiceFormModal({ isOpen, onClose, invoice, onSubmit }: InvoiceFormModalProps) {
    const { user } = useAuth();
    const products = ['tshirt', 'jersey', 'hoodie', 'bottle', 'pen', 'mug', 'diary', 'keychain', 'cap', 'corporate gift', 'paint', 'shirt'];
    const paymentMethods = ['GPay', 'PhonePay', 'Cash', 'Account', 'UPI'];

    const productSubCategories: Record<string, string[]> = {
        'tshirt': ['blended polo', 'economy polo', 'every day polo', 'feathery polo', 'comfort polo', 'affordable polo', 'round neck 180 gsm'],
        'jersey': ['round neck', 'polo', 'kinds round neck', 'kinds polo'],
        'corporate gift': ['7 in 1', '5 in 1', '4 in 1', '3 in 1', '2 in 1'],
    };

    const productPrices: Record<string, number> = {
        'tshirt': 400,
        'jersey': 650,
        'hoodie': 2000,
        'bottle': 999,
        'pen': 300,
        'mug': 600,
        'diary': 600,
        'keychain': 400,
        'cap': 600,
        'corporate gift': 1000,
        'paint': 1000,
        'shirt': 1000,
    };

    const subCategoryPrices: Record<string, number> = {
        'blended polo': 600,
        'economy polo': 600,
        'every day polo': 700,
        'feathery polo': 800,
        'comfort polo': 900,
        'affordable polo': 500,
        'round neck 180 gsm': 400,
        'round neck': 650,
        'polo': 700,
        'kinds round neck': 600,
        'kinds polo': 650,
    };

    const calculatePrice = (type: string, sub: string) => {
        if (sub && subCategoryPrices[sub]) return subCategoryPrices[sub];
        return productPrices[type] || 0;
    };

    const getInitialData = () => ({
        leadId: `L-${Math.random().toString(36).substring(2, 7)}`,
        invoiceNumber: `QT.${Math.floor(Math.random() * 9000) + 1000}`,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        customerName: '',
        customerCompanyName: '',
        customerNumber: '',
        items: [
            {
                id: 'item-1',
                productType: 'tshirt',
                productSubCategory: '',
                size: '',
                unitPrice: 400,
                quantity: 1,
                taxRate: 5,
                discountRate: 0
            }
        ] as InvoiceItemInput[],
        paymentMethod: 'GPay' as 'GPay' | 'PhonePay' | 'Cash' | 'Account' | 'UPI',
        shippingCost: 0,
        companySignature: 'Rajesh K.',
        bankName: 'HDFC BANK',
        bankAccountName: 'PALLYWEAR PVT LTD',
        bankIfscCode: 'HDFC0008964',
        bankAccountNumber: '50202110682524',
        designName: '',
        designAmount: 0,
        designGst: 0,
        designDiscount: 0,
        designNotes: '',
    });

    const [formData, setFormData] = useState(getInitialData());

    useEffect(() => {
        if (invoice) {
            const mappedItems = invoice.items?.map((item, idx) => {
                let productType = 'tshirt';
                let productSubCategory = '';
                let size = '';

                const desc = item.description || '';
                const parts = desc.split(' - Size: ');
                if (parts.length > 1) {
                    size = parts[1].trim();
                }

                const mainDesc = parts[0].trim();
                const matchedProduct = products.find(p => mainDesc.toLowerCase().startsWith(p.toLowerCase()));
                if (matchedProduct) {
                    productType = matchedProduct;
                    const subMatch = mainDesc.match(/\(([^)]+)\)/);
                    if (subMatch) {
                        productSubCategory = subMatch[1].toLowerCase();
                    }
                } else {
                    const subMatch = mainDesc.match(/\(([^)]+)\)/);
                    if (subMatch) {
                        productSubCategory = subMatch[1].toLowerCase();
                        productType = mainDesc.replace(/\([^)]+\)/, '').trim().toLowerCase();
                    } else {
                        productType = mainDesc.toLowerCase();
                    }
                }

                return {
                    id: item.id || `item-${idx}-${Math.random()}`,
                    productType,
                    productSubCategory,
                    size,
                    unitPrice: item.rate,
                    quantity: item.quantity,
                    taxRate: item.tax ?? 5,
                    discountRate: item.discount ?? 0
                };
            }) || [
                {
                    id: 'item-1',
                    productType: 'tshirt',
                    productSubCategory: '',
                    size: '',
                    unitPrice: 400,
                    quantity: 1,
                    taxRate: 5,
                    discountRate: 0
                }
            ];

            setFormData({
                leadId: invoice.leadId || '',
                invoiceNumber: invoice.invoiceNumber || '',
                dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
                notes: invoice.notes || '',
                customerName: invoice.billToName || '',
                customerCompanyName: invoice.billToAddress || '',
                customerNumber: invoice.billToPhone || '',
                items: mappedItems,
                paymentMethod: invoice.paymentMethod || 'GPay',
                shippingCost: invoice.shippingCost || 0,
                companySignature: invoice.companySignature || 'Rajesh K.',
                bankName: invoice.bankName || 'HDFC BANK',
                bankAccountName: invoice.bankAccountName || 'PALLYWEAR PVT LTD',
                bankIfscCode: invoice.bankIfscCode || 'HDFC0008964',
                bankAccountNumber: invoice.bankAccountNumber || '50202110682524',
                designName: invoice.designName || '',
                designAmount: invoice.designAmount || 0,
                designGst: invoice.designGst || 0,
                designDiscount: invoice.designDiscount || 0,
                designNotes: invoice.designNotes || '',
            });
        } else {
            setFormData(getInitialData());
        }
    }, [invoice, isOpen]);

    const handleItemProductChange = (idx: number, type: string) => {
        const price = calculatePrice(type, '');
        setFormData(prev => {
            const nextItems = [...prev.items];
            nextItems[idx] = {
                ...nextItems[idx],
                productType: type,
                productSubCategory: '',
                unitPrice: price
            };
            return {
                ...prev,
                items: nextItems
            };
        });
    };

    const handleItemSubCategoryChange = (idx: number, sub: string) => {
        const price = calculatePrice(formData.items[idx].productType, sub);
        setFormData(prev => {
            const nextItems = [...prev.items];
            nextItems[idx] = {
                ...nextItems[idx],
                productSubCategory: sub,
                unitPrice: price
            };
            return {
                ...prev,
                items: nextItems
            };
        });
    };

    const handleItemFieldChange = (idx: number, field: keyof InvoiceItemInput, val: any) => {
        setFormData(prev => {
            const nextItems = [...prev.items];
            nextItems[idx] = {
                ...nextItems[idx],
                [field]: val
            };
            return {
                ...prev,
                items: nextItems
            };
        });
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: `item-${Date.now()}-${Math.random()}`,
                    productType: 'tshirt',
                    productSubCategory: '',
                    size: '',
                    unitPrice: 400,
                    quantity: 1,
                    taxRate: 5,
                    discountRate: 0
                }
            ]
        }));
    };

    const handleRemoveItem = (idx: number) => {
        if (formData.items.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let subtotal = 0;
        let discountTotal = 0;
        let salesTax = 0;

        const invoiceItems = formData.items.map((item, idx) => {
            const itemSubtotal = item.unitPrice * item.quantity;
            const itemDiscount = item.discountRate * item.quantity;
            const itemTaxable = Math.max(0, itemSubtotal - itemDiscount);
            const itemTax = (itemTaxable * item.taxRate) / 100;

            subtotal += itemSubtotal;
            discountTotal += itemDiscount;
            salesTax += itemTax;

            const description = `${item.productType.toUpperCase()}${item.productSubCategory ? ` (${item.productSubCategory.toUpperCase()})` : ''}${item.size ? ` - Size: ${item.size.toUpperCase()}` : ''}`;

            return {
                id: item.id || `item-${idx}-${Math.random()}`,
                description,
                rate: item.unitPrice,
                quantity: item.quantity,
                tax: item.taxRate,
                discount: item.discountRate,
                amount: itemSubtotal
            };
        });

        // Add design services
        subtotal += Number(formData.designAmount) || 0;
        discountTotal += Number(formData.designDiscount) || 0;
        const designTaxable = Math.max(0, (Number(formData.designAmount) || 0) - (Number(formData.designDiscount) || 0));
        const designGstVal = (designTaxable * Number(formData.designGst)) / 100;
        salesTax += designGstVal;

        const itemTotalAfterDiscount = Math.max(0, subtotal - discountTotal);
        const shippingCost = formData.shippingCost;
        const total = itemTotalAfterDiscount + salesTax + shippingCost;

        const nextInvoice: Omit<Invoice, 'id'> = {
            invoiceNumber: formData.invoiceNumber,
            date: invoice?.date || new Date().toISOString(),
            createdAt: invoice?.createdAt || new Date().toISOString(),
            dueDate: new Date(formData.dueDate).toISOString(),
            fromName: invoice?.fromName || 'Pallywear Gifting Solutions',
            fromEmail: invoice?.fromEmail || 'pallywear@gmail.com',
            fromPhone: invoice?.fromPhone || '+91 9597528585',
            fromAddress: invoice?.fromAddress || 'Pallywear Gifting Solutions, 49/1, Mudichur Rd, near by Parvathi nagar, Shanthi Nagar, Old Perungalathur, Chennai, Tamil Nadu 600063',
            billToName: formData.customerName,
            billToEmail: `${formData.customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            billToPhone: formData.customerNumber,
            billToAddress: formData.customerCompanyName,
            items: invoiceItems,
            subtotal,
            discountTotal,
            shippingCost,
            salesTax,
            total,
            amountPaid: invoice?.amountPaid || 0,
            balanceDue: total - (invoice?.amountPaid || 0),
            notes: formData.notes,
            paymentMethod: formData.paymentMethod,
            productType: formData.items[0]?.productType || 'tshirt',
            productSubCategory: formData.items[0]?.productSubCategory || '',
            customerPhoneNumber: formData.customerNumber,
            leadId: invoice?.leadId || formData.leadId,
            companySignature: formData.companySignature,
            bankName: formData.bankName,
            bankAccountName: formData.bankAccountName,
            bankIfscCode: formData.bankIfscCode,
            bankAccountNumber: formData.bankAccountNumber,
            createdBy: invoice?.createdBy || user?.id || user?.uid || 'system',
            createdByName: invoice?.createdByName || user?.name || 'System',
            creatorRole: invoice?.creatorRole || user?.role || 'system',
            designName: formData.designName,
            designAmount: Number(formData.designAmount),
            designGst: Number(formData.designGst),
            designDiscount: Number(formData.designDiscount),
            designNotes: formData.designNotes,
        };

        await onSubmit(nextInvoice);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        className="relative bg-white w-full max-w-xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden shadow-black/30 border border-white/20 max-h-[95vh] sm:max-h-[90vh] flex flex-col"
                    >
                        <div className="p-1 flex flex-col h-full overflow-hidden">
                            <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-3 sm:pb-4 flex items-center justify-between flex-shrink-0">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                                        {invoice ? 'Modify Invoice' : 'Generate Invoice'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Multi-Item Billing Solution</p>
                                </div>
                                <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors border-none bg-transparent cursor-pointer">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="px-4 sm:px-8 pb-6 sm:pb-10 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-grow text-left">
                                <div className="space-y-4">
                                    {/* Client Details Section */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Client Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.customerName}
                                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                placeholder="e.g. John Doe"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mobile Number</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.customerNumber}
                                                onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                placeholder="+91 XXXX..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Company / Organization</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.customerCompanyName}
                                            onChange={(e) => setFormData({ ...formData, customerCompanyName: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                            placeholder="Organization Name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Payment via</label>
                                            <select
                                                value={formData.paymentMethod}
                                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                            >
                                                {paymentMethods.map(pm => (
                                                    <option key={pm} value={pm}>{pm}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Shipping Cost (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.shippingCost}
                                                onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Multiple Items Section */}
                                    <div className="border-t border-gray-100 pt-4 mt-2">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary">Invoice Products & Items</h4>
                                            <button
                                                type="button"
                                                onClick={handleAddItem}
                                                className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Add Item
                                            </button>
                                        </div>

                                        <div className="space-y-5">
                                            {formData.items.map((item, idx) => (
                                                <div key={item.id} className="p-4 sm:p-5 bg-gray-50/50 rounded-3xl border border-gray-150 space-y-4 relative text-left">
                                                    {formData.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(idx)}
                                                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:scale-105 transition-all border-none bg-transparent cursor-pointer flex items-center gap-0.5"
                                                        >
                                                            <Trash2 size={12} /> <span className="text-[9px] font-black uppercase tracking-wider">Remove</span>
                                                        </button>
                                                    )}

                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item #{idx + 1}</div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                                            <select
                                                                value={item.productType}
                                                                onChange={(e) => handleItemProductChange(idx, e.target.value)}
                                                                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none capitalize"
                                                            >
                                                                {products.map(p => (
                                                                    <option key={p} value={p}>{p}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {(item.productType === 'tshirt' || item.productType === 'jersey' || item.productType === 'corporate gift') ? (
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Style Selection</label>
                                                                <select
                                                                    value={item.productSubCategory}
                                                                    onChange={(e) => handleItemSubCategoryChange(idx, e.target.value)}
                                                                    className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none capitalize"
                                                                >
                                                                    <option value="">Select Option</option>
                                                                    {(productSubCategories[item.productType] || []).map(s => (
                                                                        <option key={s} value={s}>{s}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Style Selection</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="e.g. Standard"
                                                                    value={item.productSubCategory}
                                                                    onChange={(e) => handleItemFieldChange(idx, 'productSubCategory', e.target.value)}
                                                                    className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Size</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. L, XL, M-10"
                                                                value={item.size}
                                                                onChange={(e) => handleItemFieldChange(idx, 'size', e.target.value)}
                                                                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Price (₹)</label>
                                                            <input
                                                                type="number"
                                                                value={item.unitPrice}
                                                                onChange={(e) => handleItemFieldChange(idx, 'unitPrice', Number(e.target.value))}
                                                                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Quantity</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                required
                                                                value={item.quantity}
                                                                onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                                                                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">GST / Tax (%)</label>
                                                            <input
                                                                type="number"
                                                                value={item.taxRate}
                                                                onChange={(e) => handleItemFieldChange(idx, 'taxRate', Number(e.target.value))}
                                                                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Discount per item (₹)</label>
                                                            <input
                                                                type="number"
                                                                value={item.discountRate}
                                                                onChange={(e) => handleItemFieldChange(idx, 'discountRate', Number(e.target.value))}
                                                                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                                placeholder="0"
                                                            />
                                                            {item.discountRate > 0 && item.quantity > 1 && (
                                                                <p className="text-[10px] text-emerald-600 font-black pl-1">
                                                                    Total discount: ₹{(item.discountRate * item.quantity).toLocaleString()} ({item.quantity} × ₹{item.discountRate})
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Design Services Section */}
                                    <div className="border-t border-gray-100 pt-4 mt-2">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary mb-3">Design Services</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Design Scope / Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.designName}
                                                    onChange={(e) => setFormData({ ...formData, designName: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                    placeholder="e.g. Logo vectorization / Custom art setup"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Design Charge (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.designAmount}
                                                    onChange={(e) => setFormData({ ...formData, designAmount: Number(e.target.value) })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Design GST (%)</label>
                                                <input
                                                    type="number"
                                                    value={formData.designGst}
                                                    onChange={(e) => setFormData({ ...formData, designGst: Number(e.target.value) })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                    placeholder="18"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Design Discount (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.designDiscount}
                                                    onChange={(e) => setFormData({ ...formData, designDiscount: Number(e.target.value) })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Design Notes</label>
                                                <textarea
                                                    value={formData.designNotes}
                                                    onChange={(e) => setFormData({ ...formData, designNotes: e.target.value })}
                                                    rows={2}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none resize-none"
                                                    placeholder="Internal designer guidance notes..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* hidden metadata fields */}
                                    <input type="hidden" value={formData.bankName} />
                                    <input type="hidden" value={formData.bankAccountName} />
                                    <input type="hidden" value={formData.bankIfscCode} />
                                    <input type="hidden" value={formData.bankAccountNumber} />
                                    <input type="hidden" value={formData.companySignature} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Reference ID</label>
                                            <input
                                                type="text"
                                                value={formData.invoiceNumber}
                                                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valid Until</label>
                                            <input
                                                type="date"
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 flex flex-col gap-3 flex-shrink-0">
                                    <Button type="submit" className="w-full py-4 text-white bg-brand-primary rounded-2xl font-black text-base shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-95 transition-all outline-none">
                                        {invoice ? 'Save Changes' : 'Generate & Save Invoice'}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full py-3 text-[11px] font-black uppercase text-gray-400 tracking-widest hover:text-gray-600 transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                        Dismiss Form
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
