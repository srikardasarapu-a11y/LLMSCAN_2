import { useState, useEffect, useCallback } from 'react';
import PromptInput from './components/PromptInput';
import ResultsDashboard from './components/ResultsDashboard';
import ScanHistory from './components/ScanHistory';
import { scanPrompt, getHistory } from './api';
import ModelSelector from './components/ModelSelector';

function App() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    const fetchHistory = useCallback(async () => {
        try {
            const data = await getHistory();
            setHistory(data.scans || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleScan = async (prompt) => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await scanPrompt(prompt);
            setResult(data);
            await fetchHistory();
        } catch (err) {
            setError(err.response?.data?.detail || 'Scan failed. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleHistoryClick = (item) => {
        setResult({
            id: item.id,
            prompt: item.prompt,
            classification: item.classification,
            confidence: item.confidence,
            tokens: item.tokens || [],
            token_shifts: item.token_shifts || [],
            layer_shifts: item.layer_shifts || [],
            culprit_layer_idx: item.culprit_layer_idx,
            layer_stats: item.layer_stats || [],
            timestamp: item.timestamp,
        });
    };

    return (
        <div className="min-h-screen">
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/3 -left-20 w-60 h-60 bg-primary-500/8 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <header className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold gradient-text">LLMSCAN</h1>
                    </div>
                    <p className="text-gray-400 text-lg font-light">
                        Causal Scan for LLM Misbehavior Detection
                    </p>
                    <p className="text-gray-500 text-sm mt-2 max-w-xl mx-auto">
                        Analyze prompts using causal intervention analysis to detect potentially unsafe behavior patterns in language models
                    </p>

                    <ModelSelector onModelChangeError={setError} />
                </header>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left section: Input + Results */}
                    <div className="lg:col-span-2 space-y-6">
                        <PromptInput onScan={handleScan} loading={loading} />

                        {error && (
                            <div className="glass-card p-4 border-red-500/30 animate-slide-up">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="glass-card p-8 animate-fade-in scanner-line">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-primary-500/20 flex items-center justify-center">
                                            <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '2px' }}></div>
                                        </div>
                                        <div className="absolute inset-0 rounded-full animate-ping bg-primary-500/10"></div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-300 font-medium">Analyzing Prompt...</p>
                                        <p className="text-gray-500 text-sm mt-1">Running causal intervention analysis</p>
                                    </div>
                                    <div className="w-full max-w-xs space-y-2 mt-2">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></div>
                                            <span>Tokenizing prompt</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                                            <span>Running forward pass</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                                            <span>Computing causal interventions</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
                                            <span>Running detector model</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {result && !loading && (
                            <ResultsDashboard result={result} />
                        )}
                    </div>

                    {/* Right section: History */}
                    <div className="lg:col-span-1">
                        <ScanHistory history={history} onItemClick={handleHistoryClick} />
                    </div>
                </div>

                {/* Footer */}
                <footer className="text-center mt-16 pb-8">
                    <p className="text-gray-600 text-xs">
                        LLMSCAN v1.0 • Causal Intervention Analysis Engine • Powered by PyTorch + HuggingFace
                    </p>
                </footer>
            </div>
        </div>
    );
}

export default App;
