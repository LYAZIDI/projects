"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appelAgent = appelAgent;
exports.appelAgentVision = appelAgentVision;
const genai_1 = require("@google/genai");
let _client = null;
function getClient() {
    if (!_client)
        _client = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return _client;
}
const JSON_INSTRUCTION = '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide. Pas de markdown, pas d\'explication, pas de bloc de code. Sois concis — chaque valeur textuelle doit faire moins de 80 mots.';
async function appelAgent(systemPrompt, userPrompt, _maxTokens = 2048) {
    const response = await getClient().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt + JSON_INSTRUCTION },
    });
    const text = (response.text ?? '').trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error(`L'agent a retourné un JSON invalide : ${text.slice(0, 300)}`);
    }
}
async function appelAgentVision(systemPrompt, userPrompt, imageBase64, imageMimeType, _maxTokens = 1024) {
    const response = await getClient().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                parts: [
                    { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
                    { text: userPrompt },
                ],
            },
        ],
        config: { systemInstruction: systemPrompt + '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide.' },
    });
    const text = (response.text ?? '').trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');
    return JSON.parse(text);
}
//# sourceMappingURL=llm.js.map