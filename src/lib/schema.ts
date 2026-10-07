import { z } from 'zod';
export const categories = [
  'Text & signage',
  'Roads & driving',
  'Architecture',
  'Vegetation & climate',
  'Vehicles & plates',
  'Weather & lighting',
] as const;
export const clueSchema = z.object({
  category: z.enum(categories),
  observation: z.string().min(1).max(500),
  confidence: z.enum(['Low', 'Medium', 'High']),
  region: z.string().max(180),
  language: z.string().max(100).optional(),
});
export const hypothesisDistributionSchema = z.object({
  candidates: z
    .array(
      z.object({
        label: z.string().min(1).max(180),
        likelihood: z.enum(['Likely', 'Plausible', 'Unlikely']),
        supportingEvidence: z.string().min(1).max(600),
        limitations: z.string().min(1).max(600),
        nextCheck: z.string().min(1).max(400),
      }),
    )
    .max(5),
  unresolved: z.string().min(1).max(600),
});
export const hypothesesSchema = z.object({
  location: hypothesisDistributionSchema,
  captureTime: hypothesisDistributionSchema,
});
export const analysisSchema = z.object({
  clues: z.array(clueSchema).max(18),
  summary: z.string().max(800),
  hypotheses: hypothesesSchema.optional(),
  warnings: z.array(z.string().max(300)).max(8).optional(),
});
export type Clue = z.infer<typeof clueSchema>;
export type Analysis = z.infer<typeof analysisSchema> & { provenance?: string };
export type Point = { x: number; y: number };
export type ShadowResult = {
  utc: string;
  altitude: number;
  azimuth: number;
  error: number;
  shadowBearing: number;
  north: number;
  latitude: number;
  longitude: number;
  date: string;
  offset: number;
  tolerance: number;
  matches: number;
  windowStart: string;
  windowEnd: string;
};
export type Evidence = {
  originalBlob: Blob;
  name: string;
  url: string;
  aiData: string;
  width: number;
  height: number;
  size: number;
  hash: string;
  metadata: Record<string, string>;
  gps?: { latitude: number; longitude: number };
  demo?: string;
  metadataError?: string;
};
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`;
