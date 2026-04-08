// 消費記錄
export interface Expense {
  id: string;
  date: string;            // YYYY-MM-DD
  storeName: string;
  totalAmount: number;
  currency: string;        // JPY, USD, TWD …
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  items: ExpenseItem[];
  region: string;          // 自動判斷的地區
  memberId: string;        // 記帳成員
  note?: string;
  receiptImageUrl?: string;
  notionPageId?: string;
  createdAt: string;
}

export interface ExpenseItem {
  name: string;
  nameOriginal?: string;   // 原文
  price: number;
  taxType?: "內含" | "外加" | "免稅";
}

export type ExpenseCategory =
  | "餐飲" | "交通" | "住宿" | "購物"
  | "景點" | "娛樂" | "通訊" | "其他";

export type PaymentMethod =
  | "現金" | "信用卡" | "電子支付" | "IC卡";

// 旅程
export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  regions: TripRegion[];
  members: Member[];
  notionDatabaseId?: string;
}

export interface TripRegion {
  name: string;
  startDate: string;
  endDate: string;
}

// 成員
export interface Member {
  id: string;
  name: string;
  avatar: string;  // emoji or URL
  color: string;   // 識別色
}

// OCR 解析結果
export interface OcrResult {
  storeName: string;
  items: ExpenseItem[];
  totalAmount: number;
  currency: string;
  rawText: string;
  language: string;
}
