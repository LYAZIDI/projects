"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const analyseRoutes_1 = __importDefault(require("./routes/analyseRoutes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
app.use('/api/analyse', analyseRoutes_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ statut: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});
exports.default = app;
//# sourceMappingURL=app.js.map