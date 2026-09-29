import type { Difficulty, SubmissionStatus } from '../../types';

export function difficultyBadgeClass(difficulty: Difficulty | string): string {
  switch (difficulty) {
    case 'Easy':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'Medium':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'Hard':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
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
      return 'text-orange-400';
    case 'Compilation Error':
      return 'text-fuchsia-400';
    default:
      return 'text-zinc-300';
  }
}
