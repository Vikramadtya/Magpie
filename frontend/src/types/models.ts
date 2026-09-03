export interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: string;
  notes: string;
  name?: string;
  payee?: { id: string; name: string; type?: string };
  categoryName?: string;
  categoryId?: string;
  status: string;
  currency: string;
  entries: any[];
  comments?: { id: string; comment: string; createdAt: string }[];
}

export interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  parentId?: string;
  icon?: string;
  subType?: string;
}
