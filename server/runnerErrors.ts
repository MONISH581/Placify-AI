/** Thrown when no runner can execute the requested language (maps to HTTP 503). */
export class RunnerUnavailableError extends Error {}

/** Thrown when the runner itself failed (Judge0 / Docker down, spawn failure...). Maps to HTTP 503. */
export class RunnerFailureError extends Error {}
