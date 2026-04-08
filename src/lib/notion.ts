import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

export async function addExpense(expense: {
  date: string;
  storeName: string;
  totalAmount: number;
  currency: string;
  category: string;
  paymentMethod: string;
  items: { name: string; price: number; taxType?: string }[];
  region: string;
  memberId: string;
  memberName: string;
  note?: string;
}) {
  return notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      店名: { title: [{ text: { content: expense.storeName } }] },
      日期: { date: { start: expense.date } },
      金額: { number: expense.totalAmount },
      幣別: { select: { name: expense.currency } },
      類別: { select: { name: expense.category } },
      支付方式: { select: { name: expense.paymentMethod } },
      地區: { select: { name: expense.region } },
      記帳人: { select: { name: expense.memberName } },
      品項: {
        rich_text: [
          {
            text: {
              content: expense.items
                .map((i) => `${i.name} ¥${i.price}${i.taxType ? `(${i.taxType})` : ""}`)
                .join("\n"),
            },
          },
        ],
      },
      備註: { rich_text: [{ text: { content: expense.note ?? "" } }] },
    },
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
      storeName: props["店名"]?.title?.[0]?.text?.content ?? "",
      totalAmount: props["金額"]?.number ?? 0,
      currency: props["幣別"]?.select?.name ?? "JPY",
      category: props["類別"]?.select?.name ?? "其他",
      paymentMethod: props["支付方式"]?.select?.name ?? "現金",
      region: props["地區"]?.select?.name ?? "",
      memberId: props["記帳人"]?.select?.name ?? "",
      items: [],
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
