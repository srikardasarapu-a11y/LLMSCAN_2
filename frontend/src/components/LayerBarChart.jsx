import { useRef, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function LayerBarChart({ layerShifts, isSafe, culpritLayerIdx, startedLayerIdx }) {
    if (!layerShifts?.length) {
        return <p className="text-gray-500 text-sm">No layer data available.</p>;
    }

    const labels = layerShifts.map((_, i) => `Layer ${i}`);

    const baseColor = isSafe ? '16, 185, 129' : '239, 68, 68';
    const accentColor = isSafe ? '52, 211, 153' : '248, 113, 113';

    const data = {
        labels,
        datasets: [
            {
                label: 'Layer Logit Shift',
                data: layerShifts,
                backgroundColor: layerShifts.map((v) => {
                    const intensity = Math.max(0.3, v);
                    return `rgba(${baseColor}, ${intensity * 0.7})`;
                }),
                borderColor: layerShifts.map((v) => {
                    const intensity = Math.max(0.3, v);
                    return `rgba(${accentColor}, ${intensity})`;
                }),
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            },
        ],
    };

    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(30, 30, 46, 0.95)',
                titleColor: '#e5e7eb',
                bodyColor: '#d1d5db',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                titleFont: { family: 'Inter', size: 12, weight: 600 },
                bodyFont: { family: 'JetBrains Mono', size: 11 },
                callbacks: {
                    label: (ctx) => `Shift: ${ctx.raw.toFixed(4)}`,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.04)',
                },
                ticks: {
                    color: '#6b7280',
                    font: { family: 'Inter', size: 11 },
                },
                title: {
                    display: true,
                    text: 'Logit Shift (normalized)',
                    color: '#9ca3af',
                    font: { family: 'Inter', size: 11 },
                },
            },
            y: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#9ca3af',
                    font: { family: 'JetBrains Mono', size: 11 },
                },
            },
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart',
        },
    };

    const height = Math.max(200, layerShifts.length * 40);

    return (
        <div style={{ height: `${height}px` }}>
            <Bar data={data} options={options} />
        </div>
    );
}
