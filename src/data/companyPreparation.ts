/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompanyPrep {
  id: string;
  name: string;
  logo: string;
  bgColor: string;
  questions: { title: string; type: string; difficulty: string }[];
  aptitudeTests: { title: string; questionsCount: number }[];
  experiences: { studentName: string; text: string; rating: string }[];
}

export const companyData: CompanyPrep[] = [
  {
    id: "tcs",
    name: "TCS (Tata Consultancy Services)",
    logo: "💼",
    bgColor: "bg-blue-600/20 text-blue-400 border-blue-500/30",
    questions: [
      { title: "Command Line Arguments in C", type: "Technical MCQ", difficulty: "Easy" },
      { title: "Anagram verification code logic", type: "Coding Practice", difficulty: "Easy" },
      { title: "Standard Deviation calculation formulas", type: "Quantitative Aptitude", difficulty: "Medium" }
    ],
    aptitudeTests: [
      { title: "TCS Ninja Aptitude Mock", questionsCount: 20 },
      { title: "TCS Digital High-tier Numerical Prep", questionsCount: 15 }
    ],
    experiences: [
      { studentName: "Varun K.", text: "Passed TCS Digital. Focus on Advanced Coding; standard arrays/strings, and OOPs concepts was enough.", rating: "★★★★★" },
      { studentName: "Ananya S.", text: "MCQ sections were relatively heavy with probability puzzles. Practice clocks/calendars closely.", rating: "★★★★☆" }
    ]
  },
  {
    id: "infosys",
    name: "Infosys",
    logo: "🏢",
    bgColor: "bg-teal-600/20 text-teal-400 border-teal-500/30",
    questions: [
      { title: "Exception hierarchy in Java OOPs", type: "Technical MCQ", difficulty: "Medium" },
      { title: "Count pair sum equal in list", type: "Coding Practice", difficulty: "Medium" }
    ],
    aptitudeTests: [
      { title: "Infosys InfyTQ Pattern Aptitude", questionsCount: 25 }
    ],
    experiences: [
      { studentName: "Rohan D.", text: "System design basics and Java collections framework are very important.", rating: "★★★★☆" }
    ]
  },
  {
    id: "amazon",
    name: "Amazon",
    logo: "📦",
    bgColor: "bg-orange-600/20 text-orange-400 border-orange-500/30",
    questions: [
      { title: "0/1 Knapsack optimization constraints", type: "Dynamic Programming", difficulty: "Hard" },
      { title: "Top K Frequent Elements in an array", type: "Heap", difficulty: "Medium" },
      { title: "LRU Cache system model design", type: "Trie/Linked List", difficulty: "Hard" }
    ],
    aptitudeTests: [
      { title: "Amazon SDE-1 Assessment Simulator", questionsCount: 30 }
    ],
    experiences: [
      { studentName: "Prathiba M.", text: "Leadership principles are 50% of the game in active behavioral interviews!", rating: "★★★★★" }
    ]
  },
  {
    id: "google",
    name: "Google",
    logo: "🔍",
    bgColor: "bg-red-600/20 text-red-400 border-red-500/30",
    questions: [
      { title: "Longest Path in a Directed Acyclic Graph", type: "Graphs DFS", difficulty: "Hard" },
      { title: "Binary tree maximum path sum matrix", type: "Trees recursion", difficulty: "Hard" }
    ],
    aptitudeTests: [
      { title: "Kick Start Series Practice paper", questionsCount: 10 }
    ],
    experiences: [
      { studentName: "Karthik R.", text: "They test very deep optimization limits. Always state your O(N) constraints upfront.", rating: "★★★★★" }
    ]
  }
];
