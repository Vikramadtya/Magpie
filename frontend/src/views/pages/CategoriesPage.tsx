import { useEffect, useState } from 'react';
import { Plus, ListTree, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { StateView } from '../../components/ui/StateView';
import { useCategoryTree } from '../../features/categories/hooks/useCategories';
import { apiClient } from '../../utils/api';
import { Modal } from '../../components/ui/Modal';
import { Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface CategoryAccount {
  id: string;
  name: string;
  type: string;
  parentId?: string;
  balance: number;
  currency: string;
  icon?: string;
}

import EmojiPicker from 'emoji-picker-react';

export default function CategoriesPage() {
  const workspaceId = localStorage.getItem('workspaceId') || '';
  const { data: expenseTree = [], isLoading: loadingExp, error: errExp, refetch: refetchExp } = useCategoryTree(workspaceId, 'EXPENSE');
  const { data: incomeTree = [], isLoading: loadingInc, error: errInc, refetch: refetchInc } = useCategoryTree(workspaceId, 'INCOME');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('EXPENSE');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📁');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingCategory, setEditingCategory] = useState<CategoryAccount | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState('EXPENSE');
  const [editCatParentId, setEditCatParentId] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('📁');
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const currency = useSettingsStore(state => state.settings.currency);

  const WORKSPACE_ID = localStorage.getItem('workspaceId') || '';

  // loadCategories is handled by useAccounts

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post(`/api/v1/accounts/${WORKSPACE_ID}`, {
        name: newCatName,
        type: newCatType,
        currency: currency || 'USD',
        parentId: newCatParentId || null,
        icon: newCatIcon
      });
      setIsModalOpen(false);
      setNewCatName('');
      setNewCatParentId('');
      setNewCatIcon('📁');
      setNewCatIcon('📁');
      refetchExp();
      refetchInc();
      toast.success("Category created successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create category");
    } finally {
      setSaving(false);
    }
  };
  const handleEdit = (category: CategoryAccount) => {
    setEditingCategory(category);
    setEditCatName(category.name);
    setEditCatType(category.type);
    setEditCatParentId(category.parentId || '');
    setEditCatIcon(category.icon || '📁');
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/v1/accounts/${WORKSPACE_ID}/${editingCategory.id}`, {
        name: editCatName,
        type: editCatType,
        icon: editCatIcon
        // Not updating parentId right now since backend doesn't support changing parents easily via PUT
      });
      setIsEditModalOpen(false);
      setEditingCategory(null);
      setEditingCategory(null);
      refetchExp();
      refetchInc();
      toast.success("Category updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await apiClient.delete(`/api/v1/accounts/${WORKSPACE_ID}/${id}`);
      
      refetchExp();
      refetchInc();
      toast.success("Category deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category");
    }
  };

  const renderTree = (nodes: any[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="w-full">
        <div className={`group flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors`} style={{ paddingLeft: `${depth * 2 + 1}rem` }}>
          <div className="flex items-center gap-3">
            {depth > 0 ? <ListTree className="w-4 h-4 text-gray-300" /> : <div className="w-4 h-4" />}
            <span className="text-xl">{node.icon || '📁'}</span>
            <span className="font-medium text-gray-900">{node.name}</span>
          </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button 
                onClick={() => handleEdit(node)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Category"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(node.id)}
                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
        </div>
        {node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  const getState = () => {
    if (loadingExp || loadingInc) return 'loading';
    if (errExp || errInc) return 'error';
    if (expenseTree.length === 0 && incomeTree.length === 0) return 'empty';
    return 'success';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 w-full space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Categories</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage your hierarchical income and expense categories.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:-translate-y-0.5">
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </header>

      <StateView 
        state={getState()} 
        error={errExp?.message || errInc?.message || null} 
        onRetry={() => { refetchExp(); refetchInc(); }}
        title={(errExp || errInc) ? "Failed to Load" : "No Categories Found"}
        description={(errExp || errInc) ? undefined : "Create your first category."}
        className="mt-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 px-3">Expenses</h2>
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              {renderTree(expenseTree)}
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 px-3">Income</h2>
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              {renderTree(incomeTree)}
            </div>
          </div>
        </div>
      </StateView>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Category">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-gray-700">Icon & Name</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl hover:bg-gray-100 transition-colors"
              >
                {newCatIcon}
              </button>
              <input type="text" required value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category Name" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
            </div>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-2 z-50 shadow-xl rounded-xl">
                <EmojiPicker 
                  onEmojiClick={(e) => { setNewCatIcon(e.emoji); setShowEmojiPicker(false); }}
                  autoFocusSearch={false}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Type</label>
            <select value={newCatType} onChange={e => {setNewCatType(e.target.value); setNewCatParentId('');}} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Parent Category (Optional)</label>
            <select value={newCatParentId} onChange={e => setNewCatParentId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
              <option value="">None (Top Level)</option>
              {newCatType === 'EXPENSE' ? expenseTree.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              )) : incomeTree.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-bold text-gray-700 border rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Category
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Category">
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-gray-700">Icon & Name</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl hover:bg-gray-100 transition-colors"
              >
                {editCatIcon}
              </button>
              <input type="text" required value={editCatName} onChange={e => setEditCatName(e.target.value)} placeholder="Category Name" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
            </div>
            {showEditEmojiPicker && (
              <div className="absolute top-full left-0 mt-2 z-50 shadow-xl rounded-xl">
                <EmojiPicker 
                  onEmojiClick={(e) => { setEditCatIcon(e.emoji); setShowEditEmojiPicker(false); }}
                  autoFocusSearch={false}
                />
              </div>
            )}
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 font-bold text-gray-700 border rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
