import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AddExpenseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (amount: number, categoryId: string, note: string) => void;
}

export function AddExpenseDialog({ isOpen, onClose, onSave }: AddExpenseDialogProps) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setNote('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        const parsedAmount = parseFloat(amount);
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
            // Using a dummy category id for now, could be expanded later
            onSave(parsedAmount, 'cat-123', note);
            onClose();
        } else {
            alert('Please enter a valid amount');
        }
    };

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h3>New To-Do</h3>
                    <button className="dialog-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="dialog-body">
                    <input 
                        type="text" 
                        className="dialog-input-title"
                        placeholder="What was the expense?" 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        autoFocus
                    />
                    <div className="dialog-input-row">
                        <span className="currency-symbol">$</span>
                        <input 
                            type="number" 
                            className="dialog-input-amount"
                            placeholder="0.00" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                <div className="dialog-footer">
                    <button className="dialog-btn-save" onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>
    );
}
