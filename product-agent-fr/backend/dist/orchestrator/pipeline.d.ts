import type { ProduitInput, ResultatPipeline } from '../agents/types';
export type EtapePipeline = {
    etape: number;
    total: number;
    nom: string;
    statut: 'en_cours' | 'termine' | 'erreur';
    donnees?: unknown;
};
export declare function lancerPipeline(input: ProduitInput, onProgres: (etape: EtapePipeline) => void): Promise<ResultatPipeline>;
//# sourceMappingURL=pipeline.d.ts.map