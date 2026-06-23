export interface User {
  teams: string[];
  role: "admin" | "team";
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  teams?: string[];
  role?: "admin" | "team";
  error?: string;
}

export interface Q2Item {
  id: string;
  entity: "LTD" | "LC";
  department: string;
  costHeading: string;
  description: string;
  isSubtotal: boolean;
  isHeader: boolean;
  aprBudget: number;
  mayBudget: number;
  mayActual: number;
  mayVariance: number;
  mayRemaining: number;
  junBudget: number;
  junActual: number;
  junVariance: number;
  junRemaining: number;
  totalBudget: number;
  totalActual: number;
  totalRemaining: number;
}

export interface Q3Item {
  id: string;
  entity: "LTD" | "LC";
  team: string;
  subTeam: string;
  costType: string;
  purpose: string;
  isSubtotal: boolean;
  julBudget: number;
  julActual: number;
  julVar: number;
  julRem: number;
  augBudget: number;
  augActual: number;
  augVar: number;
  augRem: number;
  sepBudget: number;
  sepActual: number;
  sepVar: number;
  sepRem: number;
  q3Total: number;
}

export interface SpreadsheetData {
  ltdQ2: Q2Item[];
  ltdQ3: Q3Item[];
  lcQ2: Q2Item[];
  lcQ3: Q3Item[];
  ltdQ4?: Q3Item[];
  lcQ4?: Q3Item[];
}

export interface Requisition {
  id: string;
  timestamp: string;
  team: string;
  submittedBy: string;
  designation: string;
  contact: string;
  email: string;
  dateOfSubmission: string;
  department: string;
  month: string;
  budgetLine: string;
  costHeading: string;
  amount: number;
  projectName: string;
  vendorName: string;
  purpose: string;
  description: string;
  invoiceLink: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface APIResponse {
  success: boolean;
  title: string;
  sheetsMeta: string[];
  spreadsheetId: string;
  currentUser?: User;
  data: SpreadsheetData;
  error?: string;
}
