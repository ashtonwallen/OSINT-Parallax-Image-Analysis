import { handleAI } from '@/lib/ai-route';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = (request: Request) => handleAI(request, true);
