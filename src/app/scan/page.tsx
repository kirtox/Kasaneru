"use client";

import { useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import type { OcrResult, ExpenseCategory, PaymentMethod } from "@/types";

const categories: ExpenseCategory[] = [
  "餐飲", "交通", "住宿", "購物", "景點", "娛樂", "通訊", "其他",
];
const paymentMethods: PaymentMethod[] = [
  "現金", "信用卡", "電子支付", "IC卡",
];

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 表單狀態
  const [storeName, setStoreName] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [currency, setCurrency] = useState("JPY");
  const [category, setCategory] = useState<ExpenseCategory>("餐飲");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("現金");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memberId, setMemberId] = useState("1");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // OCR
    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data: OcrResult = await res.json();
      setResult(data);
      setStoreName(data.storeName);
      setTotalAmount(data.totalAmount);
      setCurrency(data.currency);
    } catch (err) {
      console.error("OCR failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          storeName,
          totalAmount,
          currency,
          category,
          paymentMethod,
          items: result?.items ?? [],
          memberId,
          memberName: memberId === "1" ? "我" : "旅伴A",
        }),
      });
      setSaved(true);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">📸 掃描收據</h1>

      {/* 上傳區 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute("capture", "environment");
              fileInputRef.current.click();
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 font-medium active:scale-95 transition-transform"
        >
          <Camera size={20} /> 拍照
        </button>
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute("capture");
              fileInputRef.current.click();
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-xl py-3 font-medium active:scale-95 transition-transform"
        >
          <Upload size={20} /> 相簿
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 預覽 */}
      {preview && (
        <img
          src={preview}
          alt="收據預覽"
          className="w-full rounded-xl mb-4 max-h-60 object-contain bg-gray-100"
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-indigo-600 py-8">
          <Loader2 className="animate-spin" size={24} />
          <span>辨識中…</span>
        </div>
      )}

      {/* OCR 結果表單 */}
      {result && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <label className="text-sm text-gray-500">店名</label>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm text-gray-500">金額</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="w-24">
                <label className="text-sm text-gray-500">幣別</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option>JPY</option>
                  <option>USD</option>
                  <option>TWD</option>
                  <option>EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm text-gray-500">類別</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-500">支付方式</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  {paymentMethods.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 品項列表 */}
          {result.items.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm text-gray-500 mb-2">品項明細</h3>
              <div className="divide-y">
                {result.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 text-sm">
                    <div>
                      <span>{item.name}</span>
                      {item.nameOriginal && item.nameOriginal !== item.name && (
                        <span className="text-gray-400 ml-1 text-xs">
                          ({item.nameOriginal})
                        </span>
                      )}
                      {item.taxType && (
                        <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.taxType}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">¥{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 儲存 */}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "bg-indigo-600 text-white active:scale-95"
            }`}
          >
            {saving ? "儲存中…" : saved ? "✓ 已儲存到 Notion" : "儲存記錄"}
          </button>
        </div>
      )}

      {/* 手動輸入 */}
      {!result && !loading && (
        <button
          onClick={() =>
            setResult({
              storeName: "",
              items: [],
              totalAmount: 0,
              currency: "JPY",
              rawText: "",
              language: "",
            })
          }
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 mt-4"
        >
          ✏️ 手動輸入（不掃描）
        </button>
      )}
    </div>
  );
}
