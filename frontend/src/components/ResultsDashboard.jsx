import TokenHeatmap from './TokenHeatmap';
import LayerBarChart from './LayerBarChart';
import LayerInspector from './LayerInspector';
import TokenGenerationLogs from './TokenGenerationLogs';

export default function ResultsDashboard({ result }) {
    if (!result) return null;

    const isSafe = result.classification === 'SAFE';
    const confidencePercent = Math.round(result.confidence * 100);
    const hasVisualizationData = result.tokens?.length > 0 && result.token_shifts?.length > 0;

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(result, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `scan_report_${result.id || 'export'}.json`;

        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header / Export Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Causal Misbehavior Scan Report</h1>
                    <p className="text-gray-400 mt-1">Analysis of internal model activations and layered checks.</p>
                </div>
                <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-500 rounded-lg text-sm text-gray-200 hover:bg-surface-800 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export Logs to JSON
                </button>
            </div>

            {/* Metrics Row */}
            {result.kl_divergence !== undefined && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#151318] border border-gray-800 rounded-xl p-4 flex flex-col justify-center items-center">
                        <span className="text-xs text-gray-500 uppercase font-medium">KL Divergence</span>
                        <span className="text-2xl font-mono text-gray-200 mt-1">{result.kl_divergence?.toFixed(2)}</span>
                    </div>
                    <div className="bg-[#151318] border border-gray-800 rounded-xl p-4 flex flex-col justify-center items-center">
                        <span className="text-xs text-gray-500 uppercase font-medium">Logit Difference</span>
                        <span className="text-2xl font-mono text-gray-200 mt-1">{result.logit_difference?.toFixed(2)}</span>
                    </div>
                    <div className="bg-[#151318] border border-gray-800 rounded-xl p-4 flex flex-col justify-center items-center">
                        <span className="text-xs text-gray-500 uppercase font-medium">Token Flip Rate</span>
                        <span className="text-2xl font-mono text-gray-200 mt-1">{result.token_flip_rate?.toFixed(1)}%</span>
                    </div>
                    <div className="bg-[#1b1515] border border-red-900/30 rounded-xl p-4 flex flex-col justify-center items-center">
                        <span className="text-xs text-gray-500 uppercase font-medium mb-1">Causal Trace</span>
                        <div className="flex flex-col items-center">
                            {result.contribution.split(' | ').map((part, idx) => {
                                const [label, layer] = part.split(': ');
                                return (
                                    <div key={idx} className="flex items-center gap-1.5 justify-center leading-tight">
                                        <span className="text-xs text-gray-400 font-medium">{label}:</span>
                                        <span className="text-sm font-mono text-red-400 font-bold">{layer}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Classification Card */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isSafe ? 'bg-safe' : 'bg-unsafe'} animate-pulse`}></div>
                        <h2 className="text-lg font-semibold text-gray-200">Scan Results</h2>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                        ID: {result.id?.slice(0, 8)}...
                    </span>
                </div>

                {/* Classification Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
                    <div className={`px-6 py-3 rounded-xl text-2xl font-bold tracking-wider ${isSafe ? 'badge-safe' : 'badge-unsafe'}`}>
                        {isSafe ? (
                            <span className="flex items-center gap-2">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                </svg>
                                SAFE
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                UNSAFE
                            </span>
                        )}
                    </div>

                    {/* Confidence */}
                    <div className="flex-1 w-full">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Confidence</span>
                            <span className={`text-lg font-bold font-mono ${isSafe ? 'text-safe' : 'text-unsafe'}`}>
                                {confidencePercent}%
                            </span>
                        </div>
                        <div className="h-3 bg-surface-900 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full confidence-fill ${isSafe ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-700 to-red-400'}`}
                                style={{ width: `${confidencePercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Prompt */}
                <div className="bg-surface-900/50 rounded-xl p-4 border border-gray-700/20">
                    <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Analyzed Prompt</p>
                    <p className="text-gray-300 text-sm font-mono">&ldquo;{result.prompt}&rdquo;</p>
                </div>
            </div>

            {/* Visualizations */}
            {hasVisualizationData && (
                <div className="grid grid-cols-1 gap-6">
                    {/* Token Influence Heatmap */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                            </svg>
                            <h3 className="text-base font-semibold text-gray-200">Token Influence Heatmap</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                            Shows causal influence of each token. Brighter colors indicate higher impact on model output.
                        </p>
                        <TokenHeatmap tokens={result.tokens} shifts={result.token_shifts} isSafe={isSafe} />
                    </div>

                    {/* Layer Influence Chart */}
                    {result.layer_shifts?.length > 0 && (
                        <div className="glass-card p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                </svg>
                                <h3 className="text-base font-semibold text-gray-200">Layer Influence Chart</h3>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                Shows the causal impact of disabling each transformer layer on model predictions.
                            </p>
                            <LayerBarChart layerShifts={result.layer_shifts} isSafe={isSafe} />
                        </div>
                    )}

                    {/* Layer Inspector */}
                    {result.layer_stats?.length > 0 && (
                        <LayerInspector
                            layerStats={result.layer_stats}
                            culpritLayerIdx={result.culprit_layer_idx}
                        />
                    )}

                    {/* Token Generation Logs */}
                    <TokenGenerationLogs prompt={result.prompt} isSafe={isSafe} />
                </div>
            )}
        </div>
    );
}
