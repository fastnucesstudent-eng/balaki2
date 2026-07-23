// Vercel Serverless Function — wraps the entire Express app
// All /api/* requests are routed here by vercel.json
// @ts-ignore
import app from '../server/src/index.js';

export default app;
