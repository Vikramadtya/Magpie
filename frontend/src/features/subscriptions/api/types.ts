export interface Subscription {
  id: string;
  name: string;
  amount: number;
  nextBillingDate: string;
  billingCycle: string;
  accountId?: string;
  categoryId?: string;
  categoryName?: string;
  status: string;
  currency: string;
}
