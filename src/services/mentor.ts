import { api, type ApiResult } from './api';
import type { ChatTurn, MentorResponse, MentorSource } from '../types';

/** The contract allows at most 10 history turns. */
const MAX_HISTORY_TURNS = 10;
/** Defensive cap on each history entry so a long answer cannot make the request invalid. */
const MAX_HISTORY_CHARS = 2000;
/** Node waits up to 20s for the ML mentor route. */
const MENTOR_TIMEOUT_MS = 25_000;

export function buildChatHistory(turns: ChatTurn[]): ChatTurn[] {
  return turns
    .filter((turn) => turn.content.trim().length > 0)
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, MAX_HISTORY_CHARS) }));
}

function normalizeSources(raw: unknown): MentorSource[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): MentorSource | null => {
      if (typeof item === 'string') return { source: item };
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        const source = typeof record.source === 'string' ? record.source : typeof record.title === 'string' ? record.title : null;
        if (!source) return null;
        return {
          source,
          topic: typeof record.topic === 'string' ? record.topic : undefined,
          relevance: typeof record.relevance === 'number' ? record.relevance : undefined,
        };
      }
      return null;
    })
    .filter((item): item is MentorSource => item !== null);
}

export async function askMentor(question: string, history: ChatTurn[]): Promise<ApiResult<MentorResponse>> {
  const result = await api.post<MentorResponse>(
    '/api/mentor/ask',
    { question, chatHistory: buildChatHistory(history) },
    { timeoutMs: MENTOR_TIMEOUT_MS },
  );
  if (!result.ok) return result;
  if (typeof result.data?.text !== 'string') {
    return { ok: false, status: result.status, error: 'The mentor returned an empty answer. Please try again.' };
  }
  return {
    ...result,
    data: {
      text: result.data.text,
      sources: normalizeSources(result.data.sources),
      source: result.data.source === 'ml' ? 'ml' : 'fallback',
    },
  };
}
