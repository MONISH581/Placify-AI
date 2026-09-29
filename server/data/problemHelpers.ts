/**
 * Shared types and helpers for problem-bank definitions (server/data/problemBank.ts and server/data/problems/*).
 */

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface SeedTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface SeedProblem {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  examples: { input: string; output: string; explanation?: string }[];
  testCases: SeedTestCase[];
  hints: string[];
  editorial: string;
  solutions: { javascript: string; python: string; java: string; cpp: string; c: string };
}

export type ProblemSpec = Omit<SeedProblem, "id" | "category" | "tags" | "solutions"> & {
  solutions: { javascript: string; python: string; java?: string; cpp?: string; c?: string };
};

/** Removes the common indentation of a template literal and the surrounding blank lines. */
export function dedent(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  return lines.map((l) => l.slice(indent)).join("\n") + "\n";
}

/**
 * Tag for source-code blocks: keeps backslashes verbatim (String.raw semantics) and dedents the literal
 * text BEFORE interpolating shared snippets, so multi-line snippets (e.g. Python helpers) keep valid indentation.
 */
export const code = (strings: TemplateStringsArray, ...values: unknown[]) => {
  const PLACEHOLDER = "\u0000";
  let index = 0;
  return dedent(strings.raw.join(PLACEHOLDER)).replace(/\u0000/g, () => String(values[index++]));
};

export const JS_BUILD_TREE = `function buildTree(tokens) {
  if (!tokens.length || tokens[0] === "null") return null;
  const root = { val: Number(tokens[0]), left: null, right: null };
  const queue = [root];
  let qi = 0;
  let i = 1;
  while (qi < queue.length && i < tokens.length) {
    const node = queue[qi++];
    if (i < tokens.length && tokens[i] !== "null") {
      node.left = { val: Number(tokens[i]), left: null, right: null };
      queue.push(node.left);
    }
    i++;
    if (i < tokens.length && tokens[i] !== "null") {
      node.right = { val: Number(tokens[i]), left: null, right: null };
      queue.push(node.right);
    }
    i++;
  }
  return root;
}`;

export const PY_BUILD_TREE = `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def build_tree(tokens):
    if not tokens or tokens[0] == "null":
        return None
    root = TreeNode(int(tokens[0]))
    queue = [root]
    qi, i = 0, 1
    while qi < len(queue) and i < len(tokens):
        node = queue[qi]
        qi += 1
        if i < len(tokens) and tokens[i] != "null":
            node.left = TreeNode(int(tokens[i]))
            queue.append(node.left)
        i += 1
        if i < len(tokens) and tokens[i] != "null":
            node.right = TreeNode(int(tokens[i]))
            queue.append(node.right)
        i += 1
    return root`;

export const TREE_INPUT_NOTE =
  "Trees are given in level order (like LeetCode): values separated by spaces, with `null` marking a missing child.";
