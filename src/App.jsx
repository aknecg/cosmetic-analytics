import React, { useState, useRef } from 'react';
import './App.css';

// --- Inline SVG Icons ---
const Ico = {
  Search: ({ size = 18 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  ListCheck: ({ size = 18 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="m19 10-3.5 3.5L14 12"/></svg>,
  BarChart3: ({ size = 14 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
  ArrowRight: ({ size = 18 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  Download: ({ size = 18 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Printer: ({ size = 18 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>,
  Target: ({ size = 18 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Info: ({ size = 14 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
  CheckCircle2: ({ size = 20, className = '' }) => <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
  Sparkles: ({ size = 16, className = '' }) => <svg width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Loader2: ({ size = 20 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
};

// --- Category Master Data ---
const CATEGORIES = [
  "化粧水", "乳液", "美容液", "フェイスクリーム", "クレンジング",
  "洗顔料", "パック・マスク", "日焼け止め", "アイケア", "リップケア",
  "ファンデーション", "下地・コンシーラー", "ポイントメイク"
];

const ANALYSIS_MODES = {
  new_product: {
    label: "新商品企画（差別化）",
    fields: ["配合成分の特徴", "パッケージ訴求ポイント", "ターゲット層", "容量/単価", "ブランドイメージ"],
    metrics: ["成分革新性", "パッケージ映え", "ターゲット適合度", "コストパフォーマンス", "ブランド独創性"],
    description: "競合と被らない独自のポジションを見つけます。"
  },
  ad_optimization: {
    label: "広告・訴求改善",
    fields: ["メインキャッチコピー", "クリエイティブの傾向", "LPの構成要素", "ユーザーの不満点（口コミ）"],
    metrics: ["コピーの訴求力", "視覚的インパクト", "信頼感の醸成", "課題解決の提示", "共感の得やすさ"],
    description: "クリック率・成約率を高めるための訴求軸を分析します。"
  },
  price_strategy: {
    label: "価格戦略・セール対策",
    fields: ["実売価格", "ポイント還元率", "送料無料条件", "定期購入特典", "同梱物の有無"],
    metrics: ["価格競争力", "還元のお得感", "購入ハードルの低さ", "LTV継続期待値", "付加価値感"],
    description: "競合のセール状況を把握し、最適なオファーを検討します。"
  }
};

const GEMINI_API_KEY = "";

// --- Radar Chart (SVG) ---
const RadarChart = ({ data, size = 300 }) => {
  const center = size / 2;
  const radius = (size / 2) * 0.7;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const r = (d.value / 100) * radius;
    const x = center + r * Math.sin(i * angleStep);
    const y = center - r * Math.cos(i * angleStep);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={size} height={size} style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
      {[0.2, 0.4, 0.6, 0.8, 1].map((lvl, idx) => (
        <polygon key={idx}
          points={data.map((_, i) => `${center + radius * lvl * Math.sin(i * angleStep)},${center - radius * lvl * Math.cos(i * angleStep)}`).join(' ')}
          fill="none" stroke="#E2E8F0" strokeWidth="1"
        />
      ))}
      {data.map((_, i) => (
        <line key={i} x1={center} y1={center}
          x2={center + radius * Math.sin(i * angleStep)}
          y2={center - radius * Math.cos(i * angleStep)}
          stroke="#E2E8F0"
        />
      ))}
      <polygon points={points} fill="rgba(236,72,153,0.2)" stroke="#EC4899" strokeWidth="2" />
      {data.map((d, i) => {
        const x = center + (radius + 25) * Math.sin(i * angleStep);
        const y = center - (radius + 25) * Math.cos(i * angleStep);
        return <text key={i} x={x} y={y} textAnchor="middle" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }}>{d.label}</text>;
      })}
    </svg>
  );
};

// --- localStorage helpers ---
const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem('cosmetic_history') || '[]'); }
  catch { return []; }
};
const saveHistory = (items) => localStorage.setItem('cosmetic_history', JSON.stringify(items));

// --- Main App ---
const App = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const reportRef = useRef(null);

  const [inputData, setInputData] = useState({ productName: '', category: '化粧水', priceRange: '3000-5000' });
  const [competitors, setCompetitors] = useState([]);
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState([]);
  const [analysisMode, setAnalysisMode] = useState('new_product');
  const [analysisResults, setAnalysisResults] = useState(null);

  const toggleCompetitor = (id) =>
    setSelectedCompetitorIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const callGemini = async (prompt) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  };

  const fetchCompetitors = async () => {
    if (!inputData.productName) return;
    setLoading(true);
    setSelectedCompetitorIds([]);
    try {
      const text = await callGemini(`化粧品ECの専門家として、以下の商品の市場競合商品を5つ提案してください。
商品名: ${inputData.productName} / カテゴリ: ${inputData.category} / 価格帯: ${inputData.priceRange}円程度
各競合について以下の情報をJSON形式で返してください:
[{"id": 1, "name": "商品名", "price": 4500, "brand": "ブランド名", "merit": "強み・特徴"}]`);
      const match = text.match(/\[.*\]/s);
      if (match) { setCompetitors(JSON.parse(match[0])); setStep(2); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const runAIAnalysis = async () => {
    setLoading(true);
    const selectedComps = competitors.filter(c => selectedCompetitorIds.includes(c.id));
    const mode = ANALYSIS_MODES[analysisMode];
    try {
      const text = await callGemini(`熟練の化粧品マーケターとして自社商品「${inputData.productName}」と競合群を比較分析してください。
競合: ${selectedComps.map(c => `${c.brand} ${c.name}`).join(', ')} / 目的: ${mode.label}
各指標（${mode.metrics.join(', ')}）に対し数値を100点満点で付け、補足コメントを150字程度で書いてください。
以下の形式でJSONを返してください:
{"text_results": {"${mode.fields[0]}": "..."}, "scores": [{"label": "${mode.metrics[0]}", "value": 85, "comment": "..."}], "table_data": [{"item": "価格", "our_product": "3000円", "competitors": "4500円〜"}]}`);
      const match = text.match(/\{.*\}/s);
      if (match) setAnalysisResults(JSON.parse(match[0]));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveAnalysis = () => {
    const entry = {
      id: Date.now(),
      baseProduct: inputData.productName,
      purpose: ANALYSIS_MODES[analysisMode].label,
      analysis: analysisResults,
      createdAt: new Date().toLocaleDateString(),
    };
    const updated = [entry, ...history];
    setHistory(updated);
    saveHistory(updated);
    setStep(4);
  };

  const handleDownloadPDF = () => {
    const el = reportRef.current;
    const opt = { margin: 10, filename: `Analysis_${inputData.productName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } };
    window.html2pdf?.().set(opt).from(el).save();
  };

  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="card max-w-2xl">
          <h2 className="step-title"><Ico.Search size={22} /><span>分析の開始</span></h2>
          <div className="form-grid">
            <div className="field">
              <label>対象商品名</label>
              <input type="text" placeholder="例：ナノリペア美容液" value={inputData.productName}
                onChange={e => setInputData({ ...inputData, productName: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>カテゴリ</label>
                <select value={inputData.category} onChange={e => setInputData({ ...inputData, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>価格帯 (円)</label>
                <input type="text" placeholder="例：3000-5000" value={inputData.priceRange}
                  onChange={e => setInputData({ ...inputData, priceRange: e.target.value })} />
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={fetchCompetitors} disabled={loading || !inputData.productName}>
            {loading ? <Ico.Loader2 size={18} /> : <Ico.Search size={18} />}
            <span>{loading ? '検索中...' : '競合商品を自動検索'}</span>
          </button>
        </div>
      );

      case 2: return (
        <div className="max-w-4xl">
          <div className="step-header">
            <div>
              <h2 className="step-title"><Ico.ListCheck size={22} /><span>競合の確定</span></h2>
              <p className="step-sub">分析に加えたい競合を複数選んでください。</p>
            </div>
            <button className="btn-link" onClick={() => setStep(1)}>やり直す</button>
          </div>
          <div className="competitor-list">
            {competitors.map(comp => {
              const sel = selectedCompetitorIds.includes(comp.id);
              return (
                <div key={comp.id} className={`competitor-card ${sel ? 'selected' : ''}`} onClick={() => toggleCompetitor(comp.id)}>
                  <div className="competitor-left">
                    <div className={`checkbox ${sel ? 'checked' : ''}`}>
                      {sel && <Ico.CheckCircle2 size={14} className="check-icon" />}
                    </div>
                    <div>
                      <span className="brand-tag">{comp.brand}</span>
                      <h3 className="competitor-name">{comp.name}</h3>
                      <p className="competitor-merit">特徴: {comp.merit}</p>
                    </div>
                  </div>
                  <p className="competitor-price">¥{comp.price.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
          <button className="btn-dark" disabled={selectedCompetitorIds.length === 0} onClick={() => setStep(3)}>
            次へ（調査項目の設定）<Ico.ArrowRight size={18} />
          </button>
        </div>
      );

      case 3: {
        const mode = ANALYSIS_MODES[analysisMode];
        return (
          <div className="card max-w-3xl">
            <h2 className="step-title"><Ico.Target size={22} /><span>調査・分析の設定</span></h2>
            <div className="field">
              <label className="label-sm">調査目的を選択</label>
              <select className="select-lg" value={analysisMode} onChange={e => { setAnalysisMode(e.target.value); setAnalysisResults(null); }}>
                {Object.entries(ANALYSIS_MODES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <p className="mode-desc">「{mode.description}」</p>
            </div>
            <div className="preview-box">
              <h3 className="preview-title"><Ico.Sparkles size={16} />この調査項目でよろしいですか？</h3>
              <div className="preview-grid">
                {[...mode.fields, ...mode.metrics].map((f, i) => (
                  <div key={i} className="preview-item"><span className="dot-indigo" />{f}</div>
                ))}
              </div>
              <div className="preview-footer">
                <span className="preview-count">Analysis Target: {selectedCompetitorIds.length} Competitors</span>
                <span className="preview-badge">AUTO-GENERATE MODE</span>
              </div>
            </div>
            {!analysisResults ? (
              <button className="btn-indigo" onClick={runAIAnalysis} disabled={loading}>
                {loading ? <Ico.Loader2 size={20} /> : <Ico.Sparkles size={20} />}
                <span>{loading ? '解析中...' : '分析グラフと表を自動生成する'}</span>
              </button>
            ) : (
              <div className="analysis-preview">
                <div className="analysis-ok"><Ico.CheckCircle2 size={20} />AIによるプレビュー分析が完了しました</div>
                <div className="radar-wrap"><RadarChart data={analysisResults.scores} size={250} /></div>
                <button className="btn-dark" onClick={saveAnalysis}>詳細レポートを確定保存</button>
              </div>
            )}
          </div>
        );
      }

      case 4: return (
        <div className="max-w-5xl">
          <div className="report-actions no-print">
            <button className="btn-pink" onClick={handleDownloadPDF}><Ico.Download size={18} />PDFでダウンロード</button>
            <button className="btn-light" onClick={() => window.print()}><Ico.Printer size={18} />印刷</button>
          </div>
          <div ref={reportRef} className="report pdf-content">
            <div className="report-header">
              <div>
                <span className="report-badge">Strategy Insight Report</span>
                <h2 className="report-title">Marketing Analysis Report</h2>
                <p className="report-sub">{ANALYSIS_MODES[analysisMode].label} - {inputData.category}</p>
              </div>
              <div className="report-date">
                <p className="date-label">Analysis Date</p>
                <p className="date-val">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div className="report-overview">
              <div className="radar-card">
                <p className="radar-label">Balance Metric Chart</p>
                <RadarChart data={analysisResults.scores} size={300} />
              </div>
              <div className="report-side">
                <div className="product-card">
                  <span className="product-label">Target Product</span>
                  <h4 className="product-name">{inputData.productName}</h4>
                </div>
                <div className="matrix-card">
                  <span className="matrix-label">Comparison Matrix</span>
                  <table className="matrix-table">
                    <tbody>
                      {analysisResults.table_data?.map((row, i) => (
                        <tr key={i}><td className="matrix-item">{row.item}</td><td className="matrix-val">{row.our_product}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="scores-section">
              <h3 className="section-title"><Ico.Sparkles size={14} className="pink" />Metric Score & Deep Insight</h3>
              <div className="scores-list">
                {analysisResults.scores.map((s, i) => (
                  <div key={i} className="score-row">
                    <div className="score-left">
                      <span className="score-val">{s.value}</span><span className="score-unit">/ 100</span>
                      <p className="score-label">{s.label}</p>
                    </div>
                    <div className="score-comment">{s.comment}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="reco-section">
              <h3 className="section-title"><Ico.Info size={14} className="blue" />Strategic Recommendations</h3>
              <div className="reco-grid">
                {Object.entries(analysisResults.text_results || {}).map(([k, v]) => (
                  <div key={k}><h4 className="reco-key">{k}</h4><p className="reco-val">{v}</p></div>
                ))}
              </div>
            </div>
            <div className="report-footer">Proprietary Data - Cosmetic Engine Lab</div>
          </div>
          <button className="btn-restart" onClick={() => { setStep(1); setAnalysisResults(null); setSelectedCompetitorIds([]); }}>
            Start New Analysis Engine
          </button>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="page">
      <header className="header no-print">
        <div>
          <div className="logo-row">
            <div className="logo-icon"><Ico.Sparkles size={16} className="logo-spark" /></div>
            <h1 className="logo-text">COSMETIC ANALYTICS</h1>
          </div>
          <p className="logo-sub">Competitor Intelligence Platform v3.1</p>
        </div>
        <div className="phase-bar">
          {[1,2,3,4].map(i => (
            <div key={i} className={`phase ${step === i ? 'active' : ''}`}>PHASE 0{i}</div>
          ))}
        </div>
      </header>

      <main className="main">
        {step !== 4 && history.length > 0 && (
          <div className="history no-print">
            <p className="history-title"><Ico.BarChart3 size={14} />Analysis History</p>
            <div className="history-scroll">
              {history.map(item => (
                <div key={item.id} className="history-card">
                  <span className="history-tag">{item.purpose}</span>
                  <h4 className="history-name">{item.baseProduct}</h4>
                  <p className="history-date">{item.createdAt}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {renderStep()}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print { .no-print { display: none !important; } .pdf-content { box-shadow: none !important; border: none !important; padding: 0 !important; } body { background: white !important; } }
      `}</style>
    </div>
  );
};

export default App;
