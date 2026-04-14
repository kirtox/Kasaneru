"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, ArrowLeft } from "lucide-react";
import type { Trip } from "@/types";
import { defaultTrip } from "@/lib/trip";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const EMPTY_TRIP: () => Trip = () => ({
  id: genId(),
  name: "新旅程",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  budget: 100000,
  currency: "JPY",
  regions: [],
  members: [{ id: "1", name: "我", avatar: "😊", color: "#6366f1" }],
});

export default function SettingsPage() {
  const [trips, setTrips] = useState<Trip[]>([defaultTrip]);
  const [activeId, setActiveId] = useState<string>(defaultTrip.id);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flashSaved, setFlashSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("trips");
    const storedActiveId = localStorage.getItem("activeTripId");
    if (stored) {
      try {
        const parsed: Trip[] = JSON.parse(stored);
        if (parsed.length > 0) {
          setTrips(parsed);
          setActiveId(storedActiveId ?? parsed[0].id);
          return;
        }
      } catch { /* ignore */ }
    }
    // 第一次使用：把 defaultTrip 寫入 localStorage
    localStorage.setItem("trips", JSON.stringify([defaultTrip]));
    localStorage.setItem("activeTripId", defaultTrip.id);
  }, []);

  const persist = (newTrips: Trip[], newActiveId: string) => {
    setTrips(newTrips);
    setActiveId(newActiveId);
    localStorage.setItem("trips", JSON.stringify(newTrips));
    localStorage.setItem("activeTripId", newActiveId);
  };

  const selectActive = (id: string) => {
    setActiveId(id);
    localStorage.setItem("activeTripId", id);
  };

  const openEdit = (trip: Trip) => {
    setEditingTrip({
      ...trip,
      regions: trip.regions.map((r) => ({ ...r })),
      members: trip.members.map((m) => ({ ...m })),
    });
    setIsNew(false);
  };

  const openNew = () => {
    setEditingTrip(EMPTY_TRIP());
    setIsNew(true);
  };

  const saveEdit = () => {
    if (!editingTrip) return;
    const newTrips = isNew
      ? [...trips, editingTrip]
      : trips.map((t) => (t.id === editingTrip.id ? editingTrip : t));
    const newActiveId = isNew ? editingTrip.id : activeId;
    persist(newTrips, newActiveId);
    setEditingTrip(null);
    setFlashSaved(true);
    setTimeout(() => setFlashSaved(false), 1500);
  };

  const deleteTrip = (id: string) => {
    const newTrips = trips.filter((t) => t.id !== id);
    const newActiveId = id === activeId ? (newTrips[0]?.id ?? "") : activeId;
    persist(newTrips, newActiveId);
    setDeletingId(null);
  };

  const setDraftFn = (fn: (t: Trip) => Trip) => {
    setEditingTrip((prev) => (prev ? fn(prev) : prev));
  };

  if (editingTrip) {
    return (
      <TripForm
        draft={editingTrip}
        isNew={isNew}
        onChange={setDraftFn}
        onSave={saveEdit}
        onCancel={() => setEditingTrip(null)}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">⚙️ 旅程管理</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium"
        >
          <Plus size={14} /> 新增旅程
        </button>
      </div>

      {flashSaved && (
        <div className="bg-green-50 text-green-700 text-sm text-center py-2.5 rounded-xl border border-green-200">
          ✓ 已儲存
        </div>
      )}

      {trips.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
          <span className="text-5xl">🗺️</span>
          <p className="text-sm">還沒有旅程，點右上角新增</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trips.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-colors ${
                activeId === t.id ? "border-indigo-400" : "border-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                <button onClick={() => selectActive(t.id)} className="mt-0.5 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      activeId === t.id ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                    }`}
                  >
                    {activeId === t.id && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{t.name}</span>
                    {activeId === t.id && (
                      <span className="shrink-0 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                        使用中
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{t.startDate} ~ {t.endDate}</p>
                  <p className="text-xs text-gray-400">
                    預算 ¥{t.budget.toLocaleString()} · {t.members.length} 位成員 · {t.regions.length} 個地區
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  {trips.length > 1 && (
                    deletingId === t.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteTrip(t.id)}
                          className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-medium"
                        >
                          確定刪除
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(t.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-medium text-gray-600">🔗 Notion 連線</h2>
        <p className="text-xs text-gray-400">
          API Key 和 Database ID 請在伺服器端的{" "}
          <code className="bg-gray-100 px-1 rounded">.env.local</code> 設定。
        </p>
      </div>
    </div>
  );
}

function TripForm({
  draft,
  isNew,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Trip;
  isNew: boolean;
  onChange: (fn: (t: Trip) => Trip) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (field: Partial<Trip>) => onChange((t) => ({ ...t, ...field }));

  const updateRegion = (i: number, field: string, val: string) =>
    onChange((t) => {
      const r = [...t.regions];
      r[i] = { ...r[i], [field]: val };
      return { ...t, regions: r };
    });

  const addRegion = () =>
    onChange((t) => ({
      ...t,
      regions: [...t.regions, { name: "", startDate: t.startDate, endDate: t.endDate }],
    }));

  const removeRegion = (i: number) =>
    onChange((t) => ({ ...t, regions: t.regions.filter((_, j) => j !== i) }));

  const updateMember = (i: number, field: string, val: string) =>
    onChange((t) => {
      const m = [...t.members];
      m[i] = { ...m[i], [field]: val };
      return { ...t, members: m };
    });

  const addMember = () =>
    onChange((t) => ({
      ...t,
      members: [...t.members, { id: genId(), name: "", avatar: "😀", color: "#6366f1" }],
    }));

  const removeMember = (i: number) =>
    onChange((t) => ({ ...t, members: t.members.filter((_, j) => j !== i) }));

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">{isNew ? "新增旅程" : "編輯旅程"}</h1>
      </div>

      {/* 基本資訊 */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-medium text-gray-500">旅程資訊</h2>
        <div>
          <label className="text-xs text-gray-400">旅程名稱</label>
          <input
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400">開始日期</label>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400">結束日期</label>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => set({ endDate: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400">預算</label>
            <input
              type="number"
              value={draft.budget}
              onChange={(e) => set({ budget: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div className="w-20">
            <label className="text-xs text-gray-400">幣別</label>
            <select
              value={draft.currency}
              onChange={(e) => set({ currency: e.target.value })}
              className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm"
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
          <h2 className="text-sm font-medium text-gray-500">🗺️ 地區日程</h2>
          <button onClick={addRegion} className="text-xs text-indigo-600 font-medium">+ 新增</button>
        </div>
        {draft.regions.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-1">新增後系統會依日期自動判斷消費地點</p>
        )}
        {draft.regions.map((r, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400">地區</label>
              <input
                value={r.name}
                onChange={(e) => updateRegion(i, "name", e.target.value)}
                placeholder="名古屋"
                className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">開始</label>
              <input
                type="date"
                value={r.startDate}
                onChange={(e) => updateRegion(i, "startDate", e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">結束</label>
              <input
                type="date"
                value={r.endDate}
                onChange={(e) => updateRegion(i, "endDate", e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <button onClick={() => removeRegion(i)} className="text-red-400 pb-1.5 text-base">✕</button>
          </div>
        ))}
      </div>

      {/* 成員 */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500">👥 成員</h2>
          <button onClick={addMember} className="text-xs text-indigo-600 font-medium">+ 新增</button>
        </div>
        {draft.members.map((m, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="w-12">
              <label className="text-xs text-gray-400">頭像</label>
              <input
                value={m.avatar}
                onChange={(e) => updateMember(i, "avatar", e.target.value)}
                className="w-full mt-0.5 px-1 py-1.5 border border-gray-200 rounded-lg text-sm text-center"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">名稱</label>
              <input
                value={m.name}
                onChange={(e) => updateMember(i, "name", e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="w-12">
              <label className="text-xs text-gray-400">顏色</label>
              <input
                type="color"
                value={m.color}
                onChange={(e) => updateMember(i, "color", e.target.value)}
                className="w-full mt-0.5 h-[34px] border border-gray-200 rounded-lg"
              />
            </div>
            <button onClick={() => removeMember(i)} className="text-red-400 pb-1.5 text-base">✕</button>
          </div>
        ))}
      </div>

      <button
        onClick={onSave}
        className="w-full py-3 rounded-xl font-medium bg-indigo-600 text-white active:scale-95 transition-transform"
      >
        {isNew ? "建立旅程" : "儲存變更"}
      </button>
    </div>
  );
}
