/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  xpValue: number;
  status: 'locked' | 'unlocked' | 'completed';
  challengesCount: number;
  skills: string[];
}

export interface CareerPath {
  id: string;
  title: string;
  role: string;
  icon: string;
  description: string;
  targetCompanies: string[];
  skills: string[];
  gradient: string;
  milestones: RoadmapMilestone[];
}

export const careerPaths: CareerPath[] = [
  {
    id: "faang-sde",
    title: "FAANG SDE Path",
    role: "Computer Scientist & Algorithm Specialist",
    icon: "🎯",
    description: "Master rigorous algorithms, deep graph traversals, dynamic programming bounds, and scalable system components for high-concurrency top tier technical loops.",
    targetCompanies: ["Google", "Amazon", "Meta", "Microsoft", "Netflix", "Apple"],
    skills: ["Data Structures", "Complex Algorithms", "Graphs DFS/BFS", "Dynamic Programming", "Big-O Analysis"],
    gradient: "from-amber-500 via-yellow-400 to-amber-600",
    milestones: [
      {
        id: "faang-m1",
        title: "Milestone 1: Hashing & Slidings",
        description: "Verify index summation, list traversals, and dynamic bounds scaling in dynamic subarrays.",
        xpValue: 150,
        status: "completed",
        challengesCount: 2,
        skills: ["Arrays", "Hashing", "Two Pointers"]
      },
      {
        id: "faang-m2",
        title: "Milestone 2: Dynamic & Graphs",
        description: "Solve Directed Acyclic graph searches, cycle checks, and memoization arrays.",
        xpValue: 200,
        status: "unlocked",
        challengesCount: 4,
        skills: ["DFS/BFS", "Directed Acyclic Graphs", "Recursion", "DP"]
      },
      {
        id: "faang-m3",
        title: "Milestone 3: Advanced Trees & Heaps",
        description: "Evaluate binary trees leaf pathways, heap node balances, and segment query indexing.",
        xpValue: 250,
        status: "locked",
        challengesCount: 3,
        skills: ["Binary Trees", "Priority Queues", "Segment Trees"]
      },
      {
        id: "faang-m4",
        title: "Milestone 4: Large Scale Systems",
        description: "Design LRU caching layers, shard mapping keys, and distributed system configurations.",
        xpValue: 350,
        status: "locked",
        challengesCount: 2,
        skills: ["System Design", "Sharding", "Hashing", "Caches"]
      }
    ]
  },
  {
    id: "frontend-specialist",
    title: "Frontend Architect",
    role: "UI Engineer & Client Orchestrator",
    icon: "✨",
    description: "Focus on React performance, asynchronous microtask loop, dynamic layouts, bundlers, and web asset standard optimizations.",
    targetCompanies: ["Vercel", "Stripe", "Airbnb", "Coinbase", "Figma"],
    skills: ["React JS", "Event Loop", "Tailwind CSS", "DOM Engines", "Web Vitals"],
    gradient: "from-[#DFBA73] to-[#AA7C11]",
    milestones: [
      {
        id: "fe-m1",
        title: "Milestone 1: JS Runtime Internals",
        description: "Analyze dynamic scopes, closures, memory reference pointers, and microtask queues.",
        xpValue: 100,
        status: "completed",
        challengesCount: 3,
        skills: ["Closures", "JS Engine", "Event Loop"]
      },
      {
        id: "fe-m2",
        title: "Milestone 2: React State Rendering",
        description: "Optimize component render bounds, custom hooks closures, and structural state dependencies.",
        xpValue: 180,
        status: "unlocked",
        challengesCount: 3,
        skills: ["React Hooks", "Memoization", "State Optimization"]
      },
      {
        id: "fe-m3",
        title: "Milestone 3: CSS Compilations",
        description: "Master flexible grid dimensions, Tailwind configuration compiles, and native layout triggers.",
        xpValue: 220,
        status: "locked",
        challengesCount: 2,
        skills: ["Flexbox/Grid", "Tailwind CSS", "Box Model"]
      }
    ]
  },
  {
    id: "fullstack-enterprise",
    title: "Fullstack SaaS Lead",
    role: "Fullstack Architect & API Generalist",
    icon: "⚡",
    description: "Orchestrate end-to-end applications from Node.js Express controllers to robust relational schemas, security policies, and cache caches.",
    targetCompanies: ["Salesforce", "Uber", "Atlassian", "Oracle", "Shopify"],
    skills: ["Express.js", "SQL Databases", "REST APIs", "CORS", "WebSockets"],
    gradient: "from-amber-600 via-amber-400 to-[#8A6F27]",
    milestones: [
      {
        id: "fs-m1",
        title: "Milestone 1: Web API Architecture",
        description: "Build robust Express routers, validate request body models, and secure CORS middleware paths.",
        xpValue: 120,
        status: "completed",
        challengesCount: 2,
        skills: ["Express.js", "Middlewares", "HTTP Methods"]
      },
      {
        id: "fs-m2",
        title: "Milestone 2: Database Schema & Normalization",
        description: "Define composite keys, foreign references, indices, and 3NF database normalization.",
        xpValue: 190,
        status: "unlocked",
        challengesCount: 3,
        skills: ["Database Design", "SQL JOINS", "Indexes"]
      },
      {
        id: "fs-m3",
        title: "Milestone 3: High Density Sockets & Cache",
        description: "Implement real-time notification events with WebSockets and in-memory Cache layers.",
        xpValue: 260,
        status: "locked",
        challengesCount: 2,
        skills: ["WebSockets", "Node.js", "Caching"]
      }
    ]
  },
  {
    id: "data-analytics",
    title: "Data Engineer",
    role: "Data Pipelines & Query Optimizer",
    icon: "💎",
    description: "Write highly optimized database multi-joins, build pipeline aggregates, utilize index mappings, and design structured warehouses.",
    targetCompanies: ["Snowflake", "Databricks", "Palantir", "JP Morgan", "Capital One"],
    skills: ["Advanced SQL", "Indexing", "Pandas", "Warehousing", "MapReduce"],
    gradient: "from-yellow-500 through-amber-500 to-yellow-600",
    milestones: [
      {
        id: "data-m1",
        title: "Milestone 1: Advanced Relational Queries",
        description: "Formulate subqueries, window functions, and multi-join relational statements.",
        xpValue: 130,
        status: "completed",
        challengesCount: 3,
        skills: ["SQL Windowing", "Multi-Joins", "Aggregates"]
      },
      {
        id: "data-m2",
        title: "Milestone 2: Index Trees & Query Tuning",
        description: "Implement query plans, evaluate B-Trees execution times, and structure partition indexes.",
        xpValue: 200,
        status: "unlocked",
        challengesCount: 3,
        skills: ["Query Tuning", "execution plan", "B-Tree Index"]
      },
      {
        id: "data-m3",
        title: "Milestone 3: Pipeline Aggregates",
        description: "Formulate MapReduce patterns, Pandas data transform actions, and warehouse schemas.",
        xpValue: 240,
        status: "locked",
        challengesCount: 2,
        skills: ["Pandas", "ETL Pipelines", "Star Schema"]
      }
    ]
  },
  {
    id: "systems",
    title: "Systems Engineer",
    role: "Low Level & OS Core Developer",
    icon: "⚙️",
    description: "Dive into operating system virtualization, memory page segments, multi-thread semaphores, process synchronizations, and hardware levels.",
    targetCompanies: ["NVIDIA", "Intel", "Tesla", "Cloudflare", "Apple"],
    skills: ["Virtual Memory", "Multithreading", "Scheduling", "C++", "Semaphores"],
    gradient: "from-yellow-600 to-amber-500",
    milestones: [
      {
        id: "sys-m1",
        title: "Milestone 1: Pointer Alignments & Heaps",
        description: "Navigate heap memory spaces, trace memory alloc pointers, and prevent leaks.",
        xpValue: 150,
        status: "completed",
        challengesCount: 2,
        skills: ["C/C++ Pointer", "Heap Allocation", "Memory leaks"]
      },
      {
        id: "sys-m2",
        title: "Milestone 2: OS Scheduling Kernels",
        description: "Formulate CPU round-robin slices, trace virtual memory pages, and evaluate cache hit ratios.",
        xpValue: 220,
        status: "unlocked",
        challengesCount: 3,
        skills: ["Round Robin", "Virtual Memory", "Page Swapping"]
      },
      {
        id: "sys-m3",
        title: "Milestone 3: Thread Synchronization & Mutex Tracker",
        description: "Identify race risks, orchestrate thread loops with semaphores, and map lock matrices.",
        xpValue: 300,
        status: "locked",
        challengesCount: 3,
        skills: ["Mutex", "Semaphores", "Concurrency", "Deadlocks"]
      }
    ]
  }
];
