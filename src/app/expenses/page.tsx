"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, Filter } from "lucide-react";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/types";

const CATEGORIES: ExpenseCategory[] = [
  "食物", "飲品", "交通", "消費", "娛樂", "居家", "3C", "醫藥", "其他", "收入",
];
const PAYMENT_METHODS: PaymentMethod[] = ["現金", "信用卡", "Suica", "其他"];

const CATEGORY_EMOJI: Record<string, string> = {
  "食物": "🍱", "飲品": "🧋", "交通": "🚆", "消費": "🛍️", "娛樂": "🎮",
  "居家": "🏠", "3C": "📱", "醫藥": "💊", "其他": "📦", "收入": "💰",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("全部");
  const [showFilter, setShowFilter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Expense>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/expenses";
      const storedTrips = localStorage.getItem("trips");
      const activeId = localStorage.getItem("activeTripId");
      if (storedTrips && activeId) {
        const trips = JSON.parse(storedTrips);
        const active = trips.find((t: any) => t.id === activeId);
        if (active?.startDate && active?.endDate) {
          url = `/api/expenses?startDate=${active.startDate}&endDate=${active.endDate}`;
        }
      }
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setExpenses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const filtered = expenses.filter((e) => {
    const matchCat = filterCategory === "全部" || e.category === filterCategory;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (e.itemName ?? "").toLowerCase().includes(q) ||
      (e.storeName ?? "").toLowerCase().includes(q) ||
      (e.itemNameJP ?? "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setEditDraft({ ...e });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/expenses?id=${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: editDraft.itemName,
          itemNameJP: editDraft.itemNameJP,
          storeName: editDraft.storeName,
          amount: Number(editDraft.amount),
          category: editDraft.category,
          paymentMethod: editDraft.paymentMethod,
          region: editDraft.region,
          user: editDraft.user,
          quantity: Number(editDraft.quantity),
          taxFree: editDraft.taxFree,
          note: editDraft.note,
          date: editDraft.date,
        }),
      });
      if (res.ok) {
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? { ...e, ...editDraft, amount: Number(editDraft.amount), quantity: Number(editDraft.quantity) }
              : e
          )
        );
        setEditingId(null);
        setEditDraft({});
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📋 消費記錄</h1>
        <span className="text-sm text-gray-400">
          {filtered.length} 筆・¥{total.toLocaleString()}
        </span>
      </div>

      {/* 搜尋 + 篩選 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋商品、店名…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
            filterCategory !== "全部"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          <Filter size={14} />
          {filterCategory !== "全部" ? filterCategory : "篩選"}
        </button>
      </div>

      {showFilter && (
        <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          {["全部", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => { setFilterCategory(c); setShowFilter(false); }}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterCategory === c ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {CATEGORY_EMOJI[c] ? `${CATEGORY_EMOJI[c]} ` : ""}{c}
            </button>
          ))}
        </div>
      )}

      {/* 清單 */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
          <span className="text-5xl">📭</span>
          <p className="text-sm">找不到符合的記錄</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              isEditing={editingId === e.id}
              isDeleting={deletingId === e.id}
              draft={editDraft}
              saving={saving}
              onStartEdit={() => startEdit(e)}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onDraftChange={(field, val) => setEditDraft((d) => ({ ...d, [field]: val }))}
              onDeleteClick={() => setDeletingId(deletingId === e.id ? null : e.id)}
              onConfirmDelete={() => confirmDelete(e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpenseRow({
  expense, isEditing, isDeleting, draft, saving,
  onStartEdit, onCancelEdit, onSaveEdit, onDraftChange, onDeleteClick, onConfirmDelete,
}: {
  expense: Expense;
  isEditing: boolean;
  isDeleting: boolean;
  draft: Partial<Expense>;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftChange: (field: string, val: any) => void;
  onDeleteClick: () => void;
  onConfirmDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl border-2 border-indigo-300 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-indigo-600">✏️ 編輯記錄</span>
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-60"
            >
              <Check size={13} /> {saving ? "儲存中…" : "儲存"}
            </button>
            <button
              onClick={onCancelEdit}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm"
            >
              <X size={13} /> 取消
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="商品名稱">
            <input value={draft.itemName ?? ""} onChange={(e) => onDraftChange("itemName", e.target.value)} className="input-field" />
          </Field>
          <Field label="商品日文">
            <input value={draft.itemNameJP ?? ""} onChange={(e) => onDraftChange("itemNameJP", e.target.value)} className="input-field" />
          </Field>
          <Field label="商店名稱">
            <input value={draft.storeName ?? ""} onChange={(e) => onDraftChange("storeName", e.target.value)} className="input-field" />
          </Field>
          <Field label="日期">
            <input type="date" value={draft.date ?? ""} onChange={(e) => onDraftChange("date", e.target.value)} className="input-field" />
          </Field>
          <Field label="金額 (JPY)">
            <input type="number" value={draft.amount ?? ""} onChange={(e) => onDraftChange("amount", e.target.value)} className="input-field" />
          </Field>
          <Field label="數量">
            <input type="number" min={1} value={draft.quantity ?? 1} onChange={(e) => onDraftChange("quantity", e.target.value)} className="input-field" />
          </Field>
          <Field label="類別">
            <select value={draft.category ?? ""} onChange={(e) => onDraftChange("category", e.target.value)} className="input-field">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="支付方式">
            <select value={draft.paymentMethod ?? ""} onChange={(e) => onDraftChange("paymentMethod", e.target.value)} className="input-field">
              {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <Field label="備註">
          <input value={draft.note ?? ""} onChange={(e) => onDraftChange("note", e.target.value)} placeholder="備註（可留空）" className="input-field w-full" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.taxFree ?? false}
            onChange={(e) => onDraftChange("taxFree", e.target.checked)}
            className="rounded"
          />
          免稅商品
        </label>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${isDeleting ? "ring-2 ring-red-200" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-2xl shrink-0">{CATEGORY_EMOJI[expense.category] ?? "📦"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">
              {expense.itemName || expense.storeName || "未命名"}
            </span>
            {expense.taxFree && (
              <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded shrink-0">免稅</span>
            )}
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
            <span>{expense.date}</span>
            {expense.storeName && expense.storeName !== expense.itemName && (
              <span className="truncate max-w-[100px]">@ {expense.storeName}</span>
            )}
            {expense.region && <span className="shrink-0">{expense.region}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold">¥{expense.amount.toLocaleString()}</div>
          {expense.quantity > 1 && <div className="text-xs text-gray-400">×{expense.quantity}</div>}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-300 hover:text-gray-500 transition-colors">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-400 mb-0.5">類別</div>
              <div className="font-medium">{expense.category}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-400 mb-0.5">支付</div>
              <div className="font-medium">{expense.paymentMethod}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-400 mb-0.5">記帳人</div>
              <div className="font-medium">{expense.user || "—"}</div>
            </div>
          </div>
          {expense.note && (
            <p className="text-xs text-gray-400 italic px-1">{expense.note}</p>
          )}
          {isDeleting ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 flex-1">確定刪除這筆記錄？</span>
              <button onClick={onConfirmDelete} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm">確定</button>
              <button onClick={onDeleteClick} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm">取消</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onStartEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium"
              >
                <Edit3 size={13} /> 編輯
              </button>
              <button
                onClick={onDeleteClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-sm font-medium"
              >
                <Trash2 size={13} /> 刪除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      {children}
    </div>
  );
}
