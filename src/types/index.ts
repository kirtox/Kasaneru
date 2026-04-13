// 消費記錄（對應 Notion Database 的一行）
export interface Expense {
  id: string;
  date: string;
  itemName: string;          // 商品名稱（繁中）
  itemNameJP: string;        // 商品日文
  storeName: string;         // 商店名稱（繁中）
  storeNameJP: string;       // 商店日文
  amount: number;            // 金額 (JPY)
  amountTWD?: number;        // 金額 (TWD) - Formula 自動計算
  exchangeRate?: number;     // 匯率
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  region: string;            // 地區
  user: string;              // 記帳人
  quantity: number;          // 數量
  taxFree: boolean;          // 免稅
  note?: string;
  notionPageId?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | "食物" | "飲品" | "交通" | "消費" | "娛樂" | "居家" | "3C" | "醫藥" | "其他" | "收入";

export type PaymentMethod =
  | "現金" | "信用卡" | "Suica" | "其他";

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
  storeNameJP: string;
  items: OcrItem[];
  totalAmount: number;
  rawText: string;
  language: string;
  error?: string;
}

export interface OcrItem {
  name: string;
  nameOriginal: string;
  price: number;
  quantity: number;
  taxFree: boolean;
}
