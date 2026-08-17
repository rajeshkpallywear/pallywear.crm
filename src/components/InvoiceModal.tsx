import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Printer, Send, CreditCard, Laptop, MessageSquare, Share2 } from 'lucide-react';
import { Invoice } from '../types';
import Logo from './Logo';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { shareInvoiceToWhatsApp } from '../lib/utils';
import { getApiUrl } from '../lib/apiConfig';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface InvoiceModalProps {
    invoice: Invoice | null;
    isOpen: boolean;
    onClose: () => void;
    autoShare?: boolean;
}

export default function InvoiceModal({ invoice, isOpen, onClose, autoShare = false }: InvoiceModalProps) {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [logoBase64, setLogoBase64] = useState<string>('');
    const [qrBase64, setQrBase64] = useState<string>('');
    const [sealBase64, setSealBase64] = useState<string>('');
    const [sigBase64, setSigBase64] = useState<string>('');

    const isMarketingStaff = invoice ? (invoice.creatorRole === 'marketing' || invoice.creatorRole === 'staff' || invoice.createdByName?.toLowerCase().includes('marketing') || false) : false;

    useEffect(() => {
        const fetchAsset = async (urlPath: string, setter: (val: string) => void) => {
            try {
                const res = await fetch(getApiUrl(urlPath));
                if (res.ok) {
                    const blob = await res.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setter(reader.result as string);
                    };
                    reader.readAsDataURL(blob);
                }
            } catch (err) {
                console.error(`Failed to convert ${urlPath} to base64:`, err);
            }
        };

        fetchAsset('/logo.png', setLogoBase64);
        fetchAsset('/Qr.png', setQrBase64);
        fetchAsset('/SEAL.png', setSealBase64);
        fetchAsset('/signature.png', setSigBase64);
    }, []);

    React.useEffect(() => {
        if (isOpen && autoShare && invoice) {
            const timer = setTimeout(() => {
                handleDownloadPDF();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isOpen, autoShare, invoice?.invoiceNumber]);

    if (!invoice) return null;

    const handleDownloadPDF = async () => {
        const element = invoiceRef.current;
        if (!element) return;

        try {
            // Use standard pixels for A4 width to ensure consistent capture
            const standardWidth = 1000;
            const isMobile = window.innerWidth < 768;

            const canvas = await html2canvas(element, {
                scale: isMobile ? 1.2 : 2, // Use slightly lower scale on mobile to avoid OOM crashes
                useCORS: true,
                allowTaint: false, // Set to false to prevent canvas tainting SecurityError
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: standardWidth, // Virtual window width to prevent responsive shifts
                onclone: (clonedDoc) => {
                    const el = clonedDoc.querySelector('[data-invoice-container]') as HTMLElement;
                    if (el) {
                        el.style.width = `${standardWidth}px`;
                        el.style.height = 'auto';
                        el.style.overflow = 'visible';
                    }
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const margin = 10; // 10mm margin
            const maxLineWidth = pageWidth - (margin * 2);
            const maxLineHeight = pageHeight - (margin * 2);

            const imgWidth = maxLineWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // If the content is longer than one page, add multiple pages
            let heightLeft = imgHeight;
            let position = margin;

            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= maxLineHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
                heightLeft -= maxLineHeight;
            }

            const fileName = `Invoice-${invoice.invoiceNumber}.pdf`;

            if (Capacitor.isNativePlatform()) {
                const dataUriString = pdf.output('datauristring');
                const base64 = dataUriString.split(';base64,')[1];
                const writeResult = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Cache,
                });
                
                await Share.share({
                    title: fileName,
                    text: `Invoice ${invoice.invoiceNumber} from Pallywear`,
                    url: writeResult.uri,
                });
            } else {
                const pdfBlob = pdf.output('blob');
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: fileName,
                            text: `Invoice ${invoice.invoiceNumber} from Pallywear`,
                        });
                    } catch (shareError: any) {
                        console.log('Sharing failed or cancelled, trying fallback save:', shareError);
                        if (shareError?.name !== 'AbortError') {
                            pdf.save(fileName);
                        }
                    }
                } else {
                    pdf.save(fileName);
                }
            }
        } catch (error: any) {
            console.error('PDF Generation Error:', error);
            const errMsg = error?.message || String(error);
            alert('PDF generation failed: ' + errMsg + '. Please try using the "Print" button instead.');
        } finally {
            if (autoShare) {
                onClose();
            }
        }
    };

    const handleSendInvoice = () => {
        const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} from ${invoice.fromName}`);
        const body = encodeURIComponent(
            `Hello ${invoice.billToName},\n\n` +
            `Please find our invoice ${invoice.invoiceNumber} for the total amount of ₹${invoice.total.toLocaleString()}.\n\n` +
            `Product: ${invoice.productType?.toUpperCase()} ${invoice.productSubCategory ? `(${invoice.productSubCategory.toUpperCase()})` : ''}\n` +
            `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\n` +
            `Best regards,\n` +
            `${invoice.fromName}`
        );

        const mailtoUrl = `mailto:${invoice.billToEmail}?subject=${subject}&body=${body}`;
        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.target = '_blank';
        link.click();
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
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Large QR Modal overlay when clicked */}
                    <AnimatePresence>
                        {isQrOpen && (
                            <motion.div
                                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsQrOpen(false);
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    className="max-w-md w-full aspect-square bg-white rounded-[60px] p-10 shadow-2xl relative"
                                >
                                    <img src={qrBase64 || getApiUrl('/Qr.png')} className="w-full h-full object-contain" alt="Large QR" />
                                    <div className="absolute -bottom-16 left-0 right-0 text-center">
                                        <p className="text-white font-black uppercase tracking-[0.4em] text-[10px]">Tap anywhere to close</p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl overflow-hidden shadow-black/20"
                    >
                        {/* Header / Actions */}
                        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Invoice Reference: {invoice.invoiceNumber}</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
                                    title="Print"
                                >
                                    <Printer className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
                                    title="Download PDF"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSendInvoice}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all"
                                >
                                    <Send className="w-4 h-4" /> Send Invoice
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 hover:bg-green-600/90 transition-all"
                                >
                                    <Share2 className="w-4 h-4" /> Share PDF
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors ml-2"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Invoice Content (Modeled after the image) */}
                        <div ref={invoiceRef} data-invoice-container className="p-4 sm:p-12 text-gray-800 bg-white">
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 sm:mb-16 gap-6">
                                <div className="scale-125 origin-top-left flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
                                        <img
                                            src={logoBase64 || getApiUrl('/logo.png')}
                                            alt="Pw"
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <span className="text-2xl font-black text-gray-900 tracking-tighter">Pallywear</span>
                                </div>
                                <div className="text-left sm:text-right w-full sm:w-auto">
                                    <h1 className="text-4xl font-black text-white p-0 m-0 hidden sm:block">.</h1>
                                    <div className="mt-4 space-y-1 text-sm text-gray-500 font-medium">
                                        <p>Invoice no: <span className="text-gray-900 font-bold ml-2">{invoice.invoiceNumber}</span></p>
                                        <p>Invoice date: <span className="text-gray-900 font-bold ml-2">{new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
                                        <p>Due: <span className="text-gray-900 font-bold ml-2">{new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 mb-8 sm:mb-16">
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 sm:mb-4">From</h2>
                                    <div className="space-y-1">
                                        <p className="text-lg sm:text-xl font-black text-gray-900">{invoice.fromName || 'Pallywear Gifting Solutions'}</p>
                                        <p className="text-xs sm:text-sm font-medium text-gray-500 prose whitespace-pre-line">
                                            {invoice.fromAddress || 'Pallywear Gifting Solutions, Bus stop, 49/1, Mudichur Rd, near by Parvathi nagar, Shanthi Nagar, Old Perungalathur, Chennai, Tamil Nadu 600063'}
                                        </p>
                                        <p className="text-xs sm:text-sm font-medium text-gray-500">{invoice.fromPhone || '+91 9597528585'}</p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 sm:mb-4">Bill to</h2>
                                    <div className="space-y-1">
                                        <p className="text-lg sm:text-xl font-black text-gray-900">{invoice.billToName}</p>
                                        <p className="text-xs sm:text-sm font-medium text-gray-500">{invoice.billToEmail}</p>
                                        <p className="text-xs sm:text-sm font-medium text-gray-500">{invoice.billToPhone}</p>
                                        <p className="text-xs sm:text-sm font-medium text-gray-500 whitespace-pre-line">{invoice.billToAddress}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="mb-6 sm:mb-12 overflow-x-auto rounded-xl border border-gray-100">
                                <table className="w-full text-xs sm:text-sm text-left min-w-[600px] sm:min-w-0">
                                    <thead>
                                        <tr className="bg-brand-primary bg-gradient-to-r from-brand-primary to-brand-secondary text-white">
                                            <th className="px-3 py-3 sm:px-6 sm:py-4 font-black uppercase tracking-wider text-[10px]">Description</th>
                                            <th className="px-3 py-3 sm:px-6 sm:py-4 font-black uppercase tracking-wider text-[10px] text-right">Rate, Cada</th>
                                            <th className="px-3 py-3 sm:px-6 sm:py-4 font-black uppercase tracking-wider text-[10px] text-center">Qty</th>
                                            <th className="px-3 py-3 sm:px-6 sm:py-4 font-black uppercase tracking-wider text-[10px] text-right">Tax</th>
                                            <th className="px-3 py-3 sm:px-6 sm:py-4 font-black uppercase tracking-wider text-[10px] text-right">Disc</th>
                                            <th className="px-3 py-3 sm:px-6 sm:py-4 font-black uppercase tracking-wider text-[10px] text-right">Amount, Cada</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {invoice.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-3 py-4 sm:px-6 sm:py-6 min-w-[200px] sm:min-w-[300px]">
                                                    <p className="font-bold text-gray-900 mb-1">{item.description}</p>
                                                </td>
                                                <td className="px-3 py-4 sm:px-6 sm:py-6 text-right font-medium">₹{item.rate.toLocaleString()}</td>
                                                <td className="px-3 py-4 sm:px-6 sm:py-6 text-center font-medium">{item.quantity}</td>
                                                <td className="px-3 py-4 sm:px-6 sm:py-6 text-right font-medium">{item.tax}%</td>
                                                <td className="px-3 py-4 sm:px-6 sm:py-6 text-right font-medium">
                                                    {isMarketingStaff ? `₹${item.discount.toLocaleString()}` : `${item.discount}%`}
                                                </td>
                                                <td className="px-3 py-4 sm:px-6 sm:py-6 text-right font-black text-gray-900">₹{item.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12">
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Payment & Terms</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                <CreditCard className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</p>
                                                <p className="text-sm font-black text-gray-900">{invoice.paymentMethod || 'GPay'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-8">
                                            <div
                                                className="flex-shrink-0 w-36 h-36 sm:w-48 sm:h-48 bg-white border border-gray-100 rounded-3xl overflow-hidden p-1 shadow-md cursor-zoom-in hover:scale-105 transition-transform duration-300 mx-auto sm:mx-0"
                                                onClick={() => setIsQrOpen(true)}
                                            >
                                                <img
                                                    src={qrBase64 || getApiUrl('/Qr.png')}
                                                    alt="Payment QR Code"
                                                    className="w-full h-full object-contain"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div className="space-y-1.5 pt-1 sm:pt-3 text-left w-full sm:w-auto">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Company Bank Details</p>
                                                <p className="text-[11px] font-black text-gray-900 leading-tight">Bank: <span className="text-brand-primary">{invoice.bankName || 'HDFC BANK'}</span></p>
                                                <p className="text-[11px] font-black text-gray-900 leading-tight">Acc Name: <span className="text-gray-600">{invoice.bankAccountName || 'PALLYWEAR PVT LTD'}</span></p>
                                                <p className="text-[11px] font-black text-gray-900 leading-tight">IFSC Code: <span className="text-gray-600">{invoice.bankIfscCode || 'HDFC0008964'}</span></p>
                                                <p className="text-[11px] font-black text-gray-900 leading-tight">Account: <span className="text-gray-600 uppercase">{invoice.bankAccountNumber || '50202110682524'}</span></p>
                                            </div>
                                        </div>
                                        {invoice.notes && (
                                            <div className="mt-8 text-left">
                                                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes</h2>
                                                <p className="text-xs text-gray-400 font-medium leading-relaxed">{invoice.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Subtotal:</span>
                                        <span className="font-black text-gray-900">₹{invoice.subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Discount {isMarketingStaff ? '' : `(${invoice.items[0]?.discount || 0}%)`}:</span>
                                        <span className="font-black text-gray-900">₹{invoice.discountTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Shipping Cost:</span>
                                        <span className="font-black text-gray-900">₹{invoice.shippingCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Sales Tax (GST {invoice.items[0]?.tax || 18}%):</span>
                                        <span className="font-black text-gray-900">₹{invoice.salesTax.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-100">
                                        <span className="font-bold text-gray-900">Total:</span>
                                        <span className="font-black text-gray-900">₹{invoice.total.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Amount paid:</span>
                                        <span className="font-black text-gray-900">₹{invoice.amountPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 sm:p-5 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 rounded-2xl mt-6 border border-brand-primary/5">
                                        <span className="text-sm font-black text-brand-primary uppercase tracking-widest">Balance Due:</span>
                                        <span className="text-lg sm:text-xl font-black text-brand-primary">₹{invoice.balanceDue.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Signature area (matching image) */}
                            <div className="mt-12 sm:mt-20 flex flex-col sm:flex-row justify-between items-center sm:items-end px-4 gap-8">
                                {/* Seal on the left */}
                                <div className="relative w-32 h-32 sm:w-48 sm:h-48 opacity-80 pointer-events-none rotate-[-8deg] mb-2 sm:mb-8">
                                    <img
                                        src={sealBase64 || getApiUrl('/SEAL.png')}
                                        alt="Company Seal"
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>

                                {/* Signature on the right */}
                                <div className="relative text-center w-full sm:w-auto flex flex-col items-center">
                                    <div className="h-24 sm:h-32 flex items-end justify-center mb-2 px-4">
                                        <img
                                            src={sigBase64 || getApiUrl('/signature.png')}
                                            alt="Authorized Signature"
                                            className="h-16 sm:h-24 object-contain translate-x-4 opacity-95"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="w-full sm:w-64 h-px bg-gray-300" />
                                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mt-4">Authorized Signature</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Pallywear Pvt. Ltd.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
