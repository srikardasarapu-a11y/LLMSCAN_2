import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

export async function scanPrompt(prompt) {
    const response = await api.post('/scan', { prompt });
    return response.data;
}

export async function getResult(id) {
    const response = await api.get(`/result/${id}`);
    return response.data;
}

export async function getHistory() {
    const response = await api.get('/history');
    return response.data;
}

export async function generateTokens(prompt, options = {}) {
    const response = await api.post('/generate', { prompt, ...options });
    return response.data;
}

export async function getModels() {
    const response = await api.get('/models');
    return response.data;
}

export async function setModel(model_name) {
    const response = await api.post('/set_model', { model_name });
    return response.data;
}

export default api;
