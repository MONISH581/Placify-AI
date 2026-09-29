import { useState } from 'react';
import { CheckCircle, Info, Loader2 } from 'lucide-react';
import { api, describeApiError } from '../../services/api';
import { renderInline } from '../../utils/inlineMarkdown';
import { ErrorAlert } from '../StatusMessages';
import type { TopicCompletionResponse, TopicQuiz, User } from '../../types';

/** Minimum quiz score (percent) the server requires to complete a topic. */
export const PASSING_SCORE = 60;

type Completion =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'done'; xpEarned: number; alreadyCompleted: boolean }
  | { state: 'error'; message: string };

interface TopicQuizPanelProps {
  trackId: string;
  topicId: string;
  quizzes: TopicQuiz[];
  alreadyCompleted: boolean;
  onCompleted: (user: User) => void;
}

/** Checkpoint quiz. Render with key per topic so answers reset when the topic changes. */
export function TopicQuizPanel({ trackId, topicId, quizzes, alreadyCompleted, onCompleted }: TopicQuizPanelProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [completion, setCompletion] = useState<Completion>({ state: 'idle' });

  const total = quizzes.length;
  const correct = quizzes.reduce((sum, quiz, index) => sum + (answers[index] === quiz.answerIndex ? 1 : 0), 0);
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const allAnswered = total > 0 && quizzes.every((_, index) => answers[index] !== undefined);

  const saveCompletion = async (quizScore: number) => {
    setCompletion({ state: 'saving' });
    const result = await api.post<TopicCompletionResponse>(
      `/api/learning-tracks/${encodeURIComponent(trackId)}/topics/${encodeURIComponent(topicId)}/complete`,
      { quizScore },
    );
    if (result.ok && result.data?.user) {
      setCompletion({
        state: 'done',
        xpEarned: Number(result.data.xpEarned) || 0,
        alreadyCompleted: Boolean(result.data.alreadyCompleted),
      });
      onCompleted(result.data.user);
    } else {
      setCompletion({ state: 'error', message: result.ok ? 'Unexpected response from the server.' : describeApiError(result) });
    }
  };

  const handleSubmit = () => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    if (percent >= PASSING_SCORE) void saveCompletion(percent);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    if (completion.state !== 'done') setCompletion({ state: 'idle' });
  };

  if (total === 0) {
    return <p className="text-xs italic text-slate-400">No checkpoint quiz is available for this topic.</p>;
  }

  return (
    <div className="space-y-6" id="quiz-tab-view">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Topic checkpoint</h3>
        <div className="flex items-center gap-2">
          {alreadyCompleted && (
            <span className="flex items-center gap-1 rounded border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-300">
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Completed
            </span>
          )}
          {submitted && (
            <span className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-300">
              SCORE: {correct} / {total} ({percent}%)
            </span>
          )}
        </div>
      </div>

      {quizzes.map((quiz, qIndex) => {
        const chosen = answers[qIndex];
        return (
          <fieldset key={qIndex} className="space-y-4 border-b border-slate-800 pb-6 last:border-0 last:pb-0" id={`quiz-q-${qIndex}`}>
            <legend className="mb-3 text-[13px] font-bold leading-normal text-white">
              Q{qIndex + 1}: {renderInline(quiz.question)}
            </legend>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {quiz.options.map((option, oIndex) => {
                const isChosen = chosen === oIndex;
                const isCorrect = oIndex === quiz.answerIndex;
                let style = 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:text-white';
                if (submitted) {
                  if (isCorrect) style = 'bg-cyan-950/40 border-cyan-500 text-cyan-300 font-semibold';
                  else if (isChosen) style = 'bg-red-950/40 border-red-500 text-red-300';
                } else if (isChosen) {
                  style = 'bg-indigo-950/50 border-indigo-500 text-indigo-200 font-semibold';
                }
                return (
                  <button
                    type="button"
                    key={oIndex}
                    disabled={submitted}
                    aria-pressed={isChosen}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }))}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-left text-[13px] transition disabled:cursor-default ${style}`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-950/80 text-[10px] font-bold">
                      {String.fromCharCode(65 + oIndex)}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {submitted && quiz.explanation && (
              <div className="flex items-start gap-2 rounded-lg border border-slate-900 bg-slate-950/80 p-3 text-[12px] leading-normal text-slate-200">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                <p>{renderInline(quiz.explanation)}</p>
              </div>
            )}
          </fieldset>
        );
      })}

      <div className="space-y-3 border-t border-slate-800 pt-4" aria-live="polite">
        {submitted && percent < PASSING_SCORE && (
          <p className="text-xs text-amber-300">
            You need at least {PASSING_SCORE}% to complete this topic. Review the explanations and try again.
          </p>
        )}
        {completion.state === 'saving' && (
          <p className="flex items-center gap-2 text-xs text-cyan-300" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Saving your progress...
          </p>
        )}
        {completion.state === 'done' && (
          <p className="text-xs font-bold text-emerald-300">
            {completion.alreadyCompleted
              ? 'You already completed this topic earlier, so no additional XP was awarded.'
              : completion.xpEarned > 0
                ? `Topic completed! +${completion.xpEarned} XP`
                : 'Topic completed!'}
          </p>
        )}
        {completion.state === 'error' && (
          <ErrorAlert message={`Could not save completion: ${completion.message}`} onRetry={() => void saveCompletion(percent)} />
        )}

        <div className="flex items-center justify-end gap-2">
          {submitted ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={completion.state === 'saving'}
              className="cursor-pointer rounded-lg bg-slate-800 px-5 py-2 font-mono text-xs font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
            >
              Retake quiz
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2 font-mono text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allAnswered ? 'Submit quiz' : `Answer all ${total} questions`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
