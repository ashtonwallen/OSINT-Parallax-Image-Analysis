import { handleAI } from '@/lib/ai-route';
export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = (request: Request) => handleAI(request, false);
