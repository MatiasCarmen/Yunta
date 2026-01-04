'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function generateGeminiResponse(prompt: string) {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        return 'Error: API Key no configurada en el servidor.';
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        return 'Error al conectar con la Inteligencia Artificial. Intente más tarde.';
    }
}
