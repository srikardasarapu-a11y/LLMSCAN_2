import { useState } from 'react';

function getHeatColor(value, isSafe) {
    // value in [0, 1] → color from cool to hot
    const clamped = Math.max(0, Math.min(1, value));

    if (isSafe) {
        // Green spectrum: low = dark teal, high = bright green
        const r = Math.round(16 + clamped * 20);
        const g = Math.round(80 + clamped * 175);
        const b = Math.round(60 + clamped * 69);
        const a = 0.15 + clamped * 0.55;
        return {
            bg: `rgba(${r}, ${g}, ${b}, ${a})`,
            border: `rgba(${r}, ${g}, ${b}, ${Math.min(a + 0.3, 1)})`,
            text: clamped > 0.5 ? '#d1fae5' : '#a7f3d0',
        };
    } else {
        // Red spectrum: low = muted, high = intense red
        const r = Math.round(180 + clamped * 75);
        const g = Math.round(60 - clamped * 40);
        const b = Math.round(60 - clamped * 30);
        const a = 0.15 + clamped * 0.55;
        return {
            bg: `rgba(${r}, ${g}, ${b}, ${a})`,
            border: `rgba(${r}, ${g}, ${b}, ${Math.min(a + 0.3, 1)})`,
            text: clamped > 0.5 ? '#fecaca' : '#fca5a5',
        };
    }
}

export default function TokenHeatmap({ tokens, shifts, isSafe }) {
    const [hoveredIdx, setHoveredIdx] = useState(null);

    if (!tokens?.length || !shifts?.length) {
        return <p className="text-gray-500 text-sm">No token data available.</p>;
    }

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-4">
                {tokens.map((token, i) => {
                    const shift = shifts[i] ?? 0;
                    const colors = getHeatColor(shift, isSafe);
                    const isHovered = hoveredIdx === i;

                    return (
                        <div
                            key={i}
                            className="heatmap-cell"
                            style={{
                                backgroundColor: colors.bg,
                                border: `1px solid ${colors.border}`,
                                color: colors.text,
                                transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                                zIndex: isHovered ? 10 : 1,
                            }}
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            <span>{token.replace('Ġ', ' ').replace('Ċ', '\\n')}</span>
                            {isHovered && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-800 border border-gray-600/50 text-gray-300 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                                    Shift: {shift.toFixed(4)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Color scale legend */}
            <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-500">Low influence</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
                    background: isSafe
                        ? 'linear-gradient(to right, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.7))'
                        : 'linear-gradient(to right, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.7))'
                }}></div>
                <span className="text-xs text-gray-500">High influence</span>
            </div>
        </div>
    );
}
