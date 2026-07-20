export declare const safeArr: (v: unknown) => string[];
export declare function appelAgent<T>(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<T>;
export declare function appelAgentVision<T>(systemPrompt: string, userPrompt: string, imageBase64: string, imageMimeType: string, maxTokens?: number): Promise<T>;
//# sourceMappingURL=llm.d.ts.map