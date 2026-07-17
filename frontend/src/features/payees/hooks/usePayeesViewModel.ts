import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { usePayees, useUpdatePayee, useDeletePayee } from '../hooks/usePayees';
import type { Payee } from '../api/types';

export const usePayeesViewModel = () => {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  const { data: payees = [], isLoading: loading, error, refetch } = usePayees(workspaceId);
  const updateMutation = useUpdatePayee();
  const deleteMutation = useDeletePayee();

  const [activeTab, setActiveTab] = useState<'MERCHANT' | 'PERSON' | 'ORGANIZATION'>('MERCHANT');
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('🏪');
  const [editType, setEditType] = useState<'MERCHANT' | 'PERSON' | 'ORGANIZATION'>('MERCHANT');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredPayees = useMemo(() => {
    return payees.filter((p: Payee) => p.type === activeTab);
  }, [payees, activeTab]);

  const handleEdit = (payee: Payee) => {
    setEditingPayee(payee);
    setEditName(payee.name);
    setEditIcon(payee.icon || (payee.type === 'PERSON' ? '👤' : payee.type === 'ORGANIZATION' ? '🏢' : '🏪'));
    setEditType((payee.type as any) || 'MERCHANT');
    setShowEmojiPicker(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayee) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ 
        workspaceId, 
        payeeId: editingPayee.id, 
        payee: { name: editName, icon: editIcon, type: editType } 
      });
      setEditingPayee(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update payee");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payee?')) return;
    
    try {
      await deleteMutation.mutateAsync({ workspaceId, payeeId: id });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete payee");
    }
  };

  const stateStatus = useMemo(() => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (filteredPayees.length === 0) return 'empty';
    return 'success';
  }, [loading, error, filteredPayees.length]);

  return {
    workspaceId,
    payees: filteredPayees,
    activeTab,
    setActiveTab,
    editingPayee,
    setEditingPayee,
    editName,
    setEditName,
    editIcon,
    setEditIcon,
    editType,
    setEditType,
    showEmojiPicker,
    setShowEmojiPicker,
    saving,
    stateStatus,
    error,
    refetch,
    handleEdit,
    handleUpdate,
    handleDelete
  };
};
