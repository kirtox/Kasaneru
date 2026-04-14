"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Target, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Expense, Trip } from "@/types";
import { defaultTrip } from "@/lib/trip";

const CATEGORY_EMOJI: Record<string, string> = {
  "食物": "🍱", "飲品": "🧋", "交通": "🚆", "消費": "🛍️", "娛樂": "🎮",
  "居家": "🏠", "3C": "📱", "醫藥": "💊", "其他": "📦", "收入": "💰",
};

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<Trip>(defaultTrip);

  useEffect(() => {
    // 從 localStorage 讀取目前使用中的旅程
    let startDate: string | undefined;
    let endDate: string | undefined;
    try {
      const storedTrips = localStorage.getItem("trips");
      const activeId = localStorage.getItem("activeTripId");
      if (storedTrips && activeId) {
        const trips: Trip[] = JSON.parse(storedTrips);
        const active = trips.find((t) => t.id === activeId);
        if (active) {
          setTrip(active);
          startDate = active.startDate;
          endDate = active.endDate;
        }
      }
    } catch { /* ignore */ }

    const url = startDate && endDate
      ? `/api/expenses?startDate=${startDate}&endDate=${endDate}`
      : "/api/expenses";

    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setExpenses(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);
  const tripTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const budgetPercent = Math.min(100, Math.round((tripTotal / trip.budget) * 100));

  const memberTotals = trip.members.map((m) => ({
    ...m,
    total: expenses
      .filter((e) => e.user === m.name || e.user === m.id)
      .reduce((s, e) => s + e.amount, 0),
  }));

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-7 w-44 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold">📊 {trip.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {trip.startDate} ~ {trip.endDate}
        </p>
      </div>

      {/* 統計卡片 */}
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
            <Target size={16} /> 預算進度
          </div>
          <span className={`text-sm font-semibold ${budgetPercent > 80 ? "text-red-500" : "text-gray-600"}`}>
            {budgetPercent}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              budgetPercent > 80 ? "bg-red-500" : budgetPercent > 60 ? "bg-yellow-400" : "bg-indigo-500"
            }`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>¥{tripTotal.toLocaleString()}</span>
          <span>預算 ¥{trip.budget.toLocaleString()}</span>
        </div>
      </div>

      {/* 成員花費 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-sm font-medium text-gray-600 mb-3">👥 成員花費</h2>
        <div className="space-y-3">
          {memberTotals.map((m) => {
            const pct = tripTotal > 0 ? Math.round((m.total / tripTotal) * 100) : 0;
            return (
              <div key={m.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-base"
                      style={{ backgroundColor: m.color + "25" }}
                    >
                      {m.avatar}
                    </span>
                    <span className="text-sm font-medium">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">¥{m.total.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-1">{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 最近消費 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-600">🕐 最近消費</h2>
          <Link href="/expenses" className="flex items-center gap-0.5 text-xs text-indigo-600 font-medium">
            查看全部 <ArrowRight size={12} />
          </Link>
        </div>
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
            <span className="text-4xl">📭</span>
            <p className="text-sm">尚無消費記錄</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {expenses.slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl shrink-0">{CATEGORY_EMOJI[e.category] ?? "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {e.itemName || e.storeName || "未命名"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{e.date}</span>
                    {e.region && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={9} /> {e.region}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold shrink-0">¥{e.amount.toLocaleString()}</span>
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
