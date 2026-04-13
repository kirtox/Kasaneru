import { NextRequest, NextResponse } from "next/server";
import { ProxyAgent, fetch as proxyFetch } from "undici";

interface VisionTextAnnotation {
  description: string;
  locale?: string;
}

interface TranslateResult {
  translatedText: string;
}

// 先直連，失敗時自動透過 proxy 重試
async function fetchWithProxy(
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
    return res;
  } catch (error) {
    const proxyUrl = process.env.PROXY_URL;
    if (!proxyUrl) throw error;

    console.log("Direct fetch failed, retrying with proxy...");
    const agent = new ProxyAgent(proxyUrl);
    const res = await proxyFetch(url, { ...init, dispatcher: agent });
    return res;
  }
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

    const visionRes = await fetchWithProxy(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              imageContext: {
                languageHints: ["ja", "en"],
              },
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
        storeNameJP: "",
        items: [],
        totalAmount: 0,
        rawText: "",
        language: "unknown",
      });
    }

    const rawText = annotations[0].description;
    const language = annotations[0].locale ?? "unknown";

    // 解析收據
    const parsed = parseReceipt(rawText);

    // 非中文：翻譯店名和品名
    let finalStoreName = parsed.storeName;
    let finalItems = parsed.items;
    if (language !== "zh" && language !== "zh-TW" && language !== "zh-CN") {
      const textsToTranslate = [
        parsed.storeName,
        ...parsed.items.map((i) => i.name),
      ];
      const translations = await translateTexts(textsToTranslate, visionApiKey);
      finalStoreName = translations[0] ?? parsed.storeName;
      finalItems = parsed.items.map((item, i) => ({
        ...item,
        nameOriginal: item.name,
        name: translations[i + 1] ?? item.name,
      }));
    }

    return NextResponse.json({
      storeName: finalStoreName,
      storeNameJP: parsed.storeName,
      items: finalItems,
      totalAmount: parsed.totalAmount,
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

  // === 店名 ===
  let storeName = "";
  for (const line of lines.slice(0, 5)) {
    if (/^[\d\-()\s+]+$/.test(line)) continue;
    if (/^〒|^\d{3}-\d{4}/.test(line)) continue;
    if (/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(line)) continue;
    if (/^TEL|^FAX|^tel|^fax|^電話/i.test(line)) continue;
    storeName = line;
    break;
  }

  // === 排除關鍵字 ===
  const excludeKeywords = /^(小計|合計|total|subtotal|お預り|お釣|釣銭|税|消費税|外税|内税|現金|クレジット|カード|お支払|支払|領収|レシート|No\.|登録|責任者|担当|点数|\d{4}[\/-]|\d{4}年|レジ|電話|TEL|FAX|〒|\(|（|キャッシュ|交通系|青|証|収)/i;

  // === Phase 1: 同一行匹配（品名+價格在同一行）===
  const items: { name: string; nameOriginal: string; price: number; quantity: number; taxFree: boolean }[] = [];
  const sameLinePatterns = [
    /^(.+?)[\s　]+[¥￥]?\s*(\d[\d,]*)\s*(?:円|軽|軽減)?\s*$/,   // 品名 ¥1,234軽
    /^(.+?)[\s　]+@?\s*(\d[\d,]*)\s*[×x]\s*(\d+)/i,              // 品名 @100 x2
    /^[¥￥]\s*(\d[\d,]*)\s*(?:軽|円)?\s+(.+)$/,                   // ¥1234 品名
  ];

  for (const line of lines) {
    if (excludeKeywords.test(line)) continue;

    for (const pattern of sameLinePatterns) {
      const match = line.match(pattern);
      if (match) {
        const isReversed = pattern === sameLinePatterns[2];
        const hasQuantity = pattern === sameLinePatterns[1] && match[3];
        const name = (isReversed ? match[2] : match[1]).trim().replace(/^[専＊\*]\s*/, "");
        const priceStr = (isReversed ? match[1] : match[2]).replace(/,/g, "");
        const price = parseInt(priceStr, 10);
        const quantity = hasQuantity ? parseInt(match[3], 10) : 1;

        if (price > 0 && price < 1_000_000 && name.length >= 2 && name.length < 40) {
          const taxFree = /非課税|免税|免稅/.test(line);
          items.push({ name, nameOriginal: name, price, quantity, taxFree });
        }
        break;
      }
    }
  }

  // === Phase 2: 兩欄式匹配（品名和價格在不同行）===
  if (items.length <= 1) {
    // 找到品項區段（在 header 之後、合計之前）
    let sectionStart = 0;
    let sectionEnd = lines.length;

    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      if (/^レジ|^青\s*No|^領|^収|^証|^\d{4}年/.test(lines[i])) {
        sectionStart = Math.max(sectionStart, i + 1);
      }
    }
    for (let i = sectionStart; i < lines.length; i++) {
      if (/^合計/.test(lines[i])) {
        sectionEnd = i;
        break;
      }
    }

    const itemNames: string[] = [];
    const standalonePrices: number[] = [];
    // 獨立價格行：¥118軽、¥1,234、￥500円
    const standalonePriceRe = /^[¥￥]\s*(\d[\d,]*)\s*(軽|軽減|円)?\s*$/;

    for (let i = sectionStart; i < sectionEnd; i++) {
      const line = lines[i];
      if (excludeKeywords.test(line)) continue;

      const priceMatch = line.match(standalonePriceRe);
      if (priceMatch) {
        standalonePrices.push(parseInt(priceMatch[1].replace(/,/g, ""), 10));
        continue;
      }

      // 品名行：去掉 専 等前綴，長度合理
      const itemName = line.replace(/^[専＊\*]\s*/, "");
      if (itemName.length >= 2 && itemName.length < 30 && !/^\d+$/.test(itemName)) {
        itemNames.push(itemName);
      }
    }

    // 配對品名和價格
    const count = Math.min(itemNames.length, standalonePrices.length);
    if (count > items.length) {
      items.length = 0;
      for (let idx = 0; idx < count; idx++) {
        items.push({
          name: itemNames[idx],
          nameOriginal: itemNames[idx],
          price: standalonePrices[idx],
          quantity: 1,
          taxFree: false,
        });
      }
    }
  }

  // === 總金額 ===
  let totalAmount = 0;
  const totalPatterns = [
    /(?:合計|total|合計金額|お支払い|支払|お会計)[^\d]*[¥￥]?\s*(\d[\d,]*)/i,
    /[¥￥]\s*(\d[\d,]*)\s*(?:合計|total)/i,
  ];
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const m = line.match(pattern);
      if (m) {
        const val = parseInt(m[1].replace(/,/g, ""), 10);
        if (val > totalAmount) totalAmount = val;
      }
    }
  }
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  return { storeName, items, totalAmount };
}

async function translateTexts(
  texts: string[],
  apiKey: string
): Promise<string[]> {
  const nonEmpty = texts.filter((t) => t.length > 0);
  if (nonEmpty.length === 0) return texts;

  const res = await fetchWithProxy(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: nonEmpty,
        target: "zh-TW",
        format: "text",
      }),
    }
  );

  const data = await res.json();
  const translations: TranslateResult[] =
    data.data?.translations ?? [];

  let ti = 0;
  return texts.map((t) => {
    if (t.length === 0) return t;
    return translations[ti++]?.translatedText ?? t;
  });
}
