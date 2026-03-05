import { useState } from 'react';

export default function LayerInspector({ layerStats, culpritLayerIdx, startedLayerIdx }) {
    const [selectedLayer, setSelectedLayer] = useState(culpritLayerIdx);

    if (!layerStats || layerStats.length === 0) {
        return <p className="text-gray-500 text-sm">No layer statistics available.</p>;
    }

    const currentStats = layerStats.find((s) => s.layer === selectedLayer) || layerStats[0];
    const { sublayers } = currentStats;

    return (
        <div className="glass-card p-6 mt-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-6">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                </svg>
                <h3 className="text-base font-semibold text-gray-200">Transformer Layer Inspector</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Layer Selector */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Select Layer</label>
                    <div className="h-64 overflow-y-auto pr-2 space-y-1">
                        {layerStats.map((stat, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedLayer(i)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${selectedLayer === i
                                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                                    : 'text-gray-400 hover:bg-surface-800 border border-transparent cursor-pointer'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono">Layer {i}</span>
                                    {i === culpritLayerIdx && (
                                        <span title="Layer with highest impact on prediction (Carried)" className="flex items-center text-xs text-orange-400">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </span>
                                    )}
                                    {i === startedLayerIdx && i !== culpritLayerIdx && (
                                        <span title="Layer where misbehavior starts forming" className="flex items-center text-xs text-blue-400">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                    {culpritLayerIdx !== undefined && (
                        <div className="mt-3 space-y-1.5 border border-gray-800 bg-surface-900/40 rounded-lg p-2.5">
                            <p className="text-xs text-orange-400/90 flex gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="leading-tight">Warning: Layer most responsible for the final output shift (Carried).</span>
                            </p>
                            <p className="text-xs text-blue-400/90 flex gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                </svg>
                                <span className="leading-tight">Info: Layer where significant causal divergence is first detected (Started).</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Layer Details Table */}
                <div className="md:col-span-3">
                    <div className="bg-surface-900/50 rounded-xl border border-gray-700/30 overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-700/50 bg-surface-800">
                            <h4 className="text-sm font-semibold text-gray-200">Layer {selectedLayer} Parameter Statistics</h4>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-surface-900/80 text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">Sub-module</th>
                                        <th className="px-5 py-3 font-medium">W-Norm</th>
                                        <th className="px-5 py-3 font-medium">W-Mean</th>
                                        <th className="px-5 py-3 font-medium">W-Std</th>
                                        <th className="px-5 py-3 font-medium">B-Norm</th>
                                        <th className="px-5 py-3 font-medium">B-Mean</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/30 font-mono text-gray-300">
                                    {Object.entries(sublayers).map(([name, stats]) => (
                                        <tr key={name} className="hover:bg-primary-500/5 transition-colors">
                                            <td className="px-5 py-3 text-primary-300 font-medium">{name}</td>
                                            <td className="px-5 py-3 text-gray-400">{stats.weight_norm?.toFixed(2) || '-'}</td>
                                            <td className="px-5 py-3">{stats.weight_mean?.toFixed(4) || '-'}</td>
                                            <td className="px-5 py-3 text-gray-400">{stats.weight_std?.toFixed(4) || '-'}</td>
                                            <td className="px-5 py-3 text-emerald-400/80">{stats.bias_norm?.toFixed(2) || '-'}</td>
                                            <td className="px-5 py-3">{stats.bias_mean?.toFixed(4) || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
