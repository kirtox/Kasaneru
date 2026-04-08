import { NextRequest, NextResponse } from "next/server";

interface VisionTextAnnotation {
  description: string;
  locale?: string;
}

interface TranslateResult {
  translatedText: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Google Cloud Vision OCR
    const visionApiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!visionApiKey) {
      return NextResponse.json({ error: "Missing GOOGLE_CLOUD_API_KEY" }, { status: 500 });
    }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      }
    );

    const visionData = await visionRes.json();
    const annotations: VisionTextAnnotation[] =
      visionData.responses?.[0]?.textAnnotations ?? [];

    if (annotations.length === 0) {
      return NextResponse.json({
        storeName: "",
        items: [],
        totalAmount: 0,
        currency: "JPY",
        rawText: "",
        language: "unknown",
      });
    }

    const rawText = annotations[0].description;
    const language = annotations[0].locale ?? "unknown";

    // 解析收據
    const parsed = parseReceipt(rawText);

    // 非中文翻譯
    let translatedItems = parsed.items;
    if (language !== "zh" && language !== "zh-TW" && language !== "zh-CN") {
      translatedItems = await translateItems(parsed.items, visionApiKey);
    }

    return NextResponse.json({
      storeName: parsed.storeName,
      items: translatedItems,
      totalAmount: parsed.totalAmount,
      currency: parsed.currency,
      rawText,
      language,
    });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
}

function parseReceipt(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // 店名：通常是第一行或前幾行
  const storeName = lines[0] ?? "";

  // 品項 & 價格：尋找 品名 + 數字 的模式
  const items: { name: string; nameOriginal: string; price: number; taxType?: "內含" | "外加" | "免稅" }[] = [];
  const pricePattern = /^(.+?)\s+[¥￥$]?\s*(\d[\d,]*)\s*$/;

  for (const line of lines) {
    const match = line.match(pricePattern);
    if (match) {
      const name = match[1].trim();
      const price = parseInt(match[2].replace(/,/g, ""), 10);
      if (price > 0 && price < 1_000_000) {
        let taxType: "內含" | "外加" | "免稅" | undefined;
        if (/税込|税込み|内税/.test(line)) taxType = "內含";
        else if (/税抜|外税/.test(line)) taxType = "外加";
        else if (/非課税|免税/.test(line)) taxType = "免稅";
        items.push({ name, nameOriginal: name, price, taxType });
      }
    }
  }

  // 總金額：找 合計 / TOTAL / 合計金額
  let totalAmount = 0;
  const totalPattern = /(?:合計|total|合計金額|お支払い|支払)[^\d]*(\d[\d,]*)/i;
  for (const line of lines) {
    const m = line.match(totalPattern);
    if (m) {
      totalAmount = parseInt(m[1].replace(/,/g, ""), 10);
    }
  }
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.price, 0);
  }

  // 幣別判斷
  let currency = "JPY";
  if (/\$|USD/.test(text)) currency = "USD";
  else if (/NT\$|TWD/.test(text)) currency = "TWD";
  else if (/€|EUR/.test(text)) currency = "EUR";

  return { storeName, items, totalAmount, currency };
}

type TaxType = "內含" | "外加" | "免稅";

interface ParsedItem {
  name: string;
  nameOriginal: string;
  price: number;
  taxType?: TaxType;
}

async function translateItems(
  items: ParsedItem[],
  apiKey: string
): Promise<ParsedItem[]> {
  if (items.length === 0) return items;

  const textsToTranslate = items.map((i) => i.name);

  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: textsToTranslate,
        target: "zh-TW",
        format: "text",
      }),
    }
  );

  const data = await res.json();
  const translations: TranslateResult[] =
    data.data?.translations ?? [];

  return items.map((item, i) => ({
    ...item,
    nameOriginal: item.name,
    name: translations[i]?.translatedText ?? item.name,
  }));
}
