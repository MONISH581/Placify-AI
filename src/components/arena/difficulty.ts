import type { Difficulty, SubmissionStatus } from '../../types';

export function difficultyBadgeClass(difficulty: Difficulty | string): string {
  switch (difficulty) {
    case 'Easy':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Medium':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'Hard':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
  }
}

/** Plain coloured text, for dense lists where a badge would add noise. */
export function difficultyTextClass(difficulty: Difficulty | string): string {
  switch (difficulty) {
    case 'Easy':
      return 'text-emerald-400';
    case 'Medium':
      return 'text-amber-400';
    case 'Hard':
      return 'text-rose-400';
    default:
      return 'text-slate-300';
  }
}

export function statusTextClass(status: SubmissionStatus | string): string {
  switch (status) {
    case 'Accepted':
      return 'text-emerald-400';
    case 'Wrong Answer':
      return 'text-rose-400';
    case 'Time Limit Exceeded':
      return 'text-amber-400';
    case 'Runtime Error':
      return 'text-amber-300';
    case 'Compilation Error':
      return 'text-rose-300';
    default:
      return 'text-zinc-300';
  }
}
