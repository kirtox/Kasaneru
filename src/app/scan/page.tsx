"use client";

import { useRef, useState } from "react";
import { Camera, Upload, Loader2, Plus, Trash2 } from "lucide-react";
import type { OcrResult, ExpenseCategory, PaymentMethod } from "@/types";

const categories: ExpenseCategory[] = [
  "食物", "飲品", "交通", "消費", "娛樂", "居家", "3C", "醫藥", "其他", "收入",
];
const paymentMethods: PaymentMethod[] = [
  "現金", "信用卡", "Suica", "其他",
];

interface EditableItem {
  name: string;
  nameJP: string;
  price: number;
  quantity: number;
  taxFree: boolean;
}

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 共用欄位
  const [storeName, setStoreName] = useState("");
  const [storeNameJP, setStoreNameJP] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>("食物");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("現金");
  const [user, setUser] = useState("我");
  const [note, setNote] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateSource, setRateSource] = useState<"auto" | "manual">("auto");

  // 品項
  const [items, setItems] = useState<EditableItem[]>([]);

  const resetForm = () => {
    setStoreName("");
    setStoreNameJP("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategory("食物");
    setPaymentMethod("現金");
    setUser("我");
    setNote("");
    setItems([]);
    setResult(null);
    setPreview(null);
    setSaved(false);
    setShowForm(false);
    setError(null);
    setExchangeRate(null);
    setRateSource("auto");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setLoading(true);
    setResult(null);
    setSaved(false);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data: OcrResult = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResult(data);
      setStoreName(data.storeName ?? "");
      setStoreNameJP(data.storeNameJP ?? "");
      // 自動填入收據日期（如果有識別到）
      if ((data as any).receiptDate) {
        setDate((data as any).receiptDate);
      }
      setItems(
        data.items?.map((i) => ({
          name: i.name,
          nameJP: i.nameOriginal ?? "",
          price: i.price,
          quantity: i.quantity ?? 1,
          taxFree: i.taxFree ?? false,
        })) ?? []
      );
      setShowForm(true);
    } catch (err) {
      console.error("OCR failed:", err);
      setError("OCR 辨識失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleManual = () => {
    setShowForm(true);
    setItems([{ name: "", nameJP: "", price: 0, quantity: 1, taxFree: false }]);
  };

  const addItem = () => {
    setItems([...items, { name: "", nameJP: "", price: 0, quantity: 1, taxFree: false }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = <K extends keyof EditableItem>(index: number, field: K, value: EditableItem[K]) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSave = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          storeName,
          storeNameJP,
          category,
          paymentMethod,
          user,
          note,
          exchangeRate: rateSource === "manual" ? exchangeRate : null,
          items: items.map((i) => ({
            name: i.name,
            nameJP: i.nameJP,
            price: i.price,
            quantity: i.quantity,
            taxFree: i.taxFree,
          })),
        }),
      });
      const data = await res.json();
      if (data.exchangeRate) setExchangeRate(data.exchangeRate);
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

      {/* 錯誤 */}
      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* 表單 */}
      {showForm && !loading && (
        <div className="space-y-4">
          {/* 商店資訊 */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500">商店名稱</label>
                <input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="翻譯後名稱"
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">商店日文</label>
                <input
                  value={storeNameJP}
                  onChange={(e) => setStoreNameJP(e.target.value)}
                  placeholder="日文原名"
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-gray-500">類別</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">支付方式</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                >
                  {paymentMethods.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">記帳人</label>
                <select
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                >
                  <option>我</option>
                  <option>旅伴A</option>
                </select>
              </div>
            </div>
          </div>

          {/* 品項明細 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-gray-500">品項明細</h3>
              <span className="text-sm font-semibold">合計 ¥{totalAmount.toLocaleString()}</span>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(i, "name", e.target.value)}
                        placeholder="品名（中文）"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <input
                    value={item.nameJP}
                    onChange={(e) => updateItem(i, "nameJP", e.target.value)}
                    placeholder="品名（日文原文）"
                    className="w-full px-2 py-1.5 border rounded text-sm text-gray-500"
                  />
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(i, "price", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        placeholder="金額"
                      />
                    </div>
                    <span className="text-xs text-gray-400">×</span>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                      className="w-16 px-2 py-1.5 border rounded text-sm text-center"
                      min={1}
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={item.taxFree}
                        onChange={(e) => updateItem(i, "taxFree", e.target.checked)}
                        className="rounded"
                      />
                      免稅
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="w-full mt-3 py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm flex items-center justify-center gap-1 hover:border-indigo-300 hover:text-indigo-400"
            >
              <Plus size={16} /> 新增品項
            </button>
          </div>

          {/* 備註 */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <label className="text-sm text-gray-500">備註</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="稅制、折扣等資訊"
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            {/* 匯率 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-500">匯率 (JPY→TWD)</label>
                <span className="text-xs text-gray-400">
                  {rateSource === "auto" ? "自動取得" : "手動輸入"}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={exchangeRate ?? ""}
                  onChange={(e) => {
                    setExchangeRate(Number(e.target.value));
                    setRateSource("manual");
                  }}
                  placeholder="自動取得（可手動覆蓋）"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                {rateSource === "manual" && (
                  <button
                    onClick={() => { setExchangeRate(null); setRateSource("auto"); }}
                    className="text-xs text-gray-400 px-2 border rounded-lg"
                  >
                    重置
                  </button>
                )}
              </div>
              {exchangeRate && totalAmount > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  ≈ NT${Math.round(totalAmount * exchangeRate).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* OCR 原始文字 */}
          {result?.rawText && (
            <details className="bg-white rounded-xl p-4 shadow-sm">
              <summary className="text-sm text-gray-500 cursor-pointer">
                OCR 原始辨識文字（點擊展開）
              </summary>
              <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-all bg-gray-50 p-3 rounded-lg max-h-60 overflow-y-auto">
                {result.rawText}
              </pre>
              <p className="text-xs text-gray-400 mt-1">語言：{result.language}</p>
            </details>
          )}

          {/* 儲存 */}
          {saved ? (
            <button
              onClick={resetForm}
              className="w-full py-3 rounded-xl font-medium bg-green-500 text-white"
            >
              ✓ 已儲存 {items.length} 筆 — 繼續記帳
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || items.length === 0}
              className="w-full py-3 rounded-xl font-medium bg-indigo-600 text-white active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "儲存中…" : `儲存 ${items.length} 筆記錄（¥${totalAmount.toLocaleString()}）`}
            </button>
          )}
        </div>
      )}

      {/* 手動輸入 */}
      {!showForm && !loading && (
        <button
          onClick={handleManual}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 mt-4"
        >
          ✏️ 手動輸入（不掃描）
        </button>
      )}
    </div>
  );
}
