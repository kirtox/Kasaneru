"use client";

import { useState } from "react";
import { defaultTrip } from "@/lib/trip";

export default function SettingsPage() {
  const [trip, setTrip] = useState(defaultTrip);
  const [saved, setSaved] = useState(false);

  const updateRegion = (index: number, field: string, value: string) => {
    const newRegions = [...trip.regions];
    newRegions[index] = { ...newRegions[index], [field]: value };
    setTrip({ ...trip, regions: newRegions });
    setSaved(false);
  };

  const addRegion = () => {
    setTrip({
      ...trip,
      regions: [
        ...trip.regions,
        { name: "", startDate: trip.startDate, endDate: trip.endDate },
      ],
    });
    setSaved(false);
  };

  const removeRegion = (index: number) => {
    setTrip({
      ...trip,
      regions: trip.regions.filter((_, i) => i !== index),
    });
    setSaved(false);
  };

  const updateMember = (index: number, field: string, value: string) => {
    const newMembers = [...trip.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setTrip({ ...trip, members: newMembers });
    setSaved(false);
  };

  const addMember = () => {
    setTrip({
      ...trip,
      members: [
        ...trip.members,
        {
          id: String(trip.members.length + 1),
          name: "",
          avatar: "😀",
          color: "#6366f1",
        },
      ],
    });
    setSaved(false);
  };

  const removeMember = (index: number) => {
    setTrip({
      ...trip,
      members: trip.members.filter((_, i) => i !== index),
    });
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("trip", JSON.stringify(trip));
    setSaved(true);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">⚙️ 旅程設定</h1>

      {/* 基本資訊 */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="text-sm text-gray-500">旅程資訊</h2>
        <div>
          <label className="text-sm text-gray-500">旅程名稱</label>
          <input
            value={trip.name}
            onChange={(e) => { setTrip({ ...trip, name: e.target.value }); setSaved(false); }}
            className="w-full mt-1 px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm text-gray-500">開始日期</label>
            <input
              type="date"
              value={trip.startDate}
              onChange={(e) => { setTrip({ ...trip, startDate: e.target.value }); setSaved(false); }}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-gray-500">結束日期</label>
            <input
              type="date"
              value={trip.endDate}
              onChange={(e) => { setTrip({ ...trip, endDate: e.target.value }); setSaved(false); }}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm text-gray-500">預算</label>
            <input
              type="number"
              value={trip.budget}
              onChange={(e) => { setTrip({ ...trip, budget: Number(e.target.value) }); setSaved(false); }}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="w-24">
            <label className="text-sm text-gray-500">幣別</label>
            <select
              value={trip.currency}
              onChange={(e) => { setTrip({ ...trip, currency: e.target.value }); setSaved(false); }}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            >
              <option>JPY</option>
              <option>USD</option>
              <option>TWD</option>
              <option>EUR</option>
            </select>
          </div>
        </div>
      </div>

      {/* 地區日程 */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-gray-500">🗺️ 地區日程（自動判斷消費地區）</h2>
          <button onClick={addRegion} className="text-xs text-indigo-600 font-medium">
            + 新增
          </button>
        </div>
        {trip.regions.map((region, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400">地區</label>
              <input
                value={region.name}
                onChange={(e) => updateRegion(i, "name", e.target.value)}
                placeholder="例如：東京"
                className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">開始</label>
              <input
                type="date"
                value={region.startDate}
                onChange={(e) => updateRegion(i, "startDate", e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">結束</label>
              <input
                type="date"
                value={region.endDate}
                onChange={(e) => updateRegion(i, "endDate", e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <button
              onClick={() => removeRegion(i)}
              className="text-red-400 text-sm pb-1.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* 成員管理 */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-gray-500">👥 成員</h2>
          <button onClick={addMember} className="text-xs text-indigo-600 font-medium">
            + 新增
          </button>
        </div>
        {trip.members.map((member, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="w-14">
              <label className="text-xs text-gray-400">頭像</label>
              <input
                value={member.avatar}
                onChange={(e) => updateMember(i, "avatar", e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm text-center"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">名稱</label>
              <input
                value={member.name}
                onChange={(e) => updateMember(i, "name", e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <div className="w-14">
              <label className="text-xs text-gray-400">顏色</label>
              <input
                type="color"
                value={member.color}
                onChange={(e) => updateMember(i, "color", e.target.value)}
                className="w-full mt-0.5 h-8 border rounded-lg"
              />
            </div>
            <button
              onClick={() => removeMember(i)}
              className="text-red-400 text-sm pb-1.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Notion 設定 */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="text-sm text-gray-500">🔗 Notion 連線</h2>
        <p className="text-xs text-gray-400">
          Notion API Key 和 Database ID 請在伺服器端的 <code>.env.local</code> 設定。
        </p>
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 font-mono">
          NOTION_API_KEY=secret_xxx<br />
          NOTION_DATABASE_ID=xxx<br />
          GOOGLE_CLOUD_API_KEY=xxx
        </div>
      </div>

      {/* 儲存按鈕 */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-medium transition-all ${
          saved
            ? "bg-green-500 text-white"
            : "bg-indigo-600 text-white active:scale-95"
        }`}
      >
        {saved ? "✓ 已儲存" : "儲存設定"}
      </button>
    </div>
  );
}
