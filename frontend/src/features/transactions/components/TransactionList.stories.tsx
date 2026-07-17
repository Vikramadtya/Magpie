import type { Meta, StoryObj } from '@storybook/react';
import { TransactionList } from './TransactionList';

const meta = {
  title: 'Components/Transactions/TransactionList',
  component: TransactionList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TransactionList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockFormatCurrency = (val: number, currency: string) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val / 100);

const mockTransactions = [
  {
    id: '1',
    amount: 150000,
    currency: 'USD',
    type: 'INCOME',
    payeeName: 'Acme Corp',
    transactionName: 'Salary',
    categoryName: 'Income',
    status: 'CLEARED',
  },
  {
    id: '2',
    amount: 4500,
    currency: 'USD',
    type: 'EXPENSE',
    payeeName: 'Starbucks',
    transactionName: 'Coffee',
    categoryName: 'Food & Dining',
    status: 'CLEARED',
  },
  {
    id: '3',
    amount: 25000,
    currency: 'USD',
    type: 'TRANSFER_OUT',
    payeeName: 'Savings Account',
    transactionName: 'Transfer to Savings',
    status: 'PENDING',
  }
];

export const Default: Story = {
  args: {
    grouped: {
      'Today': mockTransactions as any,
    },
    groupDates: ['Today'],
    groupCounts: [3],
    formatCurrency: mockFormatCurrency,
    onEdit: () => console.log('Edit clicked'),
    onDelete: () => console.log('Delete clicked'),
    onComments: () => console.log('Comments clicked'),
  },
};
