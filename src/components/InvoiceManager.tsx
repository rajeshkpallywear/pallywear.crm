import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, FileText, Trash2, Eye, MessageSquare, Edit
} from 'lucide-react';
import { Button } from './Button';
import InvoiceModal from './InvoiceModal';
import InvoiceFormModal from './InvoiceFormModal';
import { Invoice } from '../types';

export default function InvoiceManager() {
    const { leads, invoices, addInvoice, updateInvoice, deleteInvoice } = useLeads();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
    const [autoSharePDF, setAutoSharePDF] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

    const handleShareInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setAutoSharePDF(true);
        setIsModalOpen(true);
    };

    const filteredInvoices = invoices
        .filter(inv => user?.role === 'admin' || user?.role === 'staff' || inv.createdBy === user?.id || inv.createdBy === user?.uid)
        .filter(inv =>
            inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.billToName.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const handleOpenInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (invoiceData: Omit<Invoice, 'id'>) => {
        try {
            if (editingInvoice) {
                await updateInvoice(editingInvoice.id, invoiceData);
                alert("Invoice updated successfully!");
            } else {
                await addInvoice(invoiceData);
                alert("Invoice created successfully!");
            }
            setIsNewInvoiceModalOpen(false);
            setEditingInvoice(null);
        } catch (err: any) {
            console.error("Failed to save invoice:", err);
            let errorMsg = "Error saving invoice.";
            try {
                const errorData = JSON.parse(err.message);
                errorMsg = `Error: ${errorData.error}\nType: ${errorData.operationType}\nPath: ${errorData.path}`;
            } catch (e) {
                errorMsg = err.message || "Please check your internet connection.";
            }
            alert(errorMsg);
        }
    };

    const handleEditInvoice = (inv: Invoice) => {
        setEditingInvoice(inv);
        setIsNewInvoiceModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search invoices by number or client..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/10 transition-all font-medium outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button 
                    onClick={() => {
                        setEditingInvoice(null);
                        setIsNewInvoiceModalOpen(true);
                    }} 
                    className="w-full md:w-auto gap-2 shadow-lg shadow-brand-primary/20 bg-brand-primary hover:bg-brand-primary/90 text-white border-0 py-2.5 px-6 rounded-2xl cursor-pointer"
                >
                    <Plus className="w-4 h-4" /> Create Invoice
                </Button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {/* Desktop Table View */}
                    <table className="hidden md:table w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 font-black uppercase tracking-widest text-[10px]">
                                <th className="px-6 py-5">Invoice Reference</th>
                                <th className="px-6 py-5">Customer Details</th>
                                <th className="px-6 py-5">Transaction Amount</th>
                                <th className="px-6 py-5">Status / Due</th>
                                <th className="px-6 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredInvoices.slice().sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()).map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-brand-secondary rounded-xl text-brand-primary group-hover:scale-110 transition-transform">
                                                <FileText className="w-4.5 h-4.5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{inv.invoiceNumber}</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight">ID: {inv.id.slice(0, 6)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-gray-800">{inv.billToName}</p>
                                        <p className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{inv.billToCompanyName || inv.billToAddress}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-black text-brand-primary text-base">₹{inv.total.toLocaleString()}</p>
                                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">{inv.paymentMethod || 'GPAY'}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-500">{new Date(inv.dueDate).toLocaleDateString()}</span>
                                            <span className="text-[9px] font-black uppercase text-gray-300">Generated {new Date(inv.createdAt || inv.date).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenInvoice(inv)}
                                                className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-brand-primary transition-all bg-brand-secondary/30 border-none cursor-pointer"
                                                title="View & Download"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleShareInvoice(inv)}
                                                className="p-2.5 hover:bg-green-50 hover:shadow-sm text-green-600 rounded-xl transition-all bg-green-50/50 border-none cursor-pointer"
                                                title="Share to WhatsApp"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </button>
                                            {(user?.role === 'admin' || user?.role === 'marketing' || user?.role === 'staff') && (
                                                <button
                                                    onClick={() => handleEditInvoice(inv)}
                                                    className="p-2.5 hover:bg-indigo-50 hover:shadow-sm text-indigo-600 rounded-xl transition-all bg-indigo-55/10 border-none cursor-pointer"
                                                    title="Edit Invoice"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                            {user?.role === 'admin' && (
                                                <button
                                                    onClick={() => deleteInvoice(inv.id)}
                                                    className="p-2.5 hover:bg-white hover:shadow-sm text-gray-400 hover:text-red-500 rounded-xl transition-all border-none cursor-pointer"
                                                    title="Delete Permanently"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                            <div className="p-6 bg-brand-secondary rounded-full">
                                                <FileText className="w-10 h-10 text-brand-primary opacity-50" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-gray-900 font-black text-lg">No Invoices Found</p>
                                                <p className="text-gray-400 text-sm italic">You haven't generated any invoices yet. Start by clicking the 'Create Invoice' button above.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card List View */}
                    <div className="block md:hidden divide-y divide-gray-100">
                        {filteredInvoices.length > 0 ? (
                            filteredInvoices.slice().sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()).map((inv) => (
                                <div key={inv.id} className="p-4 bg-white space-y-3 active:bg-gray-50 transition-colors">
                                    {/* Header Info */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-brand-secondary rounded-lg text-brand-primary">
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-xs">{inv.invoiceNumber}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">ID: {inv.id.slice(0, 6)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleOpenInvoice(inv)}
                                                className="p-2 bg-brand-secondary/40 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                                                title="View & Download"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleShareInvoice(inv)}
                                                className="p-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                                                title="Share to WhatsApp"
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                            {(user?.role === 'admin' || user?.role === 'marketing' || user?.role === 'staff') && (
                                                <button
                                                    onClick={() => handleEditInvoice(inv)}
                                                    className="p-2 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-650 hover:text-white rounded-lg transition-colors border-none cursor-pointer"
                                                    title="Edit Invoice"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                            {user?.role === 'admin' && (
                                                <button
                                                    onClick={() => deleteInvoice(inv.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors border-none cursor-pointer"
                                                    title="Delete Permanently"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-1">
                                        <p className="font-black text-gray-900 text-sm">{inv.billToName}</p>
                                        <p className="text-xs text-gray-500 truncate">{inv.billToCompanyName || inv.billToAddress}</p>
                                    </div>

                                    {/* Financials & Dates */}
                                    <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-xs">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Amount</p>
                                            <p className="font-black text-brand-primary text-base">₹{inv.total.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Due Date</p>
                                            <p className="font-bold text-gray-700">{new Date(inv.dueDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500 italic font-medium text-xs">
                                No invoices found. Start by clicking the 'Create Invoice' button above.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <InvoiceModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setAutoSharePDF(false);
                }}
                invoice={selectedInvoice}
                autoShare={autoSharePDF}
            />

            <InvoiceFormModal
                isOpen={isNewInvoiceModalOpen}
                onClose={() => {
                    setIsNewInvoiceModalOpen(false);
                    setEditingInvoice(null);
                }}
                invoice={editingInvoice}
                onSubmit={handleFormSubmit}
            />
        </div>
    );
}
