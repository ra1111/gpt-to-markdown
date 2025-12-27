
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { stripMarkdown, calculateStats } from './utils/markdownRemover';
import { polishAIText } from './services/geminiService';
import { ProcessingStatus, HistoryItem, ProcessingOptions } from './types';

const App: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [autoClean, setAutoClean] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [options, setOptions] = useState<ProcessingOptions>({
    removeLinks: true,
    removeCodeBlocks: false,
    flattenLists: false,
    removeImages: true,
    preserveSpacing: true
  });

  // Stats
  const stats = calculateStats(output);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('md-stripper-history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = useCallback((inputStr: string, outputStr: string) => {
    if (!inputStr.trim()) return;
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      input: inputStr,
      output: outputStr,
      title: inputStr.slice(0, 30) + (inputStr.length > 30 ? '...' : '')
    };
    const updated = [newItem, ...history].slice(0, 20); // Keep last 20
    setHistory(updated);
    localStorage.setItem('md-stripper-history', JSON.stringify(updated));
  }, [history]);

  const handleClean = useCallback(async (isSmart: boolean = false) => {
    if (!input.trim()) return;

    if (isSmart) {
      setStatus(ProcessingStatus.PROCESSING);
      try {
        const cleaned = await polishAIText(input);
        setOutput(cleaned);
        setStatus(ProcessingStatus.COMPLETED);
        saveToHistory(input, cleaned);
      } catch (err) {
        setStatus(ProcessingStatus.ERROR);
        const basic = stripMarkdown(input, options);
        setOutput(basic);
      }
    } else {
      const basic = stripMarkdown(input, options);
      setOutput(basic);
      setStatus(ProcessingStatus.COMPLETED);
    }
  }, [input, options, saveToHistory]);

  useEffect(() => {
    if (autoClean && input) {
      setOutput(stripMarkdown(input, options));
    } else if (!input) {
      setOutput('');
    }
  }, [input, autoClean, options]);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
    if (!autoClean) saveToHistory(input, output);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setStatus(ProcessingStatus.IDLE);
  };

  const deleteHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('md-stripper-history', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="History"
          >
            <i className={`fas ${showHistory ? 'fa-times' : 'fa-history'}`}></i>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <i className="fas fa-feather-alt text-sm"></i>
            </div>
            <span className="font-bold text-slate-800 hidden sm:inline">CleanDraft</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
            <button 
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${autoClean ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
              onClick={() => setAutoClean(true)}
            >Live</button>
            <button 
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!autoClean ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
              onClick={() => setAutoClean(false)}
            >Manual</button>
          </div>
          
          <button 
            onClick={() => handleClean(true)}
            disabled={status === ProcessingStatus.PROCESSING || !input}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95"
          >
            {status === ProcessingStatus.PROCESSING ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sparkles"></i>}
            Refine
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* History Sidebar */}
        <aside className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col ${showHistory ? 'w-64' : 'w-0 overflow-hidden border-none'}`}>
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400">Past Sessions</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10 italic px-4">No history yet. Clean something to save it here.</p>
            ) : (
              history.map(item => (
                <div key={item.id} className="group p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-pointer relative" onClick={() => {setInput(item.input); setOutput(item.output);}}>
                  <p className="text-xs font-semibold text-slate-700 truncate pr-6">{item.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteHistory(item.id); }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <i className="fas fa-trash-alt text-[10px]"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 lg:p-6 bg-slate-50 overflow-auto">
          {/* Input Pane */}
          <div className="flex-1 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Raw Markdown</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSettings(!showSettings)} className={`text-xs font-bold transition-colors ${showSettings ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <i className="fas fa-cog mr-1"></i> Stripper Rules
                </button>
                <div className="h-3 w-px bg-slate-300 mx-1"></div>
                <button onClick={handleClear} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">Clear</button>
              </div>
            </div>
            
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative group focus-within:ring-2 ring-indigo-500/10 transition-all">
              {showSettings && (
                <div className="absolute top-0 right-0 w-64 bg-white border-l border-b border-slate-100 p-4 z-10 shadow-xl rounded-bl-xl animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3">Strip Rules</h4>
                  <div className="space-y-3">
                    {Object.keys(options).map((key) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer group">
                        <span className="text-xs font-medium text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <input 
                          type="checkbox" 
                          checked={(options as any)[key]} 
                          onChange={(e) => setOptions(prev => ({...prev, [key]: e.target.checked}))}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                className="w-full h-full p-6 text-sm mono leading-relaxed outline-none resize-none bg-transparent placeholder-slate-300 text-slate-700"
                placeholder="Drop a .md file or paste text here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
          </div>

          {/* Output Pane */}
          <div className="flex-1 flex flex-col min-h-[400px]">
             <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Clean Output</span>
              <div className="flex items-center gap-4">
                <div className="flex gap-3 text-[10px] font-bold text-slate-400">
                  <span>{stats.words} words</span>
                  <span>{stats.readTime} min read</span>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden relative flex flex-col">
              <div className="flex-1 p-6 text-slate-300 text-sm leading-relaxed overflow-auto whitespace-pre-wrap font-medium">
                {output || (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                    <i className="fas fa-magic text-4xl mb-4"></i>
                    <p className="text-center font-bold tracking-tight px-10">Start typing to see magic</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-600 uppercase">{output.length} characters</span>
                <button 
                  onClick={handleCopy}
                  disabled={!output}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${copyFeedback ? 'bg-green-500 text-white' : 'bg-white text-slate-900 hover:bg-slate-100 active:scale-95'}`}
                >
                  <i className={`fas ${copyFeedback ? 'fa-check-circle' : 'fa-copy'}`}></i>
                  {copyFeedback ? 'Copied' : 'Copy All'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="bg-white border-t border-slate-200 py-2 px-6 flex justify-center">
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span className="flex items-center gap-1"><i className="fas fa-shield-alt text-indigo-500"></i> Local-First</span>
          <span className="flex items-center gap-1"><i className="fas fa-bolt text-amber-500"></i> Real-time</span>
          <span className="flex items-center gap-1"><i className="fas fa-brain text-purple-500"></i> AI Powered</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
