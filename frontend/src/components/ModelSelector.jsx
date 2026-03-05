import { useState, useEffect } from 'react';
import { getModels, setModel } from '../api';

export default function ModelSelector({ onModelChangeError }) {
    const [modelsInfo, setModelsInfo] = useState({ models: [], current_model: '' });
    const [modelLoading, setModelLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchModels = async () => {
            try {
                const data = await getModels();
                if (mounted) setModelsInfo(data);
            } catch (err) {
                console.error('Failed to fetch models:', err);
                if (mounted && onModelChangeError) onModelChangeError('Failed to load available models.');
            }
        };
        fetchModels();
        return () => { mounted = false; };
    }, [onModelChangeError]);

    const handleModelChange = async (e) => {
        const newModel = e.target.value;
        if (newModel === modelsInfo.current_model) return;

        setModelLoading(true);
        try {
            await setModel(newModel);
            setModelsInfo(prev => ({ ...prev, current_model: newModel }));
        } catch (err) {
            console.error('Failed to set model:', err);
            if (onModelChangeError) onModelChangeError('Failed to switch model. Server might be out of memory.');
        } finally {
            setModelLoading(false);
        }
    };

    if (!modelsInfo.models || modelsInfo.models.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 inline-flex items-center gap-3 bg-surface-900/50 border border-gray-800 rounded-full px-5 py-2 animate-fade-in shadow-lg shadow-black/20">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Active Model</span>
            <div className="w-px h-4 bg-gray-700"></div>
            {modelLoading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
                    <span className="text-xs text-primary-400 font-medium animate-pulse">Switching & Allocating VRAM...</span>
                </div>
            ) : (
                <div className="relative">
                    <select
                        className="bg-transparent text-gray-200 text-sm outline-none cursor-pointer font-medium appearance-none pr-6 hover:text-white transition-colors"
                        value={modelsInfo.current_model}
                        onChange={handleModelChange}
                    >
                        {modelsInfo.models.map(m => (
                            <option key={m.id} value={m.id} className="bg-surface-900 text-gray-200">{m.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}
