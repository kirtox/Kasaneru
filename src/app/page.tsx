"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Target, MapPin } from "lucide-react";
import type { Expense } from "@/types";
import { defaultTrip } from "@/lib/trip";

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setExpenses(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayExpenses = expenses.filter((e) => e.date === today);
  const todayTotal = todayExpenses.reduce((s, e) => s + e.totalAmount, 0);
  const tripTotal = expenses.reduce((s, e) => s + e.totalAmount, 0);
  const budgetPercent = Math.min(
    100,
    Math.round((tripTotal / defaultTrip.budget) * 100)
  );

  // 按成員分組
  const memberTotals = defaultTrip.members.map((m) => ({
    ...m,
    total: expenses
      .filter((e) => e.memberId === m.name || e.memberId === m.id)
      .reduce((s, e) => s + e.totalAmount, 0),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        載入中…
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">📊 {defaultTrip.name}</h1>
      <p className="text-sm text-gray-500">
        {defaultTrip.startDate} ~ {defaultTrip.endDate}
      </p>

      {/* 卡片群 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Wallet size={20} />}
          label="今日花費"
          value={`¥${todayTotal.toLocaleString()}`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="旅程累計"
          value={`¥${tripTotal.toLocaleString()}`}
          color="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* 預算進度 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Target size={16} /> 現金預算進度
          </div>
          <span className="text-sm font-medium">
            {budgetPercent}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              budgetPercent > 80 ? "bg-red-500" : "bg-indigo-500"
            }`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>¥{tripTotal.toLocaleString()}</span>
          <span>¥{defaultTrip.budget.toLocaleString()}</span>
        </div>
      </div>

      {/* 成員花費 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-sm text-gray-500 mb-3 flex items-center gap-1">
          👥 成員花費
        </h2>
        <div className="space-y-2">
          {memberTotals.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: m.color + "20" }}
                >
                  {m.avatar}
                </span>
                <span className="text-sm font-medium">{m.name}</span>
              </div>
              <span className="text-sm">¥{m.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 最近消費 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-sm text-gray-500 mb-3">🕐 最近消費</h2>
        {expenses.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">尚無消費記錄</p>
        ) : (
          <div className="divide-y">
            {expenses.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {e.storeName || "未命名"}
                    </span>
                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 shrink-0">
                      {e.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{e.date}</span>
                    {e.region && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={10} /> {e.region}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold ml-2">
                  ¥{e.totalAmount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${color}`}>{icon}</div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}
