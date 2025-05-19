"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const emailRoutes_1 = __importDefault(require("./routes/emailRoutes"));
// Load environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Routes
app.use('/api/v1/emails', emailRoutes_1.default);
// Default route for root path
app.get('/', (req, res) => {
    res.send('Email Service API is running');
});
// Start server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`Email service running on port ${PORT}`);
});
