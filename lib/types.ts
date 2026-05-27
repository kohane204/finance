export interface DashboardStats {
  currentMonth: {
    income: number;
    expense: number;
  };
  lastMonth: {
    income: number;
    expense: number;
  };
  diff: {
    income: number;
    expense: number;
  };
  chartData: Array<{
    date: string;
    fullDate: string;
    income: number;
    expense: number;
  }>;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  period: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: Date;
  categoryName: string;
  spent: number;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string | null;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bill {
    id: string;
    userId: string;
    name: string;
    amount: string;
    dueDate: string;
    frequency: string;
    categoryId: string | null;
    status: string;
    lastPaidDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    categoryName?: string;
}

export interface Account {
    id: string;
    userId: string;
    name: string;
    type: string;
    balance: string;
    currency: string;
    color: string | null;
    accountNumber: string | null;
    bankId: string | null;
    holderName: string | null;
    expiryDate: string | null;
    cvv: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Loan {
    id: string;
    lenderId: string;
    borrowerId: string;
    amount: string;
    interestRate: string;
    deadline: Date;
    status: string;
    createdAt: Date;
    updatedAt?: Date;
    lender?: { name: string | null; image: string | null } | null;
    borrower?: { name: string | null; image: string | null } | null;
}
