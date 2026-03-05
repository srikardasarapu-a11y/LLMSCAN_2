import { useState, useEffect } from 'react';
import { generateTokens } from '../api';

export default function TokenGenerationLogs({ prompt, isSafe }) {
    const [loading, setLoading] = useState(false);
    const [stepsData, setStepsData] = useState([]);
    const [error, setError] = useState(null);

    // Filters
    const [temperature, setTemperature] = useState(0.7);
    const [topK, setTopK] = useState(50);
    const [maxTokens, setMaxTokens] = useState(40);
    const [sample, setSample] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await generateTokens(prompt, {
                temperature: Number(temperature),
                top_k: Number(topK),
                max_tokens: Number(maxTokens),
                sample: Boolean(sample)
            });
            setStepsData(data.steps || []);
        } catch (err) {
            console.error("Failed to generate tokens fetching:", err);
            setError("Failed to load token generation logs.");
        } finally {
            setLoading(false);
        }
    };

    // Note: since the backend `generate` is effectively a model run, 
    // it can take some time. So we only run it on initial mount 
    // or when a user clicks a 'Refresh' button instead of auto-running on slider drag to avoid spam.
    useEffect(() => {
        if (prompt) {
            fetchLogs();
        }
    }, [prompt]);

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                </svg>
                <h3 className="text-base font-semibold text-gray-200">4. Token Generation Logs & Sampling</h3>
            </div>
            <p className="text-xs text-gray-500 mb-6">
                Step-by-step token tracking, probabilities, and logit distribution.
            </p>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="bg-surface-800/80 px-4 py-2 rounded-full border border-gray-700/50 flex items-center gap-2 text-sm">
                    <label className="text-gray-400 font-medium text-xs">TEMP:</label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        className="bg-transparent text-gray-200 w-12 outline-none font-mono"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                    />
                </div>
                <div className="bg-surface-800/80 px-4 py-2 rounded-full border border-gray-700/50 flex items-center gap-2 text-sm">
                    <label className="text-gray-400 font-medium text-xs">TOP K:</label>
                    <input
                        type="number"
                        min="0"
                        className="bg-transparent text-gray-200 w-12 outline-none font-mono"
                        value={topK}
                        onChange={(e) => setTopK(e.target.value)}
                    />
                </div>
                <div className="bg-surface-800/80 px-4 py-2 rounded-full border border-gray-700/50 flex items-center gap-2 text-sm">
                    <label className="text-gray-400 font-medium text-xs">MAX TOKENS:</label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        className="bg-transparent text-gray-200 w-12 outline-none font-mono"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(e.target.value)}
                    />
                </div>
                <div className="bg-surface-800/80 px-4 py-2 rounded-full border border-gray-700/50 flex items-center gap-2 text-sm cursor-pointer" onClick={() => setSample(!sample)}>
                    <label className="text-gray-400 font-medium text-xs cursor-pointer">SAMPLE:</label>
                    <span className="text-gray-200 font-mono uppercase font-semibold">{sample ? 'TRUE' : 'FALSE'}</span>
                </div>

                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="ml-auto bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                    {loading ? 'Generating...' : 'Regenerate'}
                </button>
            </div>

            {/* Logs Table */}
            <div className="bg-surface-900/50 rounded-xl border border-gray-700/30 overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mb-4"></div>
                            <p>Generating tokens step-by-step...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-400">
                            <p>{error}</p>
                        </div>
                    ) : stepsData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No token logs generated yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#0b0f19] text-gray-200 text-xs tracking-wider sticky top-0 z-10 border-b border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Step</th>
                                    <th className="px-6 py-4 font-bold">Token</th>
                                    <th className="px-6 py-4 font-bold">Prob (%)</th>
                                    <th className="px-6 py-4 font-bold">Logit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300 bg-[#0b0f19]">
                                {stepsData.map((stepData) => (
                                    <tr key={stepData.step} className="hover:bg-primary-500/5 transition-colors group">
                                        <td className="px-6 py-3 font-medium text-gray-100">{stepData.step}</td>
                                        <td className="px-6 py-3 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                                            {/* Safely output the token representation we got from backend */}
                                            {stepData.token}
                                        </td>
                                        <td className="px-6 py-3 text-gray-200">{stepData.prob.toFixed(2)}</td>
                                        <td className="px-6 py-3 text-gray-200">{stepData.logit.toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
