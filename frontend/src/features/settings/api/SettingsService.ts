export const SettingsService = {
  get: async (workspaceId: string) => { 
    const stored = localStorage.getItem('keeper_settings');
    if (stored) return JSON.parse(stored);
    return {
      currency: 'USD',
      theme: 'system',
      notificationsEnabled: true
    };
  },
  update: async (workspaceId: string, s: any) => { 
    localStorage.setItem('keeper_settings', JSON.stringify(s));
    return s;
  }
};
