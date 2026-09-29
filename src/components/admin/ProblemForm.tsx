import React, { useState } from 'react';
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { ErrorAlert } from '../StatusMessages';
import type { Difficulty, Problem, ProblemExample, ProblemInput, ProblemTestCase } from '../../types';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

interface FormState {
  title: string;
  difficulty: Difficulty;
  tags: string;
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  editorial: string;
  hints: string;
  examples: ProblemExample[];
  testCases: ProblemTestCase[];
}

const EMPTY_EXAMPLE: ProblemExample = { input: '', output: '', explanation: '' };
const EMPTY_TEST: ProblemTestCase = { input: '', expectedOutput: '', isHidden: false };

function toFormState(problem: Problem | null): FormState {
  if (!problem) {
    return {
      title: '',
      difficulty: 'Medium',
      tags: '',
      description: '',
      constraints: '',
      inputFormat: '',
      outputFormat: '',
      editorial: '',
      hints: '',
      examples: [{ ...EMPTY_EXAMPLE }],
      testCases: [{ ...EMPTY_TEST }, { ...EMPTY_TEST, isHidden: true }],
    };
  }
  return {
    title: problem.title,
    difficulty: problem.difficulty,
    tags: (problem.tags ?? []).join(', '),
    description: problem.description ?? '',
    constraints: problem.constraints ?? '',
    inputFormat: problem.inputFormat ?? '',
    outputFormat: problem.outputFormat ?? '',
    editorial: problem.editorial ?? '',
    hints: (problem.hints ?? []).join('\n'),
    examples: (problem.examples ?? []).length > 0 ? problem.examples.map((example) => ({ ...example })) : [{ ...EMPTY_EXAMPLE }],
    // The API never exposes hidden test cases, so editing starts from an empty list (only sent if the admin opts in).
    testCases: [{ ...EMPTY_TEST }],
  };
}

function validate(form: FormState, includeTests: boolean): string[] {
  const errors: string[] = [];
  const title = form.title.trim();
  if (title.length < 3 || title.length > 200) errors.push('Title must be 3-200 characters.');
  if (form.description.trim().length < 10) errors.push('Description must be at least 10 characters.');
  const tags = form.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  if (tags.length > 20) errors.push('Use at most 20 tags.');
  if (tags.some((tag) => tag.length > 60)) errors.push('Each tag must be at most 60 characters.');
  const hints = form.hints.split('\n').map((hint) => hint.trim()).filter(Boolean);
  if (hints.length > 10) errors.push('Use at most 10 hints.');
  if (hints.some((hint) => hint.length > 1000)) errors.push('Each hint must be at most 1000 characters.');
  if (form.examples.length > 20) errors.push('Use at most 20 examples.');
  form.examples.forEach((example, index) => {
    const touched = example.input.trim() || example.output.trim() || (example.explanation ?? '').trim();
    if (touched && (!example.input.trim() || !example.output.trim())) {
      errors.push(`Example ${index + 1} needs both an input and an output.`);
    }
  });
  if (includeTests) {
    if (form.testCases.length === 0) errors.push('Add at least one test case.');
    if (form.testCases.length > 100) errors.push('Use at most 100 test cases.');
    form.testCases.forEach((test, index) => {
      if (!test.expectedOutput.trim()) errors.push(`Test case ${index + 1} needs an expected output.`);
    });
    if (form.testCases.length > 0 && form.testCases.every((test) => test.isHidden)) {
      errors.push('Include at least one visible test case so students can run their code.');
    }
  }
  return errors;
}

function toPayload(form: FormState, includeTests: boolean): ProblemInput {
  const payload: ProblemInput = {
    title: form.title.trim(),
    difficulty: form.difficulty,
    description: form.description.trim(),
    constraints: form.constraints.trim(),
    inputFormat: form.inputFormat.trim(),
    outputFormat: form.outputFormat.trim(),
    editorial: form.editorial.trim(),
    tags: Array.from(new Set(form.tags.split(',').map((tag) => tag.trim()).filter(Boolean))),
    hints: form.hints.split('\n').map((hint) => hint.trim()).filter(Boolean),
    examples: form.examples
      .filter((example) => example.input.trim() && example.output.trim())
      .map((example) => ({
        input: example.input,
        output: example.output,
        ...(example.explanation?.trim() ? { explanation: example.explanation.trim() } : {}),
      })),
  };
  if (includeTests) {
    payload.testCases = form.testCases.map((test) => ({ input: test.input, expectedOutput: test.expectedOutput, isHidden: test.isHidden }));
  }
  return payload;
}

interface ProblemFormProps {
  /** Problem being edited, or null to create a new one. Render with key={problem?.id ?? 'new'}. */
  problem: Problem | null;
  saving: boolean;
  serverError: string | null;
  onSubmit: (payload: ProblemInput) => void;
  onCancel: () => void;
}

const inputClass = 'w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 text-xs text-white outline-none focus:border-cyan-500';
const labelClass = 'mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-400';

export function ProblemForm({ problem, saving, serverError, onSubmit, onCancel }: ProblemFormProps) {
  const isEdit = problem !== null;
  const [form, setForm] = useState<FormState>(() => toFormState(problem));
  const [replaceTests, setReplaceTests] = useState(!isEdit);
  const [errors, setErrors] = useState<string[]>([]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateExample = (index: number, patch: Partial<ProblemExample>) =>
    update('examples', form.examples.map((example, i) => (i === index ? { ...example, ...patch } : example)));
  const updateTest = (index: number, patch: Partial<ProblemTestCase>) =>
    update('testCases', form.testCases.map((test, i) => (i === index ? { ...test, ...patch } : test)));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const validationErrors = validate(form, replaceTests);
    setErrors(validationErrors);
    if (validationErrors.length === 0) onSubmit(toPayload(form, replaceTests));
  };

  const idPrefix = `problem-form-${problem?.id ?? 'new'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-[#161D2F] p-6 shadow-sm" noValidate>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold text-white">{isEdit ? `Edit: ${problem.title}` : 'Create a problem'}</h2>
        {isEdit && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-300 hover:bg-white/5"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label htmlFor={`${idPrefix}-title`} className={labelClass}>
            Title
          </label>
          <input id={`${idPrefix}-title`} value={form.title} maxLength={200} onChange={(e) => update('title', e.target.value)} className={`h-10 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-difficulty`} className={labelClass}>
            Difficulty
          </label>
          <select
            id={`${idPrefix}-difficulty`}
            value={form.difficulty}
            onChange={(e) => update('difficulty', e.target.value as Difficulty)}
            className={`h-10 ${inputClass}`}
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty} className="bg-[#161D2F] text-white">
                {difficulty}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-tags`} className={labelClass}>
          Tags (comma separated; include company names like Google, Amazon)
        </label>
        <input id={`${idPrefix}-tags`} value={form.tags} onChange={(e) => update('tags', e.target.value)} className={`h-10 ${inputClass}`} placeholder="Arrays, Hashing, Google" />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-description`} className={labelClass}>
          Problem statement
        </label>
        <textarea id={`${idPrefix}-description`} value={form.description} onChange={(e) => update('description', e.target.value)} className={`h-32 py-2 ${inputClass}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor={`${idPrefix}-constraints`} className={labelClass}>
            Constraints
          </label>
          <textarea id={`${idPrefix}-constraints`} value={form.constraints} onChange={(e) => update('constraints', e.target.value)} className={`h-20 py-2 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-input-format`} className={labelClass}>
            Input format
          </label>
          <textarea id={`${idPrefix}-input-format`} value={form.inputFormat} onChange={(e) => update('inputFormat', e.target.value)} className={`h-20 py-2 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-output-format`} className={labelClass}>
            Output format
          </label>
          <textarea id={`${idPrefix}-output-format`} value={form.outputFormat} onChange={(e) => update('outputFormat', e.target.value)} className={`h-20 py-2 ${inputClass}`} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelClass}>Examples (shown in the statement)</legend>
        {form.examples.map((example, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="sr-only" htmlFor={`${idPrefix}-ex-${index}-in`}>
              Example {index + 1} input
            </label>
            <textarea id={`${idPrefix}-ex-${index}-in`} placeholder="Input" value={example.input} onChange={(e) => updateExample(index, { input: e.target.value })} className={`h-16 py-2 font-mono ${inputClass}`} />
            <label className="sr-only" htmlFor={`${idPrefix}-ex-${index}-out`}>
              Example {index + 1} output
            </label>
            <textarea id={`${idPrefix}-ex-${index}-out`} placeholder="Output" value={example.output} onChange={(e) => updateExample(index, { output: e.target.value })} className={`h-16 py-2 font-mono ${inputClass}`} />
            <label className="sr-only" htmlFor={`${idPrefix}-ex-${index}-exp`}>
              Example {index + 1} explanation
            </label>
            <textarea id={`${idPrefix}-ex-${index}-exp`} placeholder="Explanation (optional)" value={example.explanation ?? ''} onChange={(e) => updateExample(index, { explanation: e.target.value })} className={`h-16 py-2 ${inputClass}`} />
            <button
              type="button"
              aria-label={`Remove example ${index + 1}`}
              onClick={() => update('examples', form.examples.filter((_, i) => i !== index))}
              className="cursor-pointer self-start rounded-lg p-2 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => update('examples', [...form.examples, { ...EMPTY_EXAMPLE }])}
          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-cyan-300 hover:underline"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add example
        </button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={labelClass}>Judge test cases</legend>
        {isEdit && (
          <label className="flex items-start gap-2 text-[11px] text-amber-200">
            <input type="checkbox" checked={replaceTests} onChange={(e) => setReplaceTests(e.target.checked)} className="mt-0.5" />
            <span>
              Replace all test cases. Hidden test cases are never sent to the browser, so leave this unchecked to keep the
              existing ones.
            </span>
          </label>
        )}
        {replaceTests && (
          <>
            {form.testCases.map((test, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800 p-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <label className="sr-only" htmlFor={`${idPrefix}-tc-${index}-in`}>
                  Test {index + 1} input
                </label>
                <textarea id={`${idPrefix}-tc-${index}-in`} placeholder="Input" value={test.input} onChange={(e) => updateTest(index, { input: e.target.value })} className={`h-16 py-2 font-mono ${inputClass}`} />
                <label className="sr-only" htmlFor={`${idPrefix}-tc-${index}-out`}>
                  Test {index + 1} expected output
                </label>
                <textarea id={`${idPrefix}-tc-${index}-out`} placeholder="Expected output" value={test.expectedOutput} onChange={(e) => updateTest(index, { expectedOutput: e.target.value })} className={`h-16 py-2 font-mono ${inputClass}`} />
                <label className="flex items-center gap-1.5 self-start pt-2 text-[11px] text-zinc-300">
                  <input type="checkbox" checked={test.isHidden} onChange={(e) => updateTest(index, { isHidden: e.target.checked })} />
                  Hidden
                </label>
                <button
                  type="button"
                  aria-label={`Remove test case ${index + 1}`}
                  onClick={() => update('testCases', form.testCases.filter((_, i) => i !== index))}
                  className="cursor-pointer self-start rounded-lg p-2 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => update('testCases', [...form.testCases, { ...EMPTY_TEST }])}
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-cyan-300 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add test case
            </button>
          </>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-hints`} className={labelClass}>
            Hints (one per line, in unlock order)
          </label>
          <textarea id={`${idPrefix}-hints`} value={form.hints} onChange={(e) => update('hints', e.target.value)} className={`h-24 py-2 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-editorial`} className={labelClass}>
            Editorial
          </label>
          <textarea id={`${idPrefix}-editorial`} value={form.editorial} onChange={(e) => update('editorial', e.target.value)} className={`h-24 py-2 ${inputClass}`} />
        </div>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
          <p className="font-bold">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {serverError && <ErrorAlert message={serverError} />}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : isEdit ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create problem'}
      </button>
    </form>
  );
}
