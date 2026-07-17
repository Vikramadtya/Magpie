import { useState, useMemo } from 'react';
import { useSettingsStore, formatCurrencyGlobal } from '../../../store/useSettingsStore';
import { useSubscriptions, useDeleteSubscription } from '../hooks/useSubscriptions';
import type { Subscription } from '../api/types';
import { toast } from 'sonner';

export const useSubscriptionsViewModel = () => {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  const { data: subscriptions = [], isLoading, error, refetch } = useSubscriptions(workspaceId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [subscriptionToEdit, setSubscriptionToEdit] = useState<Subscription | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<Subscription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currency = useSettingsStore(state => state.settings.currency);
  const formatCurrency = (val: any, sourceCurrency = currency) => formatCurrencyGlobal(Number(val), currency, sourceCurrency);

  const stateStatus = useMemo(() => {
    if (isLoading) return 'loading';
    if (error) return 'error';
    if (subscriptions.length === 0) return 'empty';
    return 'success';
  }, [isLoading, error, subscriptions.length]);

  const deleteMutation = useDeleteSubscription();

  const handleDelete = async () => {
    if (!subscriptionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ workspaceId, subscriptionId: subscriptionToDelete.id });
      setIsDeleteModalOpen(false);
      setSubscriptionToDelete(null);
      toast.success("Subscription deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete subscription");
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    workspaceId,
    subscriptions,
    isModalOpen,
    setIsModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    subscriptionToEdit,
    setSubscriptionToEdit,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    subscriptionToDelete,
    setSubscriptionToDelete,
    isDeleting,
    handleDelete,
    stateStatus,
    error,
    refetch,
    formatCurrency
  };
};
