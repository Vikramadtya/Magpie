import { Modal } from './ui/Modal';
import { TransactionForm, type TransactionFormValues } from '../features/transactions/components/TransactionForm';

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTransactionDialog({ isOpen, onClose }: AddTransactionDialogProps) {
  const handleSubmit = (data: TransactionFormValues) => {
    console.log('Saved transaction:', data);
    // Here you would call a viewmodel or API to save the data
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Add Transaction"
      className="max-w-lg"
    >
      <TransactionForm onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}
