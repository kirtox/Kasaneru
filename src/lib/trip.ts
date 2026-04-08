import type { Trip, TripRegion } from "@/types";

/**
 * 根據旅程日程與消費日期，自動判斷消費所在地區
 */
export function detectRegion(date: string, trip: Trip): string {
  const d = new Date(date);
  for (const region of trip.regions) {
    const start = new Date(region.startDate);
    const end = new Date(region.endDate);
    end.setHours(23, 59, 59);
    if (d >= start && d <= end) {
      return region.name;
    }
  }
  return "未知地區";
}

/**
 * 預設旅程（可從 localStorage 或 Notion 讀取）
 */
export const defaultTrip: Trip = {
  id: "default",
  name: "我的旅程",
  startDate: "2026-04-10",
  endDate: "2026-04-17",
  budget: 100000,
  currency: "JPY",
  regions: [
    { name: "東京", startDate: "2026-04-10", endDate: "2026-04-13" },
    { name: "大阪", startDate: "2026-04-14", endDate: "2026-04-17" },
  ],
  members: [
    { id: "1", name: "我", avatar: "😀", color: "#6366f1" },
    { id: "2", name: "旅伴A", avatar: "🧑", color: "#f59e0b" },
  ],
};
