import { z } from 'zod';
import { checkProviderResponse } from './provider-errors';
import { analysisSchema } from './schema';
import { analysisPrompt, chatBody, parseAnalysis } from './providers';
import {
  contextText,
  followUpBody,
  conversationPrompt,
  replySchema,
  type Conversation,
} from './conversation';

export function cloudChatRequest(
  provider: CloudProvider,
  model: string,
  key: string,
  image: string,
  conversation: Conversation,
) {
  const request = cloudRequest(provider, model, key, image);
  if (provider === 'anthropic')
    request.body = {
      model,
      max_tokens: 4000,
      system: conversationPrompt(conversation),
      messages: conversation.messages.map((message, i) =>
        i === 0
          ? {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: 'image/jpeg', data: image },
                },
                {
                  type: 'text',
                  text: `${contextText(conversation)}\n\nQuestion: ${message.content}`,
                },
              ],
            }
          : message,
      ),
    };
  else if (provider === 'gemini')
    request.body = {
      systemInstruction: { parts: [{ text: conversationPrompt(conversation) }] },
      contents: conversation.messages.map((message, i) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts:
          i === 0
            ? [
                { inlineData: { mimeType: 'image/jpeg', data: image } },
                { text: `${contextText(conversation)}\n\nQuestion: ${message.content}` },
              ]
            : [{ text: message.content }],
      })),
      generationConfig: { maxOutputTokens: 8192 },
    };
  else
    request.body = {
      ...followUpBody(model, image, conversation, true),
      max_completion_tokens: 8000,
      store: false,
    };
  return request;
}
export function cloudChatResult(provider: CloudProvider, data: unknown): string {
  checkProviderResponse(provider, data);
  if (provider === 'anthropic') {
    const result = z
      .object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })) })
      .parse(data);
    return replySchema.parse(
      result.content
        .filter((p) => p.type === 'text')
        .map((p) => p.text || '')
        .join('\n'),
    );
  }
  if (provider === 'gemini') {
    const result = z
      .object({
        candidates: z.array(
          z.object({
            content: z.object({
              parts: z.array(
                z.object({ text: z.string().optional(), thought: z.boolean().optional() }),
              ),
            }),
          }),
        ),
      })
      .parse(data);
    return replySchema.parse(
      result.candidates[0]?.content.parts
        .filter((p) => !p.thought)
        .map((p) => p.text || '')
        .join(''),
    );
  }
  const result = z
    .object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })) })
    .parse(data);
  return replySchema.parse(result.choices[0]?.message.content);
}
type CloudProvider = 'anthropic' | 'openai' | 'gemini';
export function cloudRequest(
  provider: CloudProvider,
  model: string,
  key: string,
  image: string,
): { url: string; headers: Record<string, string>; body: unknown } {
  if (provider === 'anthropic')
    return {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model,
        max_tokens: 8000,
        system: analysisPrompt,
        tools: [
          {
            name: 'record_clues',
            description: 'Record visual evidence.',
            input_schema: z.toJSONSchema(analysisSchema),
          },
        ],
        tool_choice: { type: 'tool', name: 'record_clues' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
              { type: 'text', text: 'Return observations using record_clues.' },
            ],
          },
        ],
      },
    };
  if (provider === 'gemini')
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: {
        systemInstruction: { parts: [{ text: analysisPrompt }] },
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: image } },
              { text: 'Return the visual observations as JSON.' },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
      },
    };
  return {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: { ...chatBody(model, image, true), max_completion_tokens: 12000, store: false },
  };
}
export function cloudResult(provider: CloudProvider, data: unknown) {
  checkProviderResponse(provider, data);
  if (provider === 'anthropic') {
    const result = z
      .object({
        content: z.array(
          z.object({
            type: z.string(),
            name: z.string().optional(),
            input: z.unknown().optional(),
          }),
        ),
      })
      .parse(data);
    return parseAnalysis(
      result.content.find((block) => block.type === 'tool_use' && block.name === 'record_clues')
        ?.input,
    );
  }
  if (provider === 'gemini') {
    const result = z
      .object({
        candidates: z.array(
          z.object({
            content: z.object({
              parts: z.array(
                z.object({ text: z.string().optional(), thought: z.boolean().optional() }),
              ),
            }),
          }),
        ),
      })
      .parse(data);
    return parseAnalysis(
      result.candidates[0]?.content.parts
        .filter((part) => !part.thought)
        .map((part) => part.text || '')
        .join(''),
    );
  }
  const result = z
    .object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })) })
    .parse(data);
  return parseAnalysis(result.choices[0]?.message.content);
}
