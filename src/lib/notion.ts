import { Client } from "@notionhq/client";
import { ProxyAgent, fetch as undiciFetch } from "undici";

function buildNotionClient() {
  const proxyUrl = process.env.PROXY_URL;
  if (proxyUrl) {
    const agent = new ProxyAgent(proxyUrl);
    return new Client({
      auth: process.env.NOTION_API_KEY,
      fetch: (url, init) => undiciFetch(url as string, { ...init, dispatcher: agent } as any) as any,
    });
  }
  return new Client({ auth: process.env.NOTION_API_KEY });
}

const notion = buildNotionClient();
const databaseId = process.env.NOTION_DATABASE_ID!;

export async function addExpense(expense: {
  date: string;
  itemName: string;
  itemNameJP: string;
  storeName: string;
  storeNameJP: string;
  amount: number;
  exchangeRate?: number;
  category: string;
  paymentMethod: string;
  region: string;
  user: string;
  quantity: number;
  taxFree: boolean;
  note?: string;
}) {
  const properties: Record<string, any> = {
    "商品名稱": { title: [{ text: { content: expense.itemName } }] },
    "商店名稱": { rich_text: [{ text: { content: expense.storeName } }] },
    "商店日文": { rich_text: [{ text: { content: expense.storeNameJP } }] },
    "商品日文": { rich_text: [{ text: { content: expense.itemNameJP } }] },
    "日期": { date: { start: expense.date } },
    "金額 (JPY)": { number: expense.amount },
    "類別": { select: { name: expense.category } },
    "支付方式": { select: { name: expense.paymentMethod } },
    "地區": { select: { name: expense.region } },
    "記帳人": { select: { name: expense.user } },
    "數量": { number: expense.quantity },
    "免稅": { checkbox: expense.taxFree },
    "備註": { rich_text: [{ text: { content: expense.note ?? "" } }] },
  };
  if (expense.exchangeRate != null) {
    properties["匯率"] = { number: expense.exchangeRate };
  }
  return notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}

export async function getExpenses() {
  const response = await notion.databases.query({
    database_id: databaseId,
    sorts: [{ property: "日期", direction: "descending" }],
  });

  return response.results.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      notionPageId: page.id,
      date: props["日期"]?.date?.start ?? "",
      itemName: props["商品名稱"]?.title?.[0]?.text?.content ?? "",
      itemNameJP: props["商品日文"]?.rich_text?.[0]?.text?.content ?? "",
      storeName: props["商店名稱"]?.rich_text?.[0]?.text?.content ?? "",
      storeNameJP: props["商店日文"]?.rich_text?.[0]?.text?.content ?? "",
      amount: props["金額 (JPY)"]?.number ?? 0,
      amountTWD: props["金額 (TWD)"]?.formula?.number ?? undefined,
      exchangeRate: props["匯率"]?.number ?? undefined,
      category: props["類別"]?.select?.name ?? "其他",
      paymentMethod: props["支付方式"]?.select?.name ?? "現金",
      region: props["地區"]?.select?.name ?? "",
      user: props["記帳人"]?.select?.name ?? "",
      quantity: props["數量"]?.number ?? 1,
      taxFree: props["免稅"]?.checkbox ?? false,
      note: props["備註"]?.rich_text?.[0]?.text?.content ?? "",
      createdAt: page.created_time,
    };
  });
}

export async function deleteExpense(pageId: string) {
  return notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}
