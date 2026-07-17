import type { Meta, StoryObj } from '@storybook/react';
import { BudgetCard } from './BudgetCard';

const meta = {
  title: 'Components/Budgets/BudgetCard',
  component: BudgetCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BudgetCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockFormatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);

export const Default: Story = {
  args: {
    budget: {
      id: '1',
      categoryName: 'Groceries',
      amount: 50000, // $500.00
      spent: 32000,  // $320.00
      period: 'MONTHLY',
    } as any,
    formatCurrency: mockFormatCurrency,
  },
};

export const OverBudget: Story = {
  args: {
    budget: {
      id: '2',
      categoryName: 'Entertainment',
      amount: 15000, // $150.00
      spent: 20000,  // $200.00
      period: 'MONTHLY',
    } as any,
    formatCurrency: mockFormatCurrency,
  },
};

export const Empty: Story = {
  args: {
    budget: {
      id: '3',
      categoryName: 'Transport',
      amount: 10000, // $100.00
      spent: 0,
      period: 'MONTHLY',
    } as any,
    formatCurrency: mockFormatCurrency,
  },
};
