export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  dueDate: string | null;
  priority: number;
  currency: string;
  accountId?: string;
}
