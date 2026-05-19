import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
