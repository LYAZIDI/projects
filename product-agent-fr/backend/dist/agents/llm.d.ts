export declare function appelAgent<T>(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<T>;
/** Variante avec image (Claude Vision) */
export declare function appelAgentVision<T>(systemPrompt: string, userPrompt: string, imageBase64: string, imageMimeType: string, maxTokens?: number): Promise<T>;
//# sourceMappingURL=llm.d.ts.map