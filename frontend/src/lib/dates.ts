import { addMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const isoDate = (d: Date) => format(d, 'yyyy-MM-dd');
export const today = () => isoDate(new Date());
export const monthKey = (d: Date) => format(d, 'yyyy-MM');
export const shiftMonth = (key: string, by: number) => monthKey(addMonths(parseISO(`${key}-01`), by));
export const monthLabel = (key: string) => format(parseISO(`${key}-01`), 'MMMM yyyy');
export const monthRange = (key: string) => {
  const d = parseISO(`${key}-01`);
  return { from: isoDate(startOfMonth(d)), to: isoDate(endOfMonth(d)) };
};
export const prettyDate = (iso: string) => format(parseISO(iso), 'EEE, d MMM yyyy');
export const shortDate = (iso: string) => format(parseISO(iso), 'd MMM');
