export default function ScanHistory({ history, onItemClick }) {
    return (
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-200">Scan History</h2>
            </div>

            {!history || history.length === 0 ? (
                <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                    <p className="text-gray-500 text-sm">No scans yet</p>
                    <p className="text-gray-600 text-xs mt-1">Enter a prompt and click Scan to get started</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {history.map((item) => {
                        const isSafe = item.classification === 'SAFE';
                        const time = item.timestamp ? new Date(item.timestamp).toLocaleString() : '';

                        return (
                            <button
                                key={item.id}
                                onClick={() => onItemClick(item)}
                                className="history-item w-full text-left p-3 rounded-xl border border-gray-700/20 bg-surface-900/30 hover:bg-primary-500/5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-300 truncate font-mono">
                                            &ldquo;{item.prompt}&rdquo;
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">{time}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isSafe ? 'badge-safe' : 'badge-unsafe'}`}>
                                            {item.classification}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono">
                                            {Math.round(item.confidence * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
