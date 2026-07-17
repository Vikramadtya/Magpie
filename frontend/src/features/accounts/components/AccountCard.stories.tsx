import type { Meta, StoryObj } from '@storybook/react';
import { AccountCard } from './AccountCard';

const meta = {
  title: 'Components/Accounts/AccountCard',
  component: AccountCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof AccountCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockFormatCurrency = (val: number, currency: string) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val / 100);

export const Default: Story = {
  args: {
    account: {
      id: '1',
      name: 'Chase Checking',
      type: 'CHECKING',
      balance: 1543000,
      currency: 'USD',
    } as any,
    formatCurrency: mockFormatCurrency,
    onEdit: () => console.log('Edit clicked'),
    onDelete: () => console.log('Delete clicked'),
  },
};

export const CreditCard: Story = {
  args: {
    account: {
      id: '2',
      name: 'Amex Platinum',
      type: 'CREDIT_CARD',
      balance: -450000,
      currency: 'USD',
    } as any,
    formatCurrency: mockFormatCurrency,
    onEdit: () => console.log('Edit clicked'),
    onDelete: () => console.log('Delete clicked'),
  },
};

export const Investment: Story = {
  args: {
    account: {
      id: '3',
      name: 'Vanguard 401k',
      type: 'INVESTMENT',
      balance: 12500000,
      currency: 'USD',
    } as any,
    formatCurrency: mockFormatCurrency,
    onEdit: () => console.log('Edit clicked'),
    onDelete: () => console.log('Delete clicked'),
  },
};
