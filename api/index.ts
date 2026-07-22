// Vercel Serverless Function — wraps the entire Express app
// All /api/* requests are routed here by vercel.json
import app from '../server/src/index';

export default app;
