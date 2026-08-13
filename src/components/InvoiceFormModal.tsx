import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
        productType: 'tshirt',
        productSubCategory: '',
        paymentMethod: 'GPay' as 'GPay' | 'PhonePay' | 'Cash' | 'Account' | 'UPI',
        unitPrice: 400,
        quantity: 1,
        taxRate: 5,
        shippingCost: 0,
        discountRate: 0,
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
            setFormData({
                leadId: invoice.leadId || '',
                invoiceNumber: invoice.invoiceNumber || '',
                dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
                notes: invoice.notes || '',
                customerName: invoice.billToName || '',
                customerCompanyName: invoice.billToAddress || '',
                customerNumber: invoice.billToPhone || '',
                productType: invoice.productType || 'tshirt',
                productSubCategory: invoice.productSubCategory || '',
                paymentMethod: invoice.paymentMethod || 'GPay',
                unitPrice: invoice.items?.[0]?.rate ?? 400,
                quantity: invoice.items?.[0]?.quantity ?? 1,
                taxRate: invoice.items?.[0]?.tax ?? 5,
                shippingCost: invoice.shippingCost || 0,
                discountRate: invoice.items?.[0]?.discount ?? 0,
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

    const handleProductChange = (type: string) => {
        const price = calculatePrice(type, '');
        setFormData({
            ...formData,
            productType: type,
            productSubCategory: '',
            unitPrice: price
        });
    };

    const handleSubCategoryChange = (sub: string) => {
        const price = calculatePrice(formData.productType, sub);
        setFormData({
            ...formData,
            productSubCategory: sub,
            unitPrice: price
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const subtotal = (formData.unitPrice * formData.quantity) + (Number(formData.designAmount) || 0);
        const discountTotal = (Number(formData.discountRate) || 0) + (Number(formData.designDiscount) || 0);
        const itemTotalAfterDiscount = Math.max(0, subtotal - discountTotal);
        const baseGst = ((formData.unitPrice * formData.quantity - (Number(formData.discountRate) || 0)) * formData.taxRate) / 100;
        const designGstVal = ((Number(formData.designAmount) - Number(formData.designDiscount)) * Number(formData.designGst)) / 100;
        const salesTax = Math.max(0, baseGst) + Math.max(0, designGstVal);
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
            items: [
                {
                    id: 'item-1',
                    description: `${formData.productType.toUpperCase()} ${formData.productSubCategory ? `(${formData.productSubCategory.toUpperCase()})` : ''}`,
                    rate: formData.unitPrice,
                    quantity: formData.quantity,
                    tax: formData.taxRate,
                    discount: formData.discountRate,
                    amount: formData.unitPrice * formData.quantity
                }
            ],
            subtotal,
            discountTotal,
            shippingCost,
            salesTax,
            total,
            amountPaid: invoice?.amountPaid || 0,
            balanceDue: total - (invoice?.amountPaid || 0),
            notes: formData.notes,
            paymentMethod: formData.paymentMethod,
            productType: formData.productType,
            productSubCategory: formData.productSubCategory,
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
                        className="relative bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden shadow-black/30 border border-white/20 max-h-[95vh] sm:max-h-[90vh] flex flex-col"
                    >
                        <div className="p-1 flex flex-col h-full overflow-hidden">
                            <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-3 sm:pb-4 flex items-center justify-between flex-shrink-0">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                                        {invoice ? 'Modify Invoice' : 'Generate Invoice'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Professional Billing Solution</p>
                                </div>
                                <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors border-none bg-transparent cursor-pointer">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="px-4 sm:px-8 pb-6 sm:pb-10 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-grow text-left">
                                <div className="space-y-4">
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
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                            <select
                                                value={formData.productType}
                                                onChange={(e) => handleProductChange(e.target.value)}
                                                className="w-full bg-gray-100 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none capitalize"
                                            >
                                                {products.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {(formData.productType === 'tshirt' || formData.productType === 'jersey' || formData.productType === 'corporate gift') && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Style Selection</label>
                                                <select
                                                    value={formData.productSubCategory}
                                                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none capitalize"
                                                >
                                                    <option value="">Select Option</option>
                                                    {(productSubCategories[formData.productType] || []).map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Price (₹)</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    value={formData.unitPrice}
                                                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                                                    className="w-full bg-brand-secondary/20 border-0 rounded-2xl pl-9 pr-4 py-2.5 sm:pr-5 sm:py-3.5 text-xs sm:text-sm font-black text-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                            />
                                        </div>
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
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Discount (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.discountRate}
                                                onChange={(e) => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                                                className="w-full bg-brand-secondary/10 border border-brand-secondary/20 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Shipping (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.shippingCost}
                                                onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">GST / Tax (%)</label>
                                            <input
                                                type="number"
                                                value={formData.taxRate}
                                                onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                                                className="w-full bg-gray-100 border border-gray-100 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Hidden bank and signature details */}
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
