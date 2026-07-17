import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import type { UserSettings } from '../api/types';
import { apiClient } from '../../../utils/api';

export const useSettingsViewModel = () => {
  const USER_ID = localStorage.getItem('userId') || '';
  const WORKSPACE_ID = localStorage.getItem('workspaceId') || '';

  const { data: serverSettings, isLoading: loading, error, refetch } = useSettings(USER_ID);
  const updateMutation = useUpdateSettings();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (serverSettings) {
      setSettings(serverSettings as any);
    }
  }, [serverSettings]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await apiClient.get(`/api/export/${format}`, { responseType: 'blob' });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keeper_export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      toast.error(`Failed to export data: ${err.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !USER_ID) return;
    
    setSaving(true);
    setSuccessMsg(null);
    
    try {
      await updateMutation.mutateAsync({ userId: USER_ID, settings });
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const stateStatus = useMemo(() => {
    if (loading) return 'loading';
    if (error && !settings) return 'error';
    return 'success';
  }, [loading, error, settings]);

  return {
    settings,
    saving,
    successMsg,
    activeTab,
    setActiveTab,
    stateStatus,
    error,
    refetch,
    handleSave,
    handleChange,
    handleExport
  };
};
