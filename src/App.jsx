import { useState, useEffect, useRef, useCallback } from "react";

// === STORAGE (localStorage) ===
function loadSets() {
  try { return JSON.parse(localStorage.getItem("ml_sets") || "[]"); }
  catch { return []; }
}
function saveSets(sets) {
  localStorage.setItem("ml_sets", JSON.stringify(sets));
}

// === AI MNEMONIC GENERATION ===
async function generateMnemonics(title, terms) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("VITE_ANTHROPIC_API_KEY 환경변수가 없습니다. .env.local 파일을 확인하세요.");
    return null;
  }
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-allow-browser": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `암기 세트 "${title}"의 항목들:\n${terms.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n위 항목들을 쉽게 외울 수 있는 3가지 암기법을 만들어주세요.\n반드시 JSON만 응답 (마크다운 코드블록 없이):\n{"chunks":[{"label":"카테고리명","items":["항목"]}],"acronym":"두문자/앞글자를 이용한 암기법 설명","story":"모든 항목이 자연스럽게 포함된 짧은 스토리 (3-4문장)"}`,
        }],
      }),
    });
    const data = await resp.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    return JSON.parse(text.replace(/```[a-z]*\n?|```/g, "").trim());
  } catch (e) {
    console.error("Mnemonic gen:", e);
    return null;
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

// === GLOBAL STYLES ===
const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0d0c15;
    --surf: #181626;
    --card: #1f1d30;
    --bdr: #2c2a42;
    --acc: #f5c842;
    --acc-d: rgba(245,200,66,.1);
    --acc-b: rgba(245,200,66,.25);
    --ok: #5ce89e;
    --ok-d: rgba(92,232,158,.1);
    --ok-b: rgba(92,232,158,.22);
    --err: #ff6b6b;
    --err-d: rgba(255,107,107,.1);
    --err-b: rgba(255,107,107,.22);
    --t1: #f0eeff;
    --t2: #8a87a0;
    --t3: #45435a;
    --r: 14px;
    --rs: 9px;
  }
  html, body {
    background: var(--bg);
    color: var(--t1);
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--bdr); border-radius: 2px; }
  input, textarea { outline: none; }
  input:focus, textarea:focus { border-color: var(--acc) !important; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(9px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes flashPop {
    0%   { opacity: 0; transform: scale(.88); }
    12%  { opacity: 1; transform: scale(1.02); }
    20%  { transform: scale(1); }
    80%  { opacity: 1; }
    100% { opacity: .5; transform: scale(.97); }
  }
  .fu { animation: fadeUp .24s ease; }
  .fp { animation: flashPop 1s ease forwards; }
`;

// === SHARED STYLE OBJECTS ===
const btnP = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "10px 20px", borderRadius: "var(--rs)", border: "none", cursor: "pointer",
  fontFamily: "inherit", fontSize: 14, fontWeight: 600,
  background: "var(--acc)", color: "#0d0c15",
  transition: "opacity .15s, transform .15s", whiteSpace: "nowrap",
};
const btnG = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "10px 16px", borderRadius: "var(--rs)", border: "1.5px solid var(--bdr)",
  cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500,
  background: "transparent", color: "var(--t2)",
  transition: "all .15s", whiteSpace: "nowrap",
};
const inp = {
  width: "100%", padding: "11px 13px",
  background: "var(--card)", border: "1.5px solid var(--bdr)",
  borderRadius: "var(--rs)", color: "var(--t1)",
  fontFamily: "inherit", fontSize: 14,
};
const cardS = { background: "var(--card)", border: "1.5px solid var(--bdr)", borderRadius: "var(--r)", padding: 16 };

// === TINY COMPONENTS ===
const Tag = ({ children }) => (
  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, background: "var(--acc-d)", color: "var(--acc)", border: "1px solid var(--acc-b)" }}>
    {children}
  </span>
);
const Label = ({ children }) => (
  <div style={{ fontSize: 11, color: "var(--t2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
    {children}
  </div>
);
const Field = ({ label, children, mb = 18 }) => (
  <div style={{ marginBottom: mb }}>
    <Label>{label}</Label>
    {children}
  </div>
);
const ProgBar = ({ pct, color = "var(--acc)" }) => (
  <div style={{ height: 3, background: "var(--bdr)", borderRadius: 2 }}>
    <div style={{ height: "100%", background: color, borderRadius: 2, width: `${pct}%`, transition: "width .25s" }} />
  </div>
);

// ============================================================
// HOME SCREEN
// ============================================================
function HomeScreen({ sets, onOpen, onCreate, onConvert }) {
  return (
    <div className="fu">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--t1)" }}>MemoryLab</h1>
          <p style={{ fontSize: 13, color: "var(--t2)", marginTop: 4 }}>리콜 + 플래시카드 암기 앱</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnG} onClick={onConvert}>📋 변환기</button>
          <button style={btnP} onClick={onCreate}>+ 새 세트</button>
        </div>
      </div>
      {sets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--t3)" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📚</div>
          <p style={{ fontSize: 15, color: "var(--t2)" }}>아직 세트가 없어요</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>새 세트를 만들어 암기를 시작하세요</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sets.map((s) => <SetCard key={s.id} set={s} onClick={() => onOpen(s)} />)}
        </div>
      )}
    </div>
  );
}

function SetCard({ set, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? "var(--surf)" : "var(--card)", border: `1.5px solid ${hov ? "var(--acc-b)" : "var(--bdr)"}`, borderRadius: "var(--r)", padding: 16, cursor: "pointer", textAlign: "left", color: "var(--t1)", fontFamily: "inherit", width: "100%", transition: "all .15s", transform: hov ? "translateY(-2px)" : "none" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>{set.title}</div>
          <div style={{ fontSize: 12, color: "var(--t2)" }}>{set.items.length}개 항목 · {set.type === "recall" ? "리콜" : "플래시카드"}</div>
        </div>
        <span style={{ fontSize: 22 }}>{set.type === "recall" ? "📝" : "🃏"}</span>
      </div>
    </button>
  );
}

// ============================================================
// CONVERTER SCREEN (Flashcard Maker Skill)
// ============================================================
async function convertTextToItems(rawText, type) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const typeDesc = type === "recall"
    ? "리콜(Recall) 타입: 쉼표(,)로 단어/개념을 이어서 나열. 문단이나 마침표 단위로 카드를 나누되 한 카드 안의 항목은 쉼표로 연결."
    : "플래시카드(Flashcard) 타입: `단어 - 정의` 형식으로 한 줄에 하나씩. 단어 자체에 하이픈(-)이 포함된 경우 언더스코어(_)로 변환.";

  const systemPrompt = `OCR 텍스트를 암기 앱 형식으로 변환하는 전문가다.

## 출력 형식
${typeDesc}

## OCR 오류 교정 원칙
- 받침 탈락/추가, 모음 오인식(ㅗ↔ㅜ, ㅓ↔ㅏ), 자음 오인식(ㄹ↔ㄴ, ㅂ↔ㅍ) 교정
- 숫자↔글자 혼동(0↔ㅇ, 1↔ㅣ) 교정
- 약품명, 의학용어, 화학명 등 전문용어 특히 주의
- 교정한 단어는 [교정 목록]에 명시

## 반드시 JSON으로만 응답 (마크다운 코드블록 없이):
${type === "recall"
  ? `{"items":[{"term":"단어1, 단어2, 단어3"},{"term":"단어4, 단어5"}],"corrections":[{"from":"원문","to":"교정"}]}`
  : `{"items":[{"term":"단어","definition":"정의 설명"}],"corrections":[{"from":"원문","to":"교정"}]}`
}

corrections 배열은 교정 없으면 빈 배열로.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-allow-browser": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: rawText }],
      }),
    });
    const data = await resp.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    return JSON.parse(text.replace(/```[a-z]*\n?|```/g, "").trim());
  } catch (e) {
    console.error("Convert error:", e);
    return null;
  }
}

function ConverterScreen({ onImport, onBack }) {
  const [rawText, setRawText] = useState("");
  const [type, setType] = useState("recall");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const convert = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    const res = await convertTextToItems(rawText, type);
    if (!res) {
      setError("변환 실패. API 키를 확인해주세요.");
    } else {
      setResult(res);
    }
    setLoading(false);
  };

  const doImport = () => {
    if (!result?.items?.length) return;
    onImport(result.items.map((it) => ({ id: uid(), term: it.term, definition: it.definition || "" })), type);
  };

  return (
    <div className="fu">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button style={btnG} onClick={onBack}>← 뒤로</button>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>📋 텍스트 변환기</h2>
      </div>

      <div style={{ background: "var(--acc-d)", border: "1.5px solid var(--acc-b)", borderRadius: "var(--rs)", padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "var(--t2)", lineHeight: 1.8 }}>
        OCR로 찍은 텍스트, 교재 내용 등을 붙여넣으면<br />
        <strong style={{ color: "var(--acc)" }}>AI가 자동으로 암기 세트 형식</strong>으로 변환해드려요.
      </div>

      <Field label="변환 타입">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
          {[["recall", "📝", "리콜", "단어 목록만"],["flashcard", "🃏", "플래시카드", "단어 + 정의"]].map(([v, icon, name, desc]) => (
            <button key={v} onClick={() => { setType(v); setResult(null); }} style={{ padding: 12, borderRadius: "var(--rs)", border: `2px solid ${type === v ? "var(--acc)" : "var(--bdr)"}`, background: type === v ? "var(--acc-d)" : "var(--card)", color: type === v ? "var(--acc)" : "var(--t2)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s" }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>{name}</span>
              <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>— {desc}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="원본 텍스트 붙여넣기">
        <textarea style={{ ...inp, resize: "vertical", minHeight: 160, lineHeight: 1.8, display: "block" }}
          placeholder={"OCR 텍스트, 교재 내용, 메모 등을 자유롭게 붙여넣으세요.\n\n예:\n수은 - 중금속, 신경 독성\n납 - 중금속, 혈액 독성\n포름알데히드 - 발암물질"}
          value={rawText} onChange={(e) => { setRawText(e.target.value); setResult(null); }} />
      </Field>

      <button onClick={convert} disabled={!rawText.trim() || loading}
        style={{ ...btnP, width: "100%", padding: 13, fontSize: 15, marginBottom: 16, opacity: (!rawText.trim() || loading) ? 0.4 : 1 }}>
        {loading ? "🤖 AI 변환 중..." : "변환하기"}
      </button>

      {error && <div style={{ padding: "12px 14px", background: "var(--err-d)", border: "1.5px solid var(--err-b)", borderRadius: "var(--rs)", color: "var(--err)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {result && (
        <div className="fu">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Label>변환 결과 ({result.items.length}개)</Label>
            {result.corrections?.length > 0 && (
              <span style={{ fontSize: 12, color: "var(--acc)" }}>교정 {result.corrections.length}건</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14, maxHeight: 240, overflowY: "auto" }}>
            {result.items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "var(--surf)", borderRadius: "var(--rs)", padding: "9px 12px", border: "1.5px solid var(--bdr)" }}>
                <span style={{ fontSize: 11, color: "var(--t3)", minWidth: 18, fontWeight: 700, paddingTop: 2 }}>{i + 1}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{item.term}</span>
                {item.definition && <span style={{ fontSize: 12, color: "var(--t2)", maxWidth: "45%", textAlign: "right" }}>{item.definition}</span>}
              </div>
            ))}
          </div>

          {result.corrections?.length > 0 && (
            <div style={{ background: "var(--acc-d)", border: "1.5px solid var(--acc-b)", borderRadius: "var(--rs)", padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--acc)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>교정 목록</div>
              {result.corrections.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.9 }}>
                  <span style={{ color: "var(--err)" }}>{c.from}</span> → <span style={{ color: "var(--ok)" }}>{c.to}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={doImport} style={{ ...btnP, width: "100%", padding: 13, fontSize: 15 }}>
            이 항목들로 세트 만들기 →
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CREATE SCREEN
// ============================================================
function CreateScreen({ onSave, onBack, prefill }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(prefill?.type || "recall");
  const [method, setMethod] = useState("direct");
  const [items, setItems] = useState(prefill?.items || []);
  const [term, setTerm] = useState("");
  const [def, setDef] = useState("");
  const [paste, setPaste] = useState("");
  const [loading, setLoading] = useState(false);
  const termRef = useRef();

  const addItem = () => {
    if (!term.trim()) return;
    setItems((p) => [...p, { id: uid(), term: term.trim(), definition: def.trim() }]);
    setTerm("");
    setDef("");
    termRef.current?.focus();
  };
  const addPaste = () => {
    if (type === "flashcard") {
      const lines = paste.split(/\n/).map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return;
      const newItems = lines.map((line) => {
        const dashIdx = line.indexOf("-");
        if (dashIdx !== -1) return { id: uid(), term: line.slice(0, dashIdx).trim(), definition: line.slice(dashIdx + 1).trim() };
        return { id: uid(), term: line, definition: "" };
      });
      setItems((p) => [...p, ...newItems]);
    } else {
      const terms = paste.split(/[,.\n]/).map((s) => s.trim()).filter(Boolean);
      if (!terms.length) return;
      setItems((p) => [...p, ...terms.map((t) => ({ id: uid(), term: t, definition: "" }))]);
    }
    setPaste("");
  };
  const save = async () => {
    if (!title.trim() || !items.length) return;
    setLoading(true);
    const mnemonics = await generateMnemonics(title, items.map((i) => i.term));
    onSave({ id: uid(), title: title.trim(), type, items, mnemonics, createdAt: Date.now() });
  };

  return (
    <div className="fu">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button style={btnG} onClick={onBack}>← 뒤로</button>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>새 세트 만들기</h2>
      </div>

      <Field label="세트 제목">
        <input style={inp} placeholder="예: 화장품 사용 금지 원료 25가지" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field label="학습 방식">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[["recall", "📝", "리콜", "단어만 암기"], ["flashcard", "🃏", "플래시카드", "단어 + 뜻"]].map(([v, icon, name, desc]) => (
            <button key={v} onClick={() => setType(v)} style={{ padding: 14, borderRadius: "var(--rs)", border: `2px solid ${type === v ? "var(--acc)" : "var(--bdr)"}`, background: type === v ? "var(--acc-d)" : "var(--card)", color: type === v ? "var(--acc)" : "var(--t2)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{desc}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="입력 방식" mb={16}>
        <div style={{ display: "flex", gap: 6 }}>
          {[["direct", "직접 입력"], ["paste", "붙여넣기"], ["ocr", "📷 OCR"]].map(([v, label]) => (
            <button key={v} onClick={() => setMethod(v)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${method === v ? "var(--acc)" : "var(--bdr)"}`, background: method === v ? "var(--acc-d)" : "transparent", color: method === v ? "var(--acc)" : "var(--t2)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, transition: "all .15s" }}>
              {label}
            </button>
          ))}
        </div>
      </Field>

      {method === "direct" && (
        <div style={{ marginBottom: 16 }}>
          <input ref={termRef} style={{ ...inp, marginBottom: 8 }} placeholder={type === "flashcard" ? "단어/용어" : "단어 (Enter로 추가)"} value={term} onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { type === "recall" ? addItem() : document.getElementById("ml-def")?.focus(); } }} />
          {type === "flashcard" && (
            <input id="ml-def" style={{ ...inp, marginBottom: 8 }} placeholder="정의/뜻 (Enter로 추가)" value={def} onChange={(e) => setDef(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addItem(); }} />
          )}
          <button style={{ ...btnG, width: "100%" }} onClick={addItem}>+ 항목 추가</button>
        </div>
      )}

      {method === "paste" && (
        <div style={{ marginBottom: 16 }}>
          <textarea style={{ ...inp, resize: "vertical", minHeight: 100, lineHeight: 1.7, display: "block", marginBottom: 8 }}
            placeholder={type === "flashcard"
              ? "단어-정의 형식으로 입력 (줄바꿈으로 구분)\n예:\n수은-독성 중금속\n납-중금속\n비소-독성 원소"
              : "쉼표, 마침표, 줄바꿈으로 구분\n예: 수은, 납. 비소\n크롬, 포름알데히드"}
            value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button style={{ ...btnG, width: "100%" }} onClick={addPaste}>항목으로 추가하기</button>
        </div>
      )}

      {method === "ocr" && (
        <div style={{ marginBottom: 16, background: "var(--card)", border: "2px dashed var(--bdr)", borderRadius: "var(--r)", padding: 36, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
          <p style={{ color: "var(--t2)", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>사진 촬영 / 업로드로<br />자동으로 텍스트 인식</p>
          <button style={{ ...btnG, opacity: 0.4, cursor: "not-allowed" }}>준비 중...</button>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Label>추가된 항목 {items.length}개</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", borderRadius: "var(--rs)", padding: "9px 12px", border: "1.5px solid var(--bdr)" }}>
                <span style={{ fontSize: 11, color: "var(--t3)", minWidth: 20, fontWeight: 700 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14 }}>{item.term}</span>
                {item.definition && <span style={{ fontSize: 13, color: "var(--t2)" }}>— {item.definition}</span>}
                <button onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))} style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={save} disabled={!title.trim() || !items.length || loading}
        style={{ ...btnP, width: "100%", padding: 14, fontSize: 15, opacity: (!title.trim() || !items.length || loading) ? 0.4 : 1 }}>
        {loading ? "🤖 AI 암기법 생성 중..." : `저장 & 암기법 생성 (${items.length}개 항목)`}
      </button>
    </div>
  );
}

// ============================================================
// DETAIL SCREEN
// ============================================================
function DetailScreen({ set, onBack, onDelete, onStartRecall, onStartFlash }) {
  const [showM, setShowM] = useState(false);
  const [chunkIdx, setChunkIdx] = useState(null);
  const m = set.mnemonics;

  return (
    <div className="fu">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24 }}>
        <button style={btnG} onClick={onBack}>← 뒤로</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>{set.title}</h2>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Tag>{set.type === "recall" ? "리콜" : "플래시카드"}</Tag>
            <Tag>{set.items.length}개</Tag>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button style={{ ...btnP, padding: 14 }} onClick={onStartRecall}>📝 리콜 시작</button>
        <button style={{ ...btnG, padding: 14 }} onClick={onStartFlash}>🃏 플래시카드</button>
      </div>

      {m && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setShowM((s) => !s)} style={{ width: "100%", padding: "12px 16px", background: "var(--acc-d)", border: "1.5px solid var(--acc-b)", borderRadius: "var(--rs)", color: "var(--acc)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>💡 AI 암기법 보기</span>
            <span style={{ fontSize: 11 }}>{showM ? "▲" : "▼"}</span>
          </button>
          {showM && (
            <div className="fu" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {m.chunks?.length > 0 && (
                <div style={cardS}>
                  <Label>🗂 청킹 (그룹별 분류)</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: chunkIdx !== null ? 10 : 0 }}>
                    {m.chunks.map((c, i) => (
                      <button key={i} onClick={() => setChunkIdx(chunkIdx === i ? null : i)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${chunkIdx === i ? "var(--acc)" : "var(--bdr)"}`, background: chunkIdx === i ? "var(--acc-d)" : "transparent", color: chunkIdx === i ? "var(--acc)" : "var(--t2)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, transition: "all .15s" }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {chunkIdx !== null && m.chunks[chunkIdx] && (
                    <div className="fu" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {m.chunks[chunkIdx].items.map((it, j) => (
                        <span key={j} style={{ padding: "4px 10px", background: "var(--surf)", border: "1px solid var(--bdr)", borderRadius: 20, fontSize: 13 }}>{it}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {m.acronym && (
                <div style={cardS}>
                  <Label>🔤 두문자어</Label>
                  <p style={{ fontSize: 14, lineHeight: 1.9, color: "var(--t2)" }}>{m.acronym}</p>
                </div>
              )}
              {m.story && (
                <div style={cardS}>
                  <Label>📖 스토리</Label>
                  <p style={{ fontSize: 14, lineHeight: 1.9, color: "var(--t2)" }}>{m.story}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Label>항목 목록</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
        {set.items.map((item, i) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surf)", borderRadius: "var(--rs)", padding: "10px 14px", border: "1.5px solid var(--bdr)" }}>
            <span style={{ fontSize: 11, color: "var(--t3)", minWidth: 18, fontWeight: 700 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 14 }}>{item.term}</span>
            {item.definition && <span style={{ fontSize: 13, color: "var(--t2)" }}>{item.definition}</span>}
          </div>
        ))}
      </div>

      <button onClick={() => onDelete(set.id)} style={{ width: "100%", padding: 12, background: "var(--err-d)", border: "1.5px solid var(--err-b)", borderRadius: "var(--rs)", color: "var(--err)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500 }}>
        세트 삭제
      </button>
    </div>
  );
}

// ============================================================
// RECALL SCREEN
// ============================================================
function RecallScreen({ set, onBack }) {
  const [phase, setPhase] = useState("ready");
  const [flashItems, setFlashItems] = useState([]);
  const [flashIdx, setFlashIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [results, setResults] = useState([]);
  const [round, setRound] = useState(1);
  const timer = useRef();

  const startFlash = useCallback((items) => {
    setFlashItems(items);
    setFlashIdx(0);
    setPhase("flash");
  }, []);

  useEffect(() => {
    if (phase !== "flash") return;
    if (flashIdx >= flashItems.length) { setPhase("write"); setUserInput(""); return; }
    timer.current = setTimeout(() => setFlashIdx((i) => i + 1), 1000);
    return () => clearTimeout(timer.current);
  }, [phase, flashIdx, flashItems]);

  const submit = () => {
    const answers = userInput.split("\n").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const res = set.items.map((item) => ({
      term: item.term,
      correct: answers.includes(item.term.trim().toLowerCase()),
    }));
    setResults(res);
    setPhase("result");
  };

  const retry = () => {
    const wrong = set.items.filter((item) => results.find((r) => r.term === item.term && !r.correct));
    setRound((r) => r + 1);
    startFlash(wrong);
  };

  const correct = results.filter((r) => r.correct).length;
  const wrong = results.length - correct;
  const typedCount = userInput.split("\n").filter((s) => s.trim()).length;

  // ── READY ──
  if (phase === "ready") return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", minHeight: "85vh" }}>
      <button style={{ ...btnG, alignSelf: "flex-start", marginBottom: 32 }} onClick={onBack}>← 뒤로</button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}>
        <div style={{ fontSize: 52 }}>⚡</div>
        <h3 style={{ fontSize: 22, fontWeight: 700 }}>{set.title}</h3>
        <p style={{ color: "var(--t2)", fontSize: 14, lineHeight: 1.9, maxWidth: 280 }}>
          {set.items.length}개의 단어를 각&nbsp;
          <strong style={{ color: "var(--acc)" }}>1초</strong>씩 보여드려요.<br />
          모두 보고 나면 기억나는 단어를 모두 적어주세요.
        </p>
        <div style={{ background: "var(--card)", borderRadius: "var(--r)", padding: "14px 24px", border: "1.5px solid var(--bdr)", fontSize: 13, color: "var(--t2)", lineHeight: 2 }}>
          ✦ 한 줄에 하나씩 입력하세요<br />✦ 순서는 상관없어요
        </div>
        <button style={{ ...btnP, padding: "14px 48px", fontSize: 16, marginTop: 8 }} onClick={() => startFlash(set.items)}>시작하기</button>
      </div>
    </div>
  );

  // ── FLASH ──
  if (phase === "flash") {
    const item = flashItems[flashIdx];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "85vh" }}>
        <div style={{ width: "100%", marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--t2)", marginBottom: 8 }}>
            <span>라운드 {round}</span>
            <span>{Math.min(flashIdx + 1, flashItems.length)} / {flashItems.length}</span>
          </div>
          <ProgBar pct={(flashIdx / flashItems.length) * 100} />
        </div>
        {item && (
          <div key={flashIdx} className="fp" style={{ background: "var(--card)", border: "2px solid var(--acc)", borderRadius: "var(--r)", padding: "48px 56px", textAlign: "center", minWidth: 220, boxShadow: "0 0 56px rgba(245,200,66,.12)" }}>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{item.term}</div>
            {item.definition && <div style={{ fontSize: 15, color: "var(--t2)", marginTop: 10 }}>{item.definition}</div>}
          </div>
        )}
        <p style={{ marginTop: 36, color: "var(--t3)", fontSize: 13 }}>집중해서 보세요...</p>
      </div>
    );
  }

  // ── WRITE ──
  if (phase === "write") return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", minHeight: "85vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>✍️ 기억나는 단어를 모두 적어보세요</h2>
        <Tag>라운드 {round}</Tag>
      </div>
      <div style={{ background: "var(--card)", borderRadius: "var(--rs)", padding: "10px 14px", marginBottom: 14, border: "1.5px solid var(--bdr)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--t2)" }}>총 <strong style={{ color: "var(--t1)" }}>{set.items.length}개</strong> — 한 줄에 하나씩</span>
        <span style={{ fontSize: 13, color: typedCount >= set.items.length ? "var(--ok)" : "var(--t2)" }}>{typedCount} / {set.items.length}</span>
      </div>
      <textarea style={{ ...inp, resize: "none", lineHeight: 2, fontSize: 15, flex: 1, marginBottom: 14, minHeight: 240 }}
        placeholder={"기억나는 단어를 한 줄에 하나씩 적어보세요\n\n예:\n수은\n납\n비소\n..."}
        value={userInput} onChange={(e) => setUserInput(e.target.value)} autoFocus />
      <button onClick={submit} disabled={!userInput.trim()} style={{ ...btnP, width: "100%", padding: 14, fontSize: 15, opacity: !userInput.trim() ? 0.4 : 1 }}>
        제출하기
      </button>
    </div>
  );

  // ── RESULT ──
  if (phase === "result") {
    const complete = wrong === 0;
    return (
      <div className="fu">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <button style={btnG} onClick={onBack}>← 뒤로</button>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>결과{round > 1 ? ` (라운드 ${round})` : ""}</h2>
        </div>
        <div style={{ textAlign: "center", padding: "28px 20px", background: "var(--surf)", borderRadius: "var(--r)", border: "1.5px solid var(--bdr)", marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>{complete ? "🎉" : "💪"}</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: complete ? "var(--ok)" : "var(--acc)", letterSpacing: "-0.02em" }}>{correct} / {set.items.length}</div>
          <div style={{ color: "var(--t2)", fontSize: 14, marginTop: 8 }}>{complete ? "완벽해요! 모두 맞혔어요 🎊" : `${wrong}개를 다시 확인해봐요`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {results.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: r.correct ? "var(--ok-d)" : "var(--err-d)", border: `1.5px solid ${r.correct ? "var(--ok-b)" : "var(--err-b)"}`, borderRadius: "var(--rs)", padding: "10px 14px" }}>
              <span style={{ color: r.correct ? "var(--ok)" : "var(--err)", fontSize: 16, fontWeight: 700, minWidth: 18 }}>{r.correct ? "✓" : "✗"}</span>
              <span style={{ fontSize: 14, flex: 1 }}>{r.term}</span>
            </div>
          ))}
        </div>
        {complete ? (
          <button onClick={onBack} style={{ ...btnP, width: "100%", padding: 14, fontSize: 15 }}>완료! 돌아가기</button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={retry} style={{ ...btnP, width: "100%", padding: 14, fontSize: 15 }}>⚡ 틀린 {wrong}개 다시 보기 → 재도전</button>
            <button onClick={onBack} style={{ ...btnG, width: "100%", padding: 14, fontSize: 15 }}>그만하기</button>
          </div>
        )}
      </div>
    );
  }
}

// ============================================================
// FLASHCARD SCREEN
// ============================================================
function FlashcardScreen({ set, onBack }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [done, setDone] = useState(false);
  const item = set.items[idx];
  const total = set.items.length;

  const go = (next) => {
    setFlipped(false);
    setTimeout(() => {
      if (next && idx < total - 1) setIdx((i) => i + 1);
      else if (next && idx === total - 1) setDone(true);
      else if (!next && idx > 0) setIdx((i) => i - 1);
    }, 180);
  };
  const markKnown = () => { setKnown((k) => new Set([...k, item.id])); go(true); };
  const markUnknown = () => { setKnown((k) => { const n = new Set(k); n.delete(item.id); return n; }); go(true); };

  if (done) return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "85vh", textAlign: "center", gap: 16 }}>
      <div style={{ fontSize: 52 }}>🎉</div>
      <h3 style={{ fontSize: 22, fontWeight: 700 }}>완료!</h3>
      <div style={{ fontSize: 44, fontWeight: 800, color: "var(--acc)" }}>{known.size} / {total}</div>
      <p style={{ color: "var(--t2)", fontSize: 14 }}>알고 있는 카드</p>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={btnG} onClick={() => { setIdx(0); setFlipped(false); setDone(false); setKnown(new Set()); }}>다시 하기</button>
        <button style={btnP} onClick={onBack}>완료</button>
      </div>
    </div>
  );

  return (
    <div className="fu">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button style={btnG} onClick={onBack}>← 뒤로</button>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>🃏 플래시카드</h2>
        <span style={{ marginLeft: "auto" }}><Tag>{idx + 1} / {total}</Tag></span>
      </div>
      <div style={{ marginBottom: 24 }}>
        <ProgBar pct={((idx + 1) / total) * 100} />
      </div>

      {/* Flip Card */}
      <div style={{ perspective: 1000, cursor: "pointer", height: 240, marginBottom: 20 }} onClick={() => setFlipped((f) => !f)}>
        <div style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", transition: "transform .42s cubic-bezier(.4,0,.2,1)", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", background: "var(--card)", border: "2px solid var(--bdr)", borderRadius: "var(--r)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>단어</div>
            <div style={{ fontSize: 28, fontWeight: 700, textAlign: "center" }}>{item.term}</div>
            <div style={{ marginTop: 20, fontSize: 12, color: "var(--t3)" }}>탭해서 뒤집기 ↓</div>
          </div>
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "var(--surf)", border: "2px solid var(--acc)", borderRadius: "var(--r)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, boxShadow: "0 0 32px rgba(245,200,66,.07)" }}>
            <div style={{ fontSize: 11, color: "var(--acc)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>정의</div>
            <div style={{ fontSize: 20, textAlign: "center", lineHeight: 1.7 }}>{item.definition || <span style={{ color: "var(--t3)" }}>정의 없음</span>}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
        <button onClick={() => go(false)} disabled={idx === 0} style={{ ...btnG, opacity: idx === 0 ? 0.3 : 1 }}>← 이전</button>
        <button onClick={() => go(true)} style={btnG}>다음 →</button>
      </div>

      {flipped && (
        <div className="fu" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={markUnknown} style={{ padding: 12, borderRadius: "var(--rs)", border: "1.5px solid var(--err-b)", background: "var(--err-d)", color: "var(--err)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}>✗ 모르겠어</button>
          <button onClick={markKnown} style={{ padding: 12, borderRadius: "var(--rs)", border: "1.5px solid var(--ok-b)", background: "var(--ok-d)", color: "var(--ok)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}>✓ 알아요</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [sets, setSets] = useState(loadSets);
  const [screen, setScreen] = useState("home");
  const [current, setCurrent] = useState(null);
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => { saveSets(sets); }, [sets]);

  const goHome = () => setScreen("home");
  const openSet = (s) => { setCurrent(s); setScreen("detail"); };
  const addSet = (s) => { setSets((p) => [s, ...p]); setCurrent(s); setScreen("detail"); };
  const deleteSet = (id) => { setSets((p) => p.filter((s) => s.id !== id)); goHome(); };
  const handleConverterImport = (items, type) => {
    setPrefill({ items, type });
    setScreen("create");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", padding: "28px 18px 64px" }}>
      {screen === "home" && <HomeScreen sets={sets} onOpen={openSet} onCreate={() => { setPrefill(null); setScreen("create"); }} onConvert={() => setScreen("converter")} />}
      {screen === "converter" && <ConverterScreen onImport={handleConverterImport} onBack={goHome} />}
      {screen === "create" && <CreateScreen prefill={prefill} onSave={addSet} onBack={goHome} />}
      {screen === "detail" && current && (
        <DetailScreen set={current} onBack={goHome} onDelete={deleteSet}
          onStartRecall={() => setScreen("recall")} onStartFlash={() => setScreen("flashcard")} />
      )}
      {screen === "recall" && current && <RecallScreen set={current} onBack={() => setScreen("detail")} />}
      {screen === "flashcard" && current && <FlashcardScreen set={current} onBack={() => setScreen("detail")} />}
    </div>
  );
}
