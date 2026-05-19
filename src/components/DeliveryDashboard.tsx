/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Package, Search, Share2, Globe, Trash2, CheckCircle, Truck, Info } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import { ChevronRight } from 'lucide-react';

interface DeliveryDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function DeliveryDashboard({ orders, onUpdateOrder, onDeleteOrder, isAdmin }: DeliveryDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const deliveryOrders = orders.filter(o => o.status === OrderStatus.DELIVERY || o.status === OrderStatus.HOLD);

  const handleDeliver = async (id: string) => {
    if (isProcessing) return;
    setIsProcessing(id);
    try {
      await onUpdateOrder(id, {
        status: OrderStatus.DELIVERED,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(null);
    }
  };

  const filtered = deliveryOrders.filter(o =>
    o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Delivery Dashboard</h2>
          <p className="text-gray-500 mt-1">Track and confirm customer deliveries</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Sync Data
          </button>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search deliveries..."
              className="border-none focus:ring-0 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sh">
        {filtered.length > 0 ? (
          filtered.map(order => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-gray-400">ID: #{order.id.slice(-6)}</span>
                  {order.status === OrderStatus.HOLD && (
                    <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 rounded w-fit">ON HOLD</span>
                  )}
                  {order.isUrgent && (
                    <span className="bg-red-500 text-white text-[8px] font-black px-1.5 rounded animate-pulse w-fit mt-0.5">URGENT</span>
                  )}
                </div>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">
                  Out for Delivery
                </span>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{order.customerInfo.name}</h4>
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 px-1.5 py-0.5 rounded italic border border-red-100">
                      Reason: {order.holdReason}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                    <Phone size={14} />
                    <span className="text-sm">{order.customerInfo.phone}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <MapPin size={18} className="shrink-0 text-red-400 mt-0.5" />
                  <p className="line-clamp-2">{order.customerInfo.address}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <Package size={14} />
                    <span>{getDisplayCategory(order)} (Total: {order.quantity})</span>
                  </div>

                  {order.sizeBreakdown && order.sizeBreakdown.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {order.sizeBreakdown.map((s, i) => (
                        <div key={i} className="text-[9px] bg-white border border-gray-100 p-2 rounded-lg flex flex-col gap-0.5 shadow-sm">
                          <span className="font-black text-brand-primary uppercase">{s.size} - {s.quantity} pcs</span>
                          <span className="text-gray-400 font-bold">{s.colour} | {s.printType}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(order.financials?.balanceAmount || 0) > 0 && (
                    <div className="px-3 py-2 bg-red-50 text-red-700 rounded-xl border border-red-100 italic font-black text-center text-xs">
                      Collect: ₹{order.financials?.balanceAmount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={async () => {
                    const reason = window.prompt("Enter Hold Reason:");
                    if (reason) {
                      const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason}`;
                      const updatedNotes = order.notes ? `${order.notes}\n${newNote}` : newNote;

                      await onUpdateOrder(order.id, {
                        status: OrderStatus.HOLD,
                        holdReason: reason,
                        previousStatus: order.status,
                        notes: updatedNotes,
                        updatedAt: Date.now()
                      });
                    }
                  }}
                  className="px-4 py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-colors"
                >
                  Hold
                </button>
                <button
                  onClick={() => handleDeliver(order.id)}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Confirm Delivery
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
            <Truck className="mx-auto text-gray-300 mb-2" size={48} />
            <p className="text-gray-500">No active deliveries found.</p>
          </div>
        )}
      </div>

      {/* Global Order Status Section */}
      <div className="pt-8 border-t border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Globe className="text-brand-primary" size={24} />
          Global Order Status Hub
        </h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 italic">
              <tr className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                <th className="px-6 py-4 text-nowrap">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Last Update</th>
                {isAdmin && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length > 0 ? (
                orders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedHubOrder(order)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        #{order.id.slice(-8)}
                        {order.isUrgent && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded">URGENT</span>
                        )}
                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-primary" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{order.customerInfo.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-500 uppercase tracking-tighter">
                        {getDisplayCategory(order)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      {order.status === OrderStatus.HOLD && order.holdReason && (
                        <div className="text-[9px] text-red-500 mt-1 font-bold italic truncate max-w-[120px] mx-auto" title={order.holdReason}>
                          {order.holdReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400">
                      {new Date(order.updatedAt).toLocaleString()}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this order? This cannot be undone.')) {
                              onDeleteOrder?.(order.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors relative z-10"
                          title="Delete Order (Admin Only)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-400 italic">No global orders available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={onUpdateOrder}
          onUpdateStatus={(status) => {
            if (window.confirm(`Change order status to ${status}?`)) {
              onUpdateOrder(selectedHubOrder.id, { status });
              setSelectedHubOrder(prev => prev ? { ...prev, status } : null);
            }
          }}
        />
      )}
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-600';
    case OrderStatus.ACCOUNTS: return 'bg-amber-100 text-amber-700';
    case OrderStatus.ORDER_MANAGEMENT: return 'bg-blue-100 text-blue-700';
    case OrderStatus.PRODUCTION: return 'bg-purple-100 text-purple-700';
    case OrderStatus.DELIVERY: return 'bg-orange-100 text-orange-700';
    case OrderStatus.DELIVERED: return 'bg-green-100 text-green-700';
    case OrderStatus.HOLD: return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};
