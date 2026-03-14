import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import {
  Search, ListCheck, BarChart3, FileText, Plus, Trash2, ArrowRight,
  Save, Download, LineChart, TrendingUp, Info, CheckCircle2,
  Sparkles, Loader2, Table as TableIcon, LayoutDashboard, Target, Printer
} from 'lucide-react';

// --- Configuration & Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cosmetic-competitor-tool';
const apiKey = "";

// --- Category Master Data ---
const CATEGORIES = [
  "化粧水", "乳液", "美容液", "フェイスクリーム", "クレンジング",
  "洗顔料", "パック・マスク", "日焼け止め", "アイケア", "リップケア",
  "ファンデーション", "下地・コンシーラー", "ポイントメイク"
];

// --- Research Purpose Master Data ---
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

// --- Custom Component: Radar Chart (SVG) ---
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

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <svg width={size} height={size} className="mx-auto overflow-visible" xmlns="http://www.w3.org/2000/svg">
      {gridLevels.map((lvl, idx) => (
        <polygon
          key={idx}
          points={data.map((_, i) => {
            const x = center + radius * lvl * Math.sin(i * angleStep);
            const y = center - radius * lvl * Math.cos(i * angleStep);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={center + radius * Math.sin(i * angleStep)}
          y2={center - radius * Math.cos(i * angleStep)}
          stroke="#E2E8F0"
        />
      ))}
      <polygon
        points={points}
        fill="rgba(236, 72, 153, 0.2)"
        stroke="#EC4899"
        strokeWidth="2"
      />
      {data.map((d, i) => {
        const x = center + (radius + 25) * Math.sin(i * angleStep);
        const y = center - (radius + 25) * Math.cos(i * angleStep);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const reportRef = useRef(null);

  // Form State
  const [inputData, setInputData] = useState({ productName: '', category: '化粧水', priceRange: '3000-5000' });
  const [competitors, setCompetitors] = useState([]);
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState([]);
  const [analysisMode, setAnalysisMode] = useState('new_product');
  const [analysisResults, setAnalysisResults] = useState(null);

  // Load html2pdf script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Auth setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed", err);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Sync History
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'analysis_history'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => console.error("Firestore error:", error));
    return () => unsubscribe();
  }, [user]);

  const toggleCompetitor = (id) => {
    setSelectedCompetitorIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const fetchCompetitors = async () => {
    if (!inputData.productName) return;
    setLoading(true);
    setSelectedCompetitorIds([]);
    try {
      const prompt = `化粧品ECの専門家として、以下の商品の市場競合商品を5つ提案してください。
      商品名: ${inputData.productName}
      カテゴリ: ${inputData.category}
      価格帯: ${inputData.priceRange}円程度

      各競合について以下の情報をJSON形式で返してください:
      [{"id": 1, "name": "商品名", "price": 4500, "brand": "ブランド名", "merit": "強み・特徴"}]`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        setCompetitors(JSON.parse(jsonMatch[0]));
        setStep(2);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    setLoading(true);
    const selectedComps = competitors.filter(c => selectedCompetitorIds.includes(c.id));
    const mode = ANALYSIS_MODES[analysisMode];

    try {
      const prompt = `熟練の化粧品マーケターとして自社商品「${inputData.productName}」と競合群を比較分析してください。
      競合: ${selectedComps.map(c => `${c.brand} ${c.name}`).join(', ')}
      目的: ${mode.label}

      各指標（${mode.metrics.join(', ')}）に対し、AIが数値を100点満点で付け、その理由となる補足コメントを150字程度で詳細に書いてください。

      以下の形式で詳細なJSONを返してください：
      {
        "text_results": { "${mode.fields[0]}": "分析コメント...", ... },
        "scores": [
          { "label": "${mode.metrics[0]}", "value": 85, "comment": "理由と改善案のコメント..." },
          ...
        ],
        "table_data": [
          { "item": "価格", "our_product": "3000円", "competitors": "4500円〜" },
          ...
        ]
      }`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        setAnalysisResults(JSON.parse(jsonMatch[0]));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: 10,
      filename: `Competitor_Analysis_${inputData.productName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    window.html2pdf().set(opt).from(element).save();
  };

  const saveAnalysis = async () => {
    if (!user || !analysisResults) return;
    const targetComps = competitors.filter(c => selectedCompetitorIds.includes(c.id));
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'analysis_history'), {
      baseProduct: inputData.productName,
      competitors: targetComps,
      purpose: ANALYSIS_MODES[analysisMode].label,
      analysis: analysisResults,
      createdAt: serverTimestamp(),
      userId: user.uid
    });
    setStep(4);
  };

  const deleteRecord = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'analysis_history', id));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Search className="text-pink-500" /> 分析の開始
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">対象商品名</label>
                <input
                  type="text"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition"
                  placeholder="例：ナノリペア美容液"
                  value={inputData.productName}
                  onChange={e => setInputData({...inputData, productName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">カテゴリ詳細</label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-lg bg-white"
                    value={inputData.category}
                    onChange={e => setInputData({...inputData, category: e.target.value})}
                  >
                    {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">価格帯 (円)</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-slate-200 rounded-lg"
                    placeholder="例：3000-5000"
                    value={inputData.priceRange}
                    onChange={e => setInputData({...inputData, priceRange: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={fetchCompetitors}
              disabled={loading || !inputData.productName}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:opacity-90 transition disabled:bg-slate-300 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Search size={18} /> 競合商品を自動検索</>}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <ListCheck className="text-blue-500" /> 競合の確定
                </h2>
                <p className="text-sm text-slate-500 mt-1">分析に加えたい競合を複数選んでください。</p>
              </div>
              <button onClick={() => setStep(1)} className="text-sm text-slate-500 underline">やり直す</button>
            </div>
            <div className="grid gap-4">
              {competitors.map(comp => {
                const isSelected = selectedCompetitorIds.includes(comp.id);
                return (
                  <div
                    key={comp.id}
                    onClick={() => toggleCompetitor(comp.id)}
                    className={`p-5 rounded-xl border-2 cursor-pointer transition flex justify-between items-center ${isSelected ? 'border-pink-500 bg-pink-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-slate-300'}`}>
                        {isSelected && <CheckCircle2 className="text-white w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-pink-600 bg-pink-100 px-2 py-0.5 rounded mb-1 inline-block uppercase tracking-wider">{comp.brand}</span>
                        <h3 className="font-bold text-lg text-slate-800">{comp.name}</h3>
                        <p className="text-sm text-slate-500 italic">特徴: {comp.merit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-700">¥{comp.price.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              disabled={selectedCompetitorIds.length === 0}
              onClick={() => setStep(3)}
              className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition disabled:bg-slate-300 flex items-center justify-center gap-2"
            >
              次へ（調査項目の設定） <ArrowRight size={18} />
            </button>
          </div>
        );

      case 3:
        const mode = ANALYSIS_MODES[analysisMode];
        const selectedCount = selectedCompetitorIds.length;
        return (
          <div className="space-y-6 max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
               <Target className="text-indigo-500" /> 調査・分析の設定
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">調査目的を選択</label>
                <select
                  className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 focus:ring-2 focus:ring-pink-100 transition"
                  value={analysisMode}
                  onChange={e => {
                    setAnalysisMode(e.target.value);
                    setAnalysisResults(null);
                  }}
                >
                  {Object.entries(ANALYSIS_MODES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <p className="text-sm text-slate-500 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed italic">
                  「{mode.description}」
                </p>
              </div>

              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                <h3 className="text-sm font-bold text-indigo-700 mb-4 flex items-center gap-2">
                  <Sparkles size={16} /> この調査項目でよろしいですか？
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {[...mode.fields, ...mode.metrics].map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-indigo-900/70 text-sm">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                      {field}
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-indigo-200/50 flex items-center justify-between">
                   <p className="text-[10px] font-bold text-indigo-400 uppercase">Analysis Target: {selectedCount} Competitors</p>
                   <span className="text-[10px] font-bold bg-white text-indigo-600 px-2 py-1 rounded border border-indigo-200">AUTO-GENERATE MODE</span>
                </div>
              </div>
            </div>

            {!analysisResults ? (
              <button
                onClick={runAIAnalysis}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-2xl hover:opacity-90 transition shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> 分析グラフと表を自動生成する</>}
              </button>
            ) : (
              <div className="space-y-6">
                <div className="pt-6 border-t border-slate-100 space-y-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600 font-bold bg-green-50 py-3 rounded-xl border border-green-100">
                    <CheckCircle2 size={20} /> AIによるプレビュー分析が完了しました
                  </div>
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                    <RadarChart data={analysisResults.scores} size={250} />
                  </div>
                </div>
                <button
                  onClick={saveAnalysis}
                  className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition"
                >
                  詳細レポートを確定保存
                </button>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-end gap-3 mb-4 no-print">
               <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition shadow-lg shadow-pink-100"
                >
                  <Download size={18} /> PDFでダウンロード
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  <Printer size={18} /> 印刷
                </button>
            </div>

            <div ref={reportRef} className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 pdf-content">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <div className="px-3 py-1 bg-pink-100 text-pink-600 text-[10px] font-black rounded-full uppercase tracking-[0.2em] mb-4 inline-block">Strategy Insight Report</div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">Marketing Analysis Report</h2>
                  <p className="text-slate-400 font-bold mt-2">{ANALYSIS_MODES[analysisMode].label} - {inputData.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-300 uppercase">Analysis Date</p>
                  <p className="text-sm font-black text-slate-500">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-center">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex items-center justify-center">
                   <div className="text-center">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Balance Metric Chart</h3>
                      <RadarChart data={analysisResults.scores} size={300} />
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100">
                      <span className="text-[10px] font-black text-pink-400 uppercase">Target Product</span>
                      <h4 className="text-xl font-black text-slate-800">{inputData.productName}</h4>
                   </div>
                   <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                      <span className="text-[10px] font-black text-blue-400 uppercase">Comparison Matrix</span>
                      <table className="w-full mt-2 text-xs">
                        <tbody>
                          {analysisResults.table_data?.map((row, i) => (
                            <tr key={i} className="border-b border-blue-100/50">
                              <td className="py-2 font-bold text-slate-500">{row.item}</td>
                              <td className="py-2 text-slate-800 text-right">{row.our_product}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>

              <div className="mb-16">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 border-b pb-4 flex items-center gap-2">
                  <Sparkles size={14} className="text-pink-500" /> Metric Score & Deep Insight
                </h3>
                <div className="space-y-10">
                  {analysisResults.scores.map((s, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-2xl font-black text-pink-500">{s.value}</span>
                           <span className="text-[10px] font-bold text-slate-400">/ 100</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{s.label}</h4>
                      </div>
                      <div className="md:col-span-3">
                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {s.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 border-b pb-4 flex items-center gap-2">
                   <Info size={14} className="text-blue-500" /> Strategic Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Object.entries(analysisResults.text_results || {}).map(([key, val]) => (
                    <div key={key}>
                      <h4 className="text-sm font-black text-slate-800 mb-2">{key}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-20 pt-8 border-t border-slate-100 text-center">
                 <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">Proprietary Data - Cosmetic Engine Lab</p>
              </div>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setAnalysisResults(null);
                setSelectedCompetitorIds([]);
              }}
              className="w-full py-6 border-2 border-slate-200 text-slate-400 font-black rounded-3xl hover:bg-slate-50 transition tracking-[0.5em] uppercase text-xs"
            >
              Start New Analysis Engine
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans p-4 md:p-8">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-16 gap-6 no-print">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <div className="w-8 h-8 bg-pink-600 rounded-xl transform rotate-45 shadow-lg shadow-pink-100 flex items-center justify-center">
              <Sparkles className="text-white w-4 h-4 transform -rotate-45" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-800">COSMETIC ANALYTICS</h1>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Competitor Intelligence Platform v3.1</p>
        </div>
        <div className="bg-slate-100 p-2 rounded-2xl flex gap-1 shadow-inner">
          {[1,2,3,4].map(i => (
            <div
              key={i}
              className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${step === i ? 'bg-white shadow-md text-pink-600' : 'text-slate-400 opacity-40'}`}
            >
              PHASE 0{i}
            </div>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="no-print mb-12">
           {step !== 4 && (
              <div className="max-w-6xl mx-auto mb-8">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BarChart3 size={14} /> Analysis History
                 </h3>
                 <div className="flex gap-4 overflow-x-auto pb-4">
                    {history.map(item => (
                       <div key={item.id} className="min-w-[200px] p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition cursor-pointer">
                          <span className="text-[8px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded uppercase">{item.purpose}</span>
                          <h4 className="text-xs font-black mt-2 truncate">{item.baseProduct}</h4>
                          <p className="text-[9px] text-slate-300 mt-1">{item.createdAt?.toDate().toLocaleDateString()}</p>
                       </div>
                    ))}
                 </div>
              </div>
           )}
        </div>

        {renderStep()}
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .pdf-content {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
