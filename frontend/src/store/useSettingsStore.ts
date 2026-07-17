import { create } from 'zustand';


export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
];

export const getCurrencySymbol = (currencyCode?: string) => {
  const code = currencyCode || useSettingsStore.getState().settings.currency || 'USD';
  const found = SUPPORTED_CURRENCIES.find(c => c.code === code);
  return found ? found.symbol : code;
};

interface UserSettings {
  currency: string;
}

interface SettingsStore {
  settings: UserSettings;
  fetchSettings: (userId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: { currency: 'USD' },
  fetchSettings: async (_userId: string) => {
    try {
      const stored = localStorage.getItem('keeper_settings');
      if (stored) {
        const data = JSON.parse(stored);
        set({ settings: { currency: data.currency || data.baseCurrency || 'USD' } });
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }
}));

export const formatCurrencyGlobal = (amountInCents: number, targetCurrency: string, sourceCurrency: string = targetCurrency) => {
  // We no longer convert in the frontend. 
  // We just format using the requested sourceCurrency natively.
  // The targetCurrency parameter is ignored for formatting native transactions.
  const displayCurrency = sourceCurrency || targetCurrency || 'USD';
  
  return new Intl.NumberFormat(undefined, { 
    style: 'currency', 
    currency: displayCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInCents / 100);
};
