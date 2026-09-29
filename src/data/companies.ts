/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Problem } from '../types';

/**
 * Company names that may appear as problem tags. Company Prep and the Arena company filter only show
 * companies that actually tag at least one problem returned by /api/problems.
 */
export const KNOWN_COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Apple', 'Uber', 'Lyft',
  'Airbnb', 'Adobe', 'Twitter', 'Salesforce', 'Bloomberg', 'Atlassian', 'ByteDance',
  'Oracle', 'Intel', 'Cisco', 'Stripe', 'Square', 'PayPal', 'Goldman Sachs',
  'TCS', 'Infosys', 'Wipro', 'Accenture', 'Flipkart', 'Zoho',
] as const;

const companyLookup = new Map<string, string>(KNOWN_COMPANIES.map((name) => [name.toLowerCase(), name]));

/** Returns the canonical company name if the tag is a known company, else null. */
export function companyForTag(tag: string): string | null {
  return companyLookup.get(tag.trim().toLowerCase()) ?? null;
}

/** Groups problems by the company tags they carry, sorted by problem count (desc) then name. */
export function groupProblemsByCompany(problems: Problem[]): Array<{ company: string; problems: Problem[] }> {
  const groups = new Map<string, Problem[]>();
  for (const problem of problems) {
    for (const tag of problem.tags ?? []) {
      const company = companyForTag(tag);
      if (!company) continue;
      const list = groups.get(company) ?? [];
      if (!list.includes(problem)) list.push(problem);
      groups.set(company, list);
    }
  }
  return Array.from(groups.entries())
    .map(([company, list]) => ({ company, problems: list }))
    .sort((a, b) => b.problems.length - a.problems.length || a.company.localeCompare(b.company));
}
