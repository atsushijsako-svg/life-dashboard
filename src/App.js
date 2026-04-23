import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { supabase } from "./supabase";

const START = { weight: 78, fat: 20 };
const GOALS_3M = { weight: 75, fat: 17 };
const GOALS_6M = { weight: 73, fat: 15 };
const GOALS_1Y = { weight: 71, fat: 13 };
const START_DATE = new Date("2026-04-23");
const PROTEIN_GOAL_KEY = "protein_goal";
const DRAFT_KEY = "daily_draft";

function getWeekNumber() {
  const diff = Math.floor((new Date() - START_DATE) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diff + 1);
}

function getWeeklyGoal(weekNum) {
  const wDiff = START.weight - GOALS_3M.weight;
  const fDiff = START.fat - GOALS_3M.fat;
  let progress = 0;
  if (weekNum <= 4) progress = (weekNum / 4) * 0.40;
  else if (weekNum <= 8) progress = 0.40 + ((weekNum - 4) / 4) * 0.35;
  else progress = 0.75 + ((weekNum - 8) / 5) * 0.25;
  return {
    weight: Math.round((START.weight - wDiff * Math.min(1, progress)) * 10) / 10,
    fat: Math.round((START.fat - fDiff * Math.min(1, progress)) * 10) / 10,
  };
}

function formatDecimalInput(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 3) return digits.slice(0, -1) + "." + digits.slice(-1);
  return digits;
}

const WEEKLY = [
  { day: "月", items: ["筋トレ", "水泳", "仕事", "発信"] },
  { day: "火", items: ["休息", "仕事", "発信"] },
  { day: "水", items: ["筋トレ", "水泳", "仕事", "発信"] },
  { day: "木", items: ["休息", "仕事", "発信"] },
  { day: "金", items: ["筋トレ", "水泳", "仕事", "発信"] },
  { day: "土", items: ["自由"] },
  { day: "日", items: ["自由", "ログ更新"] },
];

const DAYS = ["日","月","火","水","木","金","土"];
function todayLabel() {
  const n = new Date();
  return `${n.getMonth()+1}/${n.getDate()}(${DAYS[n.getDay()]})`;
}

const TIMING_OPTIONS = ["朝", "朝食", "昼食", "夕食", "間食", "風呂前", "就寝前", "その他"];

const EMPTY_FORM = {
  提案数: "", 発信: "", 発信メモ: "", 営業: "", 営業メモ: "",
  筋トレ: "", 筋トレメモ: "", 水泳: "", 水泳メモ: "", 食事: "", 食事メモ: "",
  朝ストレッチ: "", 夜ストレッチ: "", 水2L: "",
  体重: "", 体脂肪: "", 腹回り: "",
};

const c = {
  bg: "#f7f8fc", card: "#ffffff", border: "#e8eaf0",
  accent: "#3b7ef8", green: "#16a87e", red: "#e05555",
  yellow: "#e8a020", text: "#1a1d2e", muted: "#8892a4",
  section: "#f0f2f8", workBg: "#f0f5ff", bodyBg: "#f0fdf8", healthBg: "#fffbf0",
};

const inputStyle = { width: "100%", background: c.section, border: `1px solid ${c.border}`, borderRadius: 12, padding: "13px 14px", color: c.text, fontSize: 16, boxSizing: "border-box", marginTop: 6, outline: "none" };

// ===== サブコンポーネント =====
function ToggleWithMemo({ fieldKey, val, memoVal, onToggle, onMemoChange }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        {["◎", "×"].map(v => (
          <button key={v} onClick={() => onToggle(fieldKey, v)} style={{
            flex: 1, padding: "13px 0", borderRadius: 12,
            border: `2px solid ${val === v ? (v === "◎" ? c.green : c.red) : c.border}`,
            cursor: "pointer", fontSize: 17, fontWeight: 700,
            background: val === v ? (v === "◎" ? "#e8faf4" : "#fdeaea") : c.card,
            color: val === v ? (v === "◎" ? c.green : c.red) : c.muted,
          }}>{v}</button>
        ))}
      </div>
      <input type="text" value={memoVal || ""}
        onChange={e => onMemoChange(fieldKey + "メモ", e.target.value)}
        placeholder="一言メモ（任意）"
        style={{ width: "100%", marginTop: 6, padding: "9px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.section, fontSize: 13, color: c.text, boxSizing: "border-box", outline: "none" }}
      />
    </div>
  );
}

function SimpleToggle({ fieldKey, val, onToggle }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      {["◎", "×"].map(v => (
        <button key={v} onClick={() => onToggle(fieldKey, v)} style={{
          flex: 1, padding: "13px 0", borderRadius: 12,
          border: `2px solid ${val === v ? (v === "◎" ? c.green : c.red) : c.border}`,
          cursor: "pointer", fontSize: 17, fontWeight: 700,
          background: val === v ? (v === "◎" ? "#e8faf4" : "#fdeaea") : c.card,
          color: val === v ? (v === "◎" ? c.green : c.red) : c.muted,
        }}>{v}</button>
      ))}
    </div>
  );
}

function DecimalInput({ fieldKey, value, placeholder, onChange }) {
  const handleChange = (e) => {
    onChange(fieldKey, e.target.value);
  };
  const handleBlur = (e) => {
    const formatted = formatDecimalInput(e.target.value);
    onChange(fieldKey, formatted);
  };
  return (
    <input type="tel" inputMode="numeric" value={value || ""}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function ProteinInputRow({ timing, onAdd }) {
  const [gVal, setGVal] = useState("");
  const [memoVal, setMemoVal] = useState("");
  const hasG = !!gVal;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type="number" value={gVal}
          onChange={e => setGVal(e.target.value)}
          placeholder="g数"
          style={{ width: 70, padding: "9px 10px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, fontSize: 14, color: c.text, outline: "none" }}
        />
        <input type="text" value={memoVal}
          onChange={e => setMemoVal(e.target.value)}
          placeholder="一言（例：鶏むね肉）"
          style={{ flex: 1, padding: "9px 10px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, fontSize: 13, color: c.text, outline: "none" }}
        />
      </div>
      <button onClick={() => {
        if (!gVal) return;
        onAdd({ timing, g: gVal, memo: memoVal });
        setGVal("");
        setMemoVal("");
      }} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: hasG ? c.accent : c.border, color: hasG ? "#fff" : c.muted, fontSize: 13, fontWeight: 700, cursor: hasG ? "pointer" : "default" }}>
        追加する
      </button>
    </div>
  );
}

const Card = ({ children, bg }) => (
  <div style={{ background: bg || c.card, borderRadius: 18, padding: 18, border: `1px solid ${c.border}`, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>{children}</div>
);
const ST = ({ children, color }) => (
  <div style={{ fontSize: 11, color: color || c.muted, fontWeight: 700, letterSpacing: 1.5, marginBottom: 14 }}>{children}</div>
);
const FL = ({ children }) => <div style={{ fontSize: 12, color: c.muted, marginBottom: 2 }}>{children}</div>;

// ===== メインコンポーネント =====
export default function App() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proteinGoal, setProteinGoal] = useState(120);
  const [proteinGoalInput, setProteinGoalInput] = useState("");
  const [showProteinGoalEdit, setShowProteinGoalEdit] = useState(false);
  const [proteinEntries, setProteinEntries] = useState([]);
  const [selectedTiming, setSelectedTiming] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [autoSaveMsg, setAutoSaveMsg] = useState("");
  const [initialized, setInitialized] = useState(false);

  const todayDay = DAYS[new Date().getDay()];
  const isSun = new Date().getDay() === 0;
  const weekNum = getWeekNumber();
  const weekGoal = getWeeklyGoal(weekNum);

  // 起動時：localStorageから途中経過を復元 + Supabaseからデータ読み込み
  useEffect(() => {
    const savedGoal = localStorage.getItem(PROTEIN_GOAL_KEY);
    if (savedGoal) setProteinGoal(Number(savedGoal));

    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.date === todayLabel()) {
          setForm(parsed.form || EMPTY_FORM);
          setProteinEntries(parsed.proteinEntries || []);
          setDraftRestored(true);
          setAutoSaveMsg("下書きを復元しました");
          setTimeout(() => {
            setAutoSaveMsg("");
            setDraftRestored(false);
          }, 3000);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch (e) {
        localStorage.removeItem(DRAFT_KEY);
      }
    }

    loadData();
    setInitialized(true);
  }, []);

  // formやproteinEntriesが変わるたびに自動保存（初期化後のみ）
  useEffect(() => {
    if (!initialized) return;
    const draft = {
      date: todayLabel(),
      form,
      proteinEntries,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

    if (!draftRestored) {
      const hasAnyInput = Object.values(form).some(v => v !== "") || proteinEntries.length > 0;
      if (hasAnyInput) {
        setAutoSaveMsg("途中経過は自動保存されています");
        const timer = setTimeout(() => setAutoSaveMsg(""), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [form, proteinEntries, initialized]);

  // proteinGoal変更時にlocalStorageに保存
  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(PROTEIN_GOAL_KEY, String(proteinGoal));
  }, [proteinGoal, initialized]);

  const loadData = async () => {
    try {
      const { data: rows, error } = await supabase.from('logs').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      const mapped = (rows || []).map(r => ({
        date: r.date,
        提案数: r.teian_suu,
        発信: r.hassan, 発信メモ: r.hassan_memo || "",
        営業: r.eigyo, 営業メモ: r.eigyo_memo || "",
        筋トレ: r.kintore, 筋トレメモ: r.kintore_memo || "",
        水泳: r.suiei, 水泳メモ: r.suiei_memo || "",
        食事: r.shokuji, 食事メモ: r.shokuji_memo || "",
        朝ストレッチ: r.asa_stretch || null,
        夜ストレッチ: r.yoru_stretch || null,
        水2L: r.mizu_2l || null,
        タンパク質g: r.tanpaku_g || null,
        体重: r.taiju, 体脂肪: r.taishibo, 腹回り: r.haramawari,
      }));
      setData(mapped);
    } catch (e) {
      setError("読み込み失敗: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key, value) => {
    setForm(prev => ({ ...prev, [key]: prev[key] === value ? "" : value }));
  };
  const handleFieldChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const totalProtein = proteinEntries.reduce((sum, e) => sum + (Number(e.g) || 0), 0);
  const proteinRemaining = Math.max(0, proteinGoal - totalProtein);
  const proteinProgress = Math.min(100, Math.round((totalProtein / proteinGoal) * 100));

  // 入力済み項目数をカウント（進捗表示用）
  const filledCount = [
    form.発信, form.営業, form.筋トレ, form.水泳, form.食事,
    form.朝ストレッチ, form.夜ストレッチ, form.水2L,
    form.体重
  ].filter(v => v && v !== "").length;

  const save = async () => {
    const row = {
      date: todayLabel(),
      teian_suu: form.提案数 !== "" ? Number(form.提案数) : null,
      hassan: form.発信 || null, hassan_memo: form.発信メモ || null,
      eigyo: form.営業 || null, eigyo_memo: form.営業メモ || null,
      kintore: form.筋トレ || null, kintore_memo: form.筋トレメモ || null,
      suiei: form.水泳 || null, suiei_memo: form.水泳メモ || null,
      shokuji: form.食事 || null, shokuji_memo: form.食事メモ || null,
      asa_stretch: form.朝ストレッチ || null,
      yoru_stretch: form.夜ストレッチ || null,
      mizu_2l: form.水2L || null,
      tanpaku_g: totalProtein > 0 ? totalProtein : null,
      taiju: form.体重 !== "" ? Number(form.体重) : null,
      taishibo: form.体脂肪 !== "" ? Number(form.体脂肪) : null,
      haramawari: form.腹回り !== "" ? Number(form.腹回り) : null,
    };
    try {
      const { error } = await supabase.from('logs').insert([row]);
      if (error) throw error;
      await loadData();

      // 下書きをクリア
      localStorage.removeItem(DRAFT_KEY);
      setForm(EMPTY_FORM);
      setProteinEntries([]);
      setSelectedTiming("");
      setAutoSaveMsg("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError("保存失敗: " + e.message);
    }
  };

  const latest = data[data.length - 1];
  const lw = latest?.体重 ?? "-";
  const lf = latest?.体脂肪 ?? "-";
  const wDiff = typeof lw === "number" ? (lw - weekGoal.weight).toFixed(1) : "-";
  const fDiff = typeof lf === "number" ? (lf - weekGoal.fat).toFixed(1) : "-";
  const circle = k => data.filter(d => d[k] === "◎").length;
  const total = k => data.filter(d => d[k]).length;
  const rate = k => total(k) === 0 ? 0 : Math.round(circle(k) / total(k) * 100);
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (["発信","筋トレ","食事","営業"].every(k => data[i][k] === "◎")) streak++;
    else break;
  }
  const graphData = data.filter(d => d.体重 || d.体脂肪).map(d => ({ name: d.date, 体重: d.体重, 体脂肪: d.体脂肪 }));

  if (loading) return (
    <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <div style={{ fontSize: 14, color: c.muted }}>読み込み中...</div>
    </div>
  );

  return (
    <div style={{ background: c.bg, minHeight: "100vh", color: c.text, fontFamily: "'Hiragino Sans', 'Yu Gothic', sans-serif", maxWidth: 420, margin: "0 auto", paddingBottom: 90 }}>

      {/* ヘッダー */}
      <div style={{ background: c.card, padding: "18px 18px 14px", borderBottom: `1px solid ${c.border}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: c.muted, letterSpacing: 2 }}>LIFE DASHBOARD · Week {weekNum}</div>
          <div style={{ fontSize: 10, color: c.green }}>● 同期中</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 32, fontWeight: 800, color: c.accent }}>{lw}</span>
            <span style={{ fontSize: 13, color: c.muted }}> kg　</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: c.red }}>{lf}</span>
            <span style={{ fontSize: 13, color: c.muted }}> %</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: c.muted }}>今週目標まで</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: Number(wDiff) > 0 ? c.red : c.green }}>{wDiff}kg / {fDiff}%</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {[
            { label: "今週", weight: weekGoal.weight, fat: weekGoal.fat, highlight: true },
            { label: "3ヶ月", weight: GOALS_3M.weight, fat: GOALS_3M.fat },
            { label: "6ヶ月", weight: GOALS_6M.weight, fat: GOALS_6M.fat },
            { label: "1年", weight: GOALS_1Y.weight, fat: GOALS_1Y.fat },
          ].map(g => (
            <div key={g.label} style={{ background: g.highlight ? "#eff6ff" : c.section, borderRadius: 12, padding: "8px 6px", textAlign: "center", border: g.highlight ? `1.5px solid ${c.accent}` : `1px solid ${c.border}` }}>
              <div style={{ fontSize: 9, color: g.highlight ? c.accent : c.muted, fontWeight: g.highlight ? 700 : 400, marginBottom: 3 }}>{g.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.accent }}>{g.weight}kg</div>
              <div style={{ fontSize: 11, color: c.red }}>{g.fat}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: "flex", background: c.card, borderBottom: `1px solid ${c.border}` }}>
        {["入力", "今週", "グラフ"].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ flex: 1, padding: "13px 0", border: "none", cursor: "pointer", background: "transparent", fontSize: 13, fontWeight: tab === i ? 700 : 400, color: tab === i ? c.accent : c.muted, borderBottom: tab === i ? `2.5px solid ${c.accent}` : "2.5px solid transparent" }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "14px 14px 0" }}>
        {error && (
          <div style={{ background: "#fdeaea", border: `1px solid ${c.red}`, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 13, color: c.red, textAlign: "center" }}>
            ⚠️ {error}
            <button onClick={() => setError("")} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: c.red, fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* ===== 入力タブ ===== */}
        {tab === 0 && (
          <div>
            {/* 日付と進捗バナー */}
            <div style={{ background: c.card, borderRadius: 14, padding: "12px 16px", marginBottom: 12, border: `1px solid ${c.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>📅 {todayLabel()}</div>
                <div style={{ fontSize: 11, color: filledCount === 9 ? c.green : c.muted, fontWeight: filledCount === 9 ? 700 : 400 }}>
                  {filledCount === 9 ? "✅ 全項目入力済み" : `${filledCount} / 9 項目入力済み`}
                </div>
              </div>
              {/* 進捗バー */}
              <div style={{ background: c.section, borderRadius: 6, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((filledCount / 9) * 100)}%`, height: "100%", background: filledCount === 9 ? c.green : c.accent, borderRadius: 6, transition: "width 0.3s" }} />
              </div>
              {/* 自動保存メッセージ */}
              {autoSaveMsg && (
                <div style={{
                  fontSize: 11,
                  color: draftRestored ? c.green : c.muted,
                  marginTop: 6,
                  fontWeight: draftRestored ? 600 : 400,
                  transition: "opacity 0.3s",
                }}>
                  {draftRestored ? "✓ " : "💾 "}{autoSaveMsg}
                </div>
              )}
            </div>

            {saved && (
              <div style={{ background: "#e8faf4", border: `1px solid ${c.green}`, borderRadius: 14, padding: 14, textAlign: "center", color: c.green, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                ✅ 保存しました！お疲れ様でした🎉
              </div>
            )}

            {/* 仕事 */}
            <Card bg={c.workBg}>
              <ST color={c.accent}>💼 仕事</ST>
              <div style={{ marginBottom: 14 }}>
                <FL>提案数（件）</FL>
                <input type="number" value={form.提案数}
                  onChange={e => handleFieldChange("提案数", e.target.value)}
                  placeholder="0" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FL>発信</FL>
                <ToggleWithMemo fieldKey="発信" val={form.発信} memoVal={form.発信メモ} onToggle={handleToggle} onMemoChange={handleFieldChange} />
              </div>
              <div>
                <FL>営業</FL>
                <ToggleWithMemo fieldKey="営業" val={form.営業} memoVal={form.営業メモ} onToggle={handleToggle} onMemoChange={handleFieldChange} />
              </div>
            </Card>

            {/* ボディメイク */}
            <Card bg={c.bodyBg}>
              <ST color={c.green}>💪 ボディメイク</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {["筋トレ", "水泳"].map(key => (
                  <div key={key}>
                    <FL>{key}</FL>
                    <ToggleWithMemo fieldKey={key} val={form[key]} memoVal={form[key + "メモ"]} onToggle={handleToggle} onMemoChange={handleFieldChange} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 14 }}>
                <FL>食事</FL>
                <ToggleWithMemo fieldKey="食事" val={form.食事} memoVal={form.食事メモ} onToggle={handleToggle} onMemoChange={handleFieldChange} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: isSun ? 14 : 0 }}>
                <div>
                  <FL>体重 (kg) ※3桁→自動変換</FL>
                  <DecimalInput fieldKey="体重" value={form.体重} placeholder="780→78.0" onChange={handleFieldChange} />
                </div>
                <div>
                  <FL>体脂肪 (%) ※3桁→自動変換</FL>
                  <DecimalInput fieldKey="体脂肪" value={form.体脂肪} placeholder="200→20.0" onChange={handleFieldChange} />
                </div>
              </div>
              {isSun && (
                <div>
                  <FL>腹回り (cm) ※日曜のみ</FL>
                  <DecimalInput fieldKey="腹回り" value={form.腹回り} placeholder="850→85.0" onChange={handleFieldChange} />
                </div>
              )}
            </Card>

            {/* 健康習慣 */}
            <Card bg={c.healthBg}>
              <ST color={c.yellow}>🌿 健康習慣</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div><FL>朝ストレッチ</FL><SimpleToggle fieldKey="朝ストレッチ" val={form.朝ストレッチ} onToggle={handleToggle} /></div>
                <div><FL>夜ストレッチ</FL><SimpleToggle fieldKey="夜ストレッチ" val={form.夜ストレッチ} onToggle={handleToggle} /></div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <FL>水2L</FL>
                <SimpleToggle fieldKey="水2L" val={form.水2L} onToggle={handleToggle} />
              </div>

              {/* タンパク質トラッカー */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <FL>🥩 タンパク質トラッカー</FL>
                  <button onClick={() => setShowProteinGoalEdit(v => !v)} style={{ fontSize: 11, color: c.accent, background: "none", border: `1px solid ${c.accent}`, borderRadius: 8, padding: "3px 8px", cursor: "pointer" }}>
                    目標: {proteinGoal}g ✏️
                  </button>
                </div>
                {showProteinGoalEdit && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input type="number" value={proteinGoalInput} onChange={e => setProteinGoalInput(e.target.value)}
                      placeholder={`現在 ${proteinGoal}g`}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.section, fontSize: 14, color: c.text, outline: "none" }} />
                    <button onClick={() => {
                      const v = Number(proteinGoalInput);
                      if (v > 0) setProteinGoal(v);
                      setShowProteinGoalEdit(false);
                      setProteinGoalInput("");
                    }}
                      style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: c.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>保存</button>
                  </div>
                )}

                <div style={{ background: proteinRemaining === 0 ? "#e8faf4" : "#fffbf0", borderRadius: 12, padding: "10px 14px", marginBottom: 10, border: `1px solid ${proteinRemaining === 0 ? c.green : c.yellow}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{totalProtein}g <span style={{ fontSize: 11, color: c.muted, fontWeight: 400 }}>/ 目標 {proteinGoal}g</span></span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: proteinRemaining === 0 ? c.green : c.yellow }}>
                      {proteinRemaining === 0 ? "✅ 達成！" : `あと ${proteinRemaining}g`}
                    </span>
                  </div>
                  <div style={{ background: c.border, borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${proteinProgress}%`, height: "100%", background: proteinRemaining === 0 ? c.green : c.yellow, borderRadius: 6, transition: "width 0.3s" }} />
                  </div>
                </div>

                {proteinEntries.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {proteinEntries.map((e, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${c.border}` }}>
                        <span style={{ fontSize: 12, color: c.muted, minWidth: 48 }}>{e.timing || "-"}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: c.accent, minWidth: 36 }}>{e.g}g</span>
                        <span style={{ fontSize: 12, color: c.muted, flex: 1 }}>{e.memo}</span>
                        <button onClick={() => setProteinEntries(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: c.red, fontSize: 14 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: c.section, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 11, color: c.muted, marginBottom: 8, fontWeight: 600 }}>+ タイミングを追加</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {TIMING_OPTIONS.map(t => (
                      <button key={t} onClick={() => setSelectedTiming(t)} style={{
                        padding: "5px 10px", borderRadius: 8,
                        border: `1px solid ${selectedTiming === t ? c.accent : c.border}`,
                        background: selectedTiming === t ? "#eff6ff" : c.card,
                        color: selectedTiming === t ? c.accent : c.muted,
                        fontSize: 12, cursor: "pointer", fontWeight: selectedTiming === t ? 700 : 400,
                      }}>{t}</button>
                    ))}
                  </div>
                  <ProteinInputRow key={proteinEntries.length} timing={selectedTiming}
                    onAdd={(entry) => { setProteinEntries(prev => [...prev, entry]); setSelectedTiming(""); }} />
                </div>
              </div>
            </Card>

            <button onClick={save} style={{ width: "100%", padding: "18px 0", borderRadius: 16, border: "none", cursor: "pointer", background: c.accent, color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: 1, boxShadow: "0 4px 14px rgba(59,126,248,0.3)", marginBottom: 8 }}>
              ✅ 今日のログを保存する
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: c.muted, marginBottom: 8 }}>
              保存するとSupabaseに記録・下書きがリセットされます
            </div>
          </div>
        )}

        {/* ===== 今週タブ ===== */}
        {tab === 1 && (
          <div>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: c.muted, marginBottom: 2 }}>連続全達成</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: c.green }}>{streak}<span style={{ fontSize: 14, fontWeight: 400 }}>日</span></div>
                </div>
                <div style={{ fontSize: 36 }}>🔥</div>
              </div>
            </Card>
            <Card>
              <ST>達成率</ST>
              {["発信","営業","筋トレ","水泳","食事","朝ストレッチ","夜ストレッチ","水2L"].map(key => {
                const r = rate(key);
                const col = r >= 80 ? c.green : r >= 50 ? c.yellow : c.red;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ width: 72, fontSize: 11, color: c.muted }}>{key}</div>
                    <div style={{ flex: 1, background: c.section, borderRadius: 8, height: 10, overflow: "hidden" }}>
                      <div style={{ width: `${r}%`, height: "100%", background: col, borderRadius: 8 }} />
                    </div>
                    <div style={{ width: 38, textAlign: "right", fontSize: 12, fontWeight: 700, color: col }}>{r}%</div>
                  </div>
                );
              })}
            </Card>
            <Card>
              <ST>直近のログ</ST>
              {data.length === 0 ? (
                <div style={{ textAlign: "center", color: c.muted, fontSize: 13, padding: "20px 0" }}>まだログがありません</div>
              ) : data.slice(-5).reverse().map((d, i) => (
                <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < 4 ? `1px solid ${c.border}` : "none" }}>
                  <div style={{ fontSize: 11, color: c.muted, marginBottom: 6, fontWeight: 600 }}>{d.date}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {["発信","営業","筋トレ","水泳","食事","朝ストレッチ","夜ストレッチ","水2L"].map(k => (
                      <span key={k} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 8, background: d[k] === "◎" ? "#e8faf4" : d[k] === "×" ? "#fdeaea" : c.section, color: d[k] === "◎" ? c.green : d[k] === "×" ? c.red : c.muted, fontWeight: 600 }}>
                        {k} {d[k] ?? "-"}
                      </span>
                    ))}
                    {d.体重 && <span style={{ fontSize: 10, padding: "3px 7px", borderRadius: 8, background: "#eff6ff", color: c.accent, fontWeight: 600 }}>{d.体重}kg</span>}
                    {d.タンパク質g && <span style={{ fontSize: 10, padding: "3px 7px", borderRadius: 8, background: "#fffbf0", color: c.yellow, fontWeight: 600 }}>🥩{d.タンパク質g}g</span>}
                  </div>
                  {["発信","営業","筋トレ","水泳","食事"].filter(k => d[k + "メモ"]).map(k => (
                    <div key={k} style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>💬 {k}：{d[k + "メモ"]}</div>
                  ))}
                </div>
              ))}
            </Card>
            <Card>
              <ST>曜日別スケジュール</ST>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {WEEKLY.map(w => {
                  const isToday = w.day === todayDay;
                  return (
                    <div key={w.day} style={{ background: isToday ? "#eff6ff" : c.section, borderRadius: 10, padding: "8px 4px", border: isToday ? `1.5px solid ${c.accent}` : `1px solid ${c.border}` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? c.accent : c.muted, textAlign: "center", marginBottom: 4 }}>{w.day}</div>
                      {w.items.map(t => (
                        <div key={t} style={{ fontSize: 9, color: "#64748b", textAlign: "center", marginBottom: 2, lineHeight: 1.4 }}>{t}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ===== グラフタブ ===== */}
        {tab === 2 && (
          <div>
            <Card>
              <ST>体重・体脂肪の推移</ST>
              {graphData.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={graphData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: c.muted }} />
                    <YAxis yAxisId="w" domain={['auto','auto']} tick={{ fontSize: 9, fill: c.muted }} />
                    <YAxis yAxisId="f" orientation="right" domain={['auto','auto']} tick={{ fontSize: 9, fill: c.muted }} />
                    <Tooltip contentStyle={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, fontSize: 12 }} />
                    <ReferenceLine yAxisId="w" y={weekGoal.weight} stroke={c.accent} strokeDasharray="4 4" />
                    <ReferenceLine yAxisId="f" y={weekGoal.fat} stroke={c.red} strokeDasharray="4 4" />
                    <Line yAxisId="w" type="monotone" dataKey="体重" stroke={c.accent} strokeWidth={2.5} dot={{ r: 4, fill: c.accent }} />
                    <Line yAxisId="f" type="monotone" dataKey="体脂肪" stroke={c.red} strokeWidth={2.5} dot={{ r: 4, fill: c.red }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", color: c.muted, fontSize: 13, padding: "40px 0" }}>
                  {data.length === 0 ? "まだデータがありません" : "データが2件以上になるとグラフが表示されます"}
                </div>
              )}
              <div style={{ display: "flex", gap: 14, marginTop: 10, justifyContent: "center" }}>
                <div style={{ fontSize: 11, color: c.accent }}>━ 体重　- - 今週目標</div>
                <div style={{ fontSize: 11, color: c.red }}>━ 体脂肪</div>
              </div>
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { label: "現在の体重", value: `${lw}kg`, sub: `今週目標 ${weekGoal.weight}kg`, color: c.accent },
                { label: "現在の体脂肪", value: `${lf}%`, sub: `今週目標 ${weekGoal.fat}%`, color: c.red },
                { label: "連続達成", value: `${streak}日`, sub: "全項目◎", color: c.green },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{ background: c.card, borderRadius: 14, padding: 14, border: `1px solid ${c.border}`, textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 10, color: c.muted, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: c.muted, marginTop: 3 }}>{sub}</div>
                </div>
              ))}
            </div>
            {data.length > 0 && (
              <Card>
                <ST>データ概要</ST>
                {[
                  { label: "記録日数", value: `${data.length}日` },
                  { label: "開始時の体重", value: `${START.weight}kg` },
                  { label: "現在の体重", value: `${lw}kg`, color: c.accent },
                  { label: "減量", value: typeof lw === "number" ? `${(START.weight - lw).toFixed(1)}kg減` : "-", color: c.green },
                ].map(({ label, value, color }, i, arr) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < arr.length - 1 ? `1px solid ${c.border}` : "none" }}>
                    <span style={{ color: c.muted }}>{label}</span>
                    <span style={{ fontWeight: 700, color: color || c.text }}>{value}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
