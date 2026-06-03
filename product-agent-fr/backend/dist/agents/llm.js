"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appelAgent = appelAgent;
exports.appelAgentVision = appelAgentVision;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
let _client = null;
function getClient() {
    if (!_client)
        _client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    return _client;
}
async function appelAgent(systemPrompt, userPrompt, maxTokens = 2048) {
    const response = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt + '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide. Pas de markdown, pas d\'explication, pas de bloc de code. Sois concis — chaque valeur textuelle doit faire moins de 80 mots.',
        messages: [{ role: 'user', content: userPrompt }],
    });
    const text = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
        .trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error(`L'agent a retourné un JSON invalide : ${text.slice(0, 300)}`);
    }
}
/** Variante avec image (Claude Vision) */
async function appelAgentVision(systemPrompt, userPrompt, imageBase64, imageMimeType, maxTokens = 1024) {
    const response = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt + '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide.',
        messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: imageMimeType,
                            data: imageBase64,
                        },
                    },
                    { type: 'text', text: userPrompt },
                ],
            }],
    });
    const text = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
        .trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(text);
}
//# sourceMappingURL=llm.js.map