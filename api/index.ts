// Vercel serverless function entry point
// This file re-exports the Express app for Vercel
// Vercel will compile TypeScript on-the-fly, so we import from source
import app from '../src/server';

export default app;

