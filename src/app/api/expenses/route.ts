import { NextRequest, NextResponse } from "next/server";
import { addExpense, getExpenses, deleteExpense } from "@/lib/notion";
import { detectRegion } from "@/lib/trip";
import { defaultTrip } from "@/lib/trip";
import { ProxyAgent, fetch as proxyFetch } from "undici";

async function fetchExchangeRate(): Promise<number | null> {
  const urls = [
    "https://api.exchangerate-api.com/v4/latest/JPY",
  ];
  const proxyUrl = process.env.PROXY_URL;

  for (const url of urls) {
    try {
      const fetchFn = async () => {
        try {
          const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
          return r;
        } catch {
          if (!proxyUrl) throw new Error("no proxy");
          const agent = new ProxyAgent(proxyUrl);
          return proxyFetch(url, { dispatcher: agent });
        }
      };
      const res = await fetchFn();
      const data = await res.json() as { rates?: { TWD?: number } };
      if (data.rates?.TWD) return data.rates.TWD;
    } catch {
      // continue
    }
  }
  return null;
}

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("GET expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const region = detectRegion(body.date, defaultTrip);

    // 自動抓匯率，失敗則用前端傳入的手動值
    let exchangeRate: number | null = await fetchExchangeRate();
    if (!exchangeRate && body.exchangeRate) {
      exchangeRate = Number(body.exchangeRate);
    }

    const items = body.items ?? [{
      name: body.itemName ?? "",
      nameJP: body.itemNameJP ?? "",
      price: body.amount ?? 0,
      quantity: body.quantity ?? 1,
      taxFree: body.taxFree ?? false,
    }];

    const ids = [];
    for (const item of items) {
      const result = await addExpense({
        date: body.date,
        itemName: item.name,
        itemNameJP: item.nameJP ?? "",
        storeName: body.storeName ?? "",
        storeNameJP: body.storeNameJP ?? "",
        amount: item.price,
        exchangeRate: exchangeRate ?? undefined,
        category: body.category,
        paymentMethod: body.paymentMethod,
        region,
        user: body.user ?? "",
        quantity: item.quantity ?? 1,
        taxFree: item.taxFree ?? false,
        note: body.note ?? "",
      });
      ids.push(result.id);
    }

    return NextResponse.json({ ids, exchangeRate });
  } catch (error) {
    console.error("POST expense error:", error);
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("id");
    if (!pageId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deleteExpense(pageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
