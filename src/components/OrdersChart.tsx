import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Order } from '../types';

interface OrdersChartProps {
  orders: Order[];
}

export default function OrdersChart({ orders }: OrdersChartProps) {
  // Aggregate orders by month
  // We'll look at the last 6 months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dataMap: { [key: string]: { name: string, Pending: number, Process: number, Completed: number, Hold: number } } = {};

  // Initialize last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    dataMap[key] = {
      name: label,
      Pending: 0,
      Process: 0,
      Completed: 0,
      Hold: 0
    };
  }

  orders.forEach(order => {
    if (!order.createdAt) return;
    const d = new Date(Number(order.createdAt));
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (dataMap[key]) {
      const status = order.status;
      if (status === 'pending') {
        dataMap[key].Pending++;
      } else if (status === 'delivered') {
        dataMap[key].Completed++;
      } else if (status === 'hold') {
        dataMap[key].Hold++;
      } else {
        dataMap[key].Process++;
      }
    }
  });

  const chartData = Object.values(dataMap);

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Order Performance & Metrics</h3>
        <p className="text-xs text-gray-500 mt-0.5">Monthly summary of orders processed across departments</p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" fontSize={11} stroke="#9ca3af" tickLine={false} axisLine={false} />
            <YAxis fontSize={11} stroke="#9ca3af" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
            <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Process" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Hold" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
