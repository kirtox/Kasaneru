"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { Expense } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatYen = (v: any) => `¥${Number(v).toLocaleString()}`;

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export default function StatsPage() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        載入中…
      </div>
    );
  }

  // 每日趨勢
  const dailyMap = new Map<string, number>();
  expenses.forEach((e) => {
    dailyMap.set(e.date, (dailyMap.get(e.date) ?? 0) + e.amount);
  });
  const dailyData = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({
      date: date.slice(5), // MM-DD
      金額: amount,
    }));

  // 類別占比
  const categoryMap = new Map<string, number>();
  expenses.forEach((e) => {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + e.amount);
  });
  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // 支付方式分布
  const paymentMap = new Map<string, number>();
  expenses.forEach((e) => {
    const pm = e.paymentMethod || "現金";
    paymentMap.set(pm, (paymentMap.get(pm) ?? 0) + e.amount);
  });
  const paymentData = Array.from(paymentMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // TOP 10 消費
  const top10 = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">📈 統計分析</h1>

      {expenses.length === 0 ? (
        <p className="text-gray-400 text-center py-12">尚無消費資料</p>
      ) : (
        <>
          {/* 每日趨勢 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm text-gray-500 mb-3">每日花費趨勢</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={formatYen} />
                <Bar dataKey="金額" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 類別占比 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm text-gray-500 mb-3">類別占比</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatYen} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 支付方式分布 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm text-gray-500 mb-3">支付方式分布</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {paymentData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatYen} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* TOP 10 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm text-gray-500 mb-3">🏆 TOP 10 消費</h2>
            <div className="divide-y">
              {top10.map((e, i) => (
                <div key={e.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-gray-300"
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{e.itemName || e.storeName || "未命名"}</div>
                      <div className="text-xs text-gray-400">{e.date} · {e.category}</div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">¥{e.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
