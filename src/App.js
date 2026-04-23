import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { supabase } from "./supabase";

const START = { weight: 78, fat: 20 };
const GOALS_3M = { weight: 75, fat: 17 };
const GOALS_6M = { weight: 73, fat: 15 };
const GOALS_1Y = { weight: 71, fat: 13 };
const START_DATE = new Date("2026-04-23");
const DAILY_PROTEIN_GOAL = 130;

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
  progress = Math.min(1, progress);
  return {
    weight: Math.round((START.weight - wDiff * progress) * 10) / 10,
    fat: Math.round((START.fat - fDiff * progress) * 10) / 10,
  };
}

function formatDecimalInput(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 3) {
    return digits.slice(0, -1) + "." + digits.slice(-1);
  }
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

const TABS = ["入力", "今週", "グラフ"];
const EMPTY_FORM = {
  提案数: "",
  発信: "", 発信メモ: "",
  営業: "", 営業メモ: "",
  筋トレ: "", 筋トレメモ: "",
  水泳: "", 水泳メモ: "",
  食事: "", 食事メモ: "",
  朝ストレッチ: "",
  夜ストレッチ: "",
  水2L: "",
  タンパク質g: "",
  体重: "", 体脂肪: "", 腹回り: "",
};

export default function App() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayDay = DAYS[new Date().getDay()];
  const isSun = new Date().getDay() === 0;
  const weekNum = getWeekNumber();
  const weekGoal = getWeeklyGoal(weekNum);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: rows, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: true });
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
      setError("データの読み込みに失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMemoChange = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleToggle = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: prev[key] === value ? "" : value }));
  }, []);

  const handleDecimalInput = useCallback((key, raw) => {
    setForm(prev => ({ ...prev, [key]: formatDecimalInput(raw) }));
  }, []);

  const handleNumberInput = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

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
      tanpaku_g: form.タンパク質g !== "" ? Number(form.タンパク質g) : null,
      taiju: form.体重 !== "" ? Number(form.体重) : null,
      taishibo: form.体脂肪 !== "" ? Number(form.体脂肪) : null,
      haramawari: form.腹回り !== "" ? Number(form.腹回り) : null,
    };
    try {
      const { error } = await supabase.from('logs').insert([row]);
      if (error) throw error;
      await loadData();
      setForm(EMPTY_FORM);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError("保存に失敗しました: " + e.message);
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
    const d = data[i];
    if (["発信","筋トレ","食事","営業"].every(k => d[k] === "◎")) streak++;
    else break;
  }

  const graphData = data.filter(d => d.体重 || d.体脂肪).map(d => ({ name: d.date, 体重: d.体重, 体脂肪: d.体脂肪 }));
  const todayProtein = Number(form.タンパク質g) || 0;
  const proteinRemaining = Math.max(0, DAILY_PROTEIN_GOAL - todayProtein);

  const c = {
    bg: "#f7f8fc", card: "#ffffff", border: "#e8eaf0",
    accent: "#3b7ef8", green: "#16a87e", red: "#e05555",
    yellow: "#e8a020", text: "#1a1d2e", muted: "#8892a4",
    section: "#f0f2f8", workBg: "#f0f5ff", bodyBg: "#f0fdf8", healthBg: "#fffbf0",
  };

  const SimpleToggle = ({ fieldKey }) => {
    const val = form[fieldKey];
    return (
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        {["◎", "×"].map(v => (
          <button key={v} onClick={() => handleToggle(fieldKey, v)} style={{
            flex: 1, padding: "13px 0", borderRadius: 12,
            border: `2px solid ${val === v ? (v === "◎" ? c.green : c.red) : c.border}`,
            cursor: "pointer", fontSize: 17, fontWeight: 700,
            background: val === v ? (v === "◎" ? "#e8faf4" : "#fdeaea") : c.card,
            color: val === v ? (v === "◎" ? c.green : c.red) : c.muted,
          }}>{v}</button>
        ))}
      </div>
    );
  };

  // メモ付きトグル：onBlurでstateを更新してフォーカスバグを回避
  const ToggleWithMemo = ({ fieldKey }) => {
    const val = form[fieldKey];
    const memoKey = `${fieldKey}メモ`;
    const localRef = useRef(form[memoKey]);

    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {["◎", "×"].map(v => (
            <button key={v} onClick={() => handleToggle(fieldKey, v)} style={{
              flex: 1, padding: "13px 0", borderRadius: 12,
              border: `2px solid ${val === v ? (v === "◎" ? c.green : c.red) : c.border}`,
              cursor: "pointer", fontSize: 17, fontWeight: 700,
              background: val === v ? (v === "◎" ? "#e8faf4" : "#fdeaea") : c.card,
              color: val === v ? (v === "◎" ? c.green : c.red) : c.muted,
            }}>{v}</button>
          ))}
        </div>
        <input
          type="text"
          defaultValue={localRef.current}
          onChange={e => { localRef.current = e.target.value; }}
          onBlur={e => handleMemoChange(memoKey, e.target.value)}
          placeholder="一言メモ（任意）"
          style={{ width: "100%", marginTop: 6, padding: "9px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.section, fontSize: 13, color: c.text, boxSizing: "border-box", outline: "none" }}
        />
      </div>
    );
  };

  const DecimalInput = ({ fieldKey, placeholder }) => (
    <input
      type="tel"
      inputMode="numeric"
      value={form[fieldKey]}
      onChange={e => handleDecimalInput(fieldKey, e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", background: c.section, border: `1px solid ${c.border}`, borderRadius: 12, padding: "13px 14px", color: c.text, fontSize: 16, boxSizing: "border-box", marginTop: 6, outline: "none" }}
    />
  );

  const NumberInput = ({ fieldKey, placeholder }) => (
    <input
      type="number"
      value={form[fieldKey]}
      onChange={e => handleNumberInput(fieldKey, e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", background: c.section, border: `1px solid ${c.border}`, borderRadius: 12, padding: "13px 14px", color: c.text, fontSize: 16, boxSizing: "border-box", marginTop: 6, outline: "none" }}
    />
  );

  const Card = ({ children, bg }) => (
    <div style={{ background: bg || c.card, borderRadius: 18, padding: 18, border: `1px solid ${c.border}`, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>{children}</div>
  );

  const SectionTitle = ({ children, color }) => (
    <div style={{ fontSize: 11, color: color || c.muted, fontWeight: 700, letterSpacing: 1.5, marginBottom: 14 }}>{children}</div>
  );

  const FieldLabel = ({ children }) => (
    <div style={{ fontSize: 12, color: c.muted, marginBottom: 2 }}>{children}</div>
  );

  if (loading) return (
    <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <div style={{ fontSize: 14, color: c.muted }}>データを読み込み中...</div>
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
        {TABS.map((t, i) => (
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

        {/* 入力タブ */}
        {tab === 0 && (
          <div>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 14, textAlign: "center", fontWeight: 600 }}>📅 {todayLabel()} のログ</div>
            {saved && (
              <div style={{ background: "#e8faf4", border: `1px solid ${c.green}`, borderRadius: 14, padding: 14, textAlign: "center", color: c.green, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                ✅ 保存しました！お疲れ様でした🎉
              </div>
            )}

            {/* 仕事 */}
            <Card bg={c.workBg}>
              <SectionTitle color={c.accent}>💼 仕事</SectionTitle>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>提案数（件）</FieldLabel>
                <NumberInput fieldKey="提案数" placeholder="0" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>発信</FieldLabel>
                <ToggleWithMemo fieldKey="発信" />
              </div>
              <div>
                <FieldLabel>営業</FieldLabel>
                <ToggleWithMemo fieldKey="営業" />
              </div>
            </Card>

            {/* ボディメイク */}
            <Card bg={c.bodyBg}>
              <SectionTitle color={c.green}>💪 ボディメイク</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {["筋トレ", "水泳"].map(key => (
                  <div key={key}>
                    <FieldLabel>{key}</FieldLabel>
                    <ToggleWithMemo fieldKey={key} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>食事</FieldLabel>
                <ToggleWithMemo fieldKey="食事" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: isSun ? 14 : 0 }}>
                <div>
                  <FieldLabel>体重 (kg) ※3桁→自動変換</FieldLabel>
                  <DecimalInput fieldKey="体重" placeholder="780→78.0" />
                </div>
                <div>
                  <FieldLabel>体脂肪 (%) ※3桁→自動変換</FieldLabel>
                  <DecimalInput fieldKey="体脂肪" placeholder="200→20.0" />
                </div>
              </div>
              {isSun && (
                <div>
                  <FieldLabel>腹回り (cm) ※日曜のみ・3桁→自動変換</FieldLabel>
                  <DecimalInput fieldKey="腹回り" placeholder="850→85.0" />
                </div>
              )}
            </Card>

            {/* 健康習慣 */}
            <Card bg={c.healthBg}>
              <SectionTitle color={c.yellow}>🌿 健康習慣</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <FieldLabel>朝ストレッチ</FieldLabel>
                  <SimpleToggle fieldKey="朝ストレッチ" />
                </div>
                <div>
                  <FieldLabel>夜ストレッチ</FieldLabel>
                  <SimpleToggle fieldKey="夜ストレッチ" />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>水2L</FieldLabel>
                <SimpleToggle fieldKey="水2L" />
              </div>
              <div>
                <FieldLabel>今日のタンパク質 (g) ／ 目標 {DAILY_PROTEIN_GOAL}g</FieldLabel>
                <NumberInput fieldKey="タンパク質g" placeholder="0" />
                {todayProtein > 0 && (
                  <div style={{ marginTop: 8, background: proteinRemaining === 0 ? "#e8faf4" : "#fffbf0", borderRadius: 10, padding: "10px 12px", border: `1px solid ${proteinRemaining === 0 ? c.green : c.yellow}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: c.muted }}>残り</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: proteinRemaining === 0 ? c.green : c.yellow }}>
                        {proteinRemaining === 0 ? "✅ 達成！" : `あと ${proteinRemaining}g`}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, background: c.border, borderRadius: 6, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, (todayProtein / DAILY_PROTEIN_GOAL) * 100)}%`, height: "100%", background: proteinRemaining === 0 ? c.green : c.yellow, borderRadius: 6, transition: "width 0.3s" }} />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <button onClick={save} style={{ width: "100%", padding: "18px 0", borderRadius: 16, border: "none", cursor: "pointer", background: c.accent, color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: 1, boxShadow: "0 4px 14px rgba(59,126,248,0.3)", marginBottom: 8 }}>
              ✅ 保存する
            </button>
            {data.length > 0 && <div style={{ textAlign: "center", fontSize: 11, color: c.muted, marginBottom: 8 }}>📦 {data.length}件のログが保存されています</div>}
          </div>
        )}

        {/* 今週タブ */}
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
              <SectionTitle>達成率</SectionTitle>
              {[
                { key: "発信", label: "発信" }, { key: "営業", label: "営業" },
                { key: "筋トレ", label: "筋トレ" }, { key: "水泳", label: "水泳" },
                { key: "食事", label: "食事" }, { key: "朝ストレッチ", label: "朝ストレッチ" },
                { key: "夜ストレッチ", label: "夜ストレッチ" }, { key: "水2L", label: "水2L" },
              ].map(({ key, label }) => {
                const r = rate(key);
                const col = r >= 80 ? c.green : r >= 50 ? c.yellow : c.red;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ width: 72, fontSize: 11, color: c.muted }}>{label}</div>
                    <div style={{ flex: 1, background: c.section, borderRadius: 8, height: 10, overflow: "hidden" }}>
                      <div style={{ width: `${r}%`, height: "100%", background: col, borderRadius: 8 }} />
                    </div>
                    <div style={{ width: 38, textAlign: "right", fontSize: 12, fontWeight: 700, color: col }}>{r}%</div>
                  </div>
                );
              })}
            </Card>
            <Card>
              <SectionTitle>直近のログ</SectionTitle>
              {data.length === 0 ? (
                <div style={{ textAlign: "center", color: c.muted, fontSize: 13, padding: "20px 0" }}>まだログがありません</div>
              ) : data.slice(-5).reverse().map((d, i) => (
                <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < Math.min(data.length, 5) - 1 ? `1px solid ${c.border}` : "none" }}>
                  <div style={{ fontSize: 11, color: c.muted, marginBottom: 6, fontWeight: 600 }}>{d.date}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {["発信","営業","筋トレ","水泳","食事","朝ストレッチ","夜ストレッチ","水2L"].map(k => (
                      <span key={k} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 8, background: d[k] === "◎" ? "#e8faf4" : d[k] === "×" ? "#fdeaea" : c.section, color: d[k] === "◎" ? c.green : d[k] === "×" ? c.red : c.muted, fontWeight: 600 }}>
                        {k} {d[k] ?? "-"}
                      </span>
                    ))}
                    {d.体重 && <span style={{ fontSize: 10, padding: "3px 7px", borderRadius: 8, background: "#eff6ff", color: c.accent, fontWeight: 600 }}>{d.体重}kg</span>}
                    {d.体脂肪 && <span style={{ fontSize: 10, padding: "3px 7px", borderRadius: 8, background: "#fff0f0", color: c.red, fontWeight: 600 }}>{d.体脂肪}%</span>}
                    {d.タンパク質g && <span style={{ fontSize: 10, padding: "3px 7px", borderRadius: 8, background: "#fffbf0", color: c.yellow, fontWeight: 600 }}>🥩{d.タンパク質g}g</span>}
                  </div>
                  {["発信","営業","筋トレ","水泳","食事"].filter(k => d[`${k}メモ`]).map(k => (
                    <div key={k} style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>💬 {k}：{d[`${k}メモ`]}</div>
                  ))}
                </div>
              ))}
            </Card>
            <Card>
              <SectionTitle>曜日別スケジュール</SectionTitle>
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

        {/* グラフタブ */}
        {tab === 2 && (
          <div>
            <Card>
              <SectionTitle>体重・体脂肪の推移</SectionTitle>
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
                <SectionTitle>データ概要</SectionTitle>
                <div style={{ fontSize: 13 }}>
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
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
