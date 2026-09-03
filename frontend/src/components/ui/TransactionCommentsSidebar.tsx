import React, { useState } from 'react';
import { X, Send, User, Building2 } from 'lucide-react';
import type { Transaction } from '../../types/models';
import { useAddComment } from '../../features/transactions/hooks/useTransactions';
import { cn } from '../../utils/cn';

interface Props {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionCommentsSidebar({ transaction, isOpen, onClose }: Props) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addCommentMutation = useAddComment();
  const workspaceId = localStorage.getItem('workspaceId') || '';

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !workspaceId) return;

    try {
      await addCommentMutation.mutateAsync({ workspaceId, transactionId: transaction.id, text: newComment.trim() });
      setNewComment('');
    } catch (err) {
      console.error(err);
    }
  };

  const isPerson = transaction.payee?.type === 'PERSON';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-gray-100">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Comments</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner",
              isPerson ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
            )}>
              {isPerson ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 line-clamp-1">
                {transaction.name || 'Unnamed Transaction'}
              </h3>
              <p className="text-sm font-medium text-gray-500 line-clamp-1">
                {transaction.payee?.name || 'Unknown'} • {transaction.categoryName || 'Uncategorized'}
              </p>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
          {(!transaction.comments || transaction.comments.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium text-sm">No comments yet.<br/>Start a conversation!</p>
            </div>
          ) : (
            transaction.comments.map((comment) => (
              <div key={comment.id} className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                <p className="text-sm text-gray-800 leading-relaxed">{comment.comment}</p>
                <p className="text-xs text-gray-400 mt-2 font-medium">
                  {new Date(comment.createdAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type a comment..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={addCommentMutation.isPending || !newComment.trim()}
              className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
            >
              <Send className="w-5 h-5 -ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
