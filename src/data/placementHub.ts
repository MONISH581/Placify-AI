/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubjectModule {
  id: string;
  title: string;
  icon: string;
  notes: string;
  cards: { front: string; back: string }[];
  mcqs: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
}

export const placementSubjects: SubjectModule[] = [
  {
    id: "os",
    title: "Operating Systems",
    icon: "Layers",
    notes: "An Operating System (OS) is software that manages computer hardware. Key concepts: process execution threads, scheduling, deadlocks, virtualization memory paging, and concurrency controls.\n\nA CPU Scheduler picks processes from the Ready queue according to policies (FIFO, Round-Robin, Shortest Job First, Priority).",
    cards: [
      { front: "What is virtual memory?", back: "A memory management capability that provides an illusion of a large chunk of sequential physical RAM by loading pages in/out of secondary storage disks." },
      { front: "What are the four conditions for Deadlock?", back: "Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait (Coffman conditions)." }
    ],
    mcqs: [
      {
        question: "Which of the following schemes prevents deadlocks?",
        options: ["SJF Scheduling", "Banker's Algorithm", "Semaphore Locks", "Page Substitution"],
        answerIndex: 1,
        explanation: "Banker's Algorithm checks a safe state boundary to allocate resources and carefully avoid deadlock conditions."
      }
    ]
  },
  {
    id: "dbms",
    title: "Database Management (DBMS)",
    icon: "Database",
    notes: "DBMS organizes structured records. Key concepts: Relational calculus, Schema constraints, Transactions, ACID rules (Atomicity, Consistency, Isolation, Durability), and normalization patterns (1NF, 2NF, 3NF, BCNF).",
    cards: [
      { front: "What is an ACID system?", back: "Atomicity (all or nothing), Consistency (preserves rules), Isolation (independent transactions), and Durability (survives system crashes)." },
      { front: "What is 3NF (Third Normal Form)?", back: "An entity is in 3NF if it is in 2NF, and no non-prime attribute is transitively dependent on any candidate key." }
    ],
    mcqs: [
      {
        question: "What transaction property ensures that a transaction is saved permanently?",
        options: ["Atomicity", "Consistency", "Isolation", "Durability"],
        answerIndex: 3,
        explanation: "Durability guarantees that once a transaction commits, its modifications survive potential power loss or system malfunctions."
      }
    ]
  },
  {
    id: "networks",
    title: "Computer Networks",
    icon: "Network",
    notes: "Computer Networks route bits between addresses. The OSI Reference model separates concerns into 7 Layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.\n\nTCP (Transmission Control Protocol) is Connection-oriented and uses a 3-way handshake, while UDP (User Datagram Protocol) is speculative/connectionless.",
    cards: [
      { front: "What is 3-Way Handshake in TCP?", back: "It sets up connection parameters via SYN, SYN-ACK, and final ACK packets." },
      { front: "What is DNS (Domain Name System)?", back: "The distributed directory service translating human-readable strings (e.g. google.com) into raw numeric IPv4/IPv6 addresses." }
    ],
    mcqs: [
      {
        question: "Which Layer handles IP packet routing across network hops?",
        options: ["Data Link Layer", "Physical Layer", "Network Layer", "Transport Layer"],
        answerIndex: 2,
        explanation: "The Network Layer manages internet addressing, dynamic routing tables, and IP delivery channels."
      }
    ]
  },
  {
    id: "sql",
    title: "Structured SQL",
    icon: "FileText",
    notes: "SQL queries structured data. Vital commands: SELECT, INSERT, UPDATE, DELETE. Joins blend tables on target matching parameters: INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN.\n\nAggregate aggregation operations require GROUP BY and HAVING filters.",
    cards: [
      { front: "What is the difference between WHERE and HAVING?", back: "WHERE filters rows before groups are formed. HAVING filters group aggregates computed post group clustering." },
      { front: "What is SQL injection?", back: "A security vulnerability where attackers append raw database command strings inside input variables to run unwanted queries." }
    ],
    mcqs: [
      {
        question: "Which JOIN returns all records when there is a match in either left or right table?",
        options: ["INNER JOIN", "LEFT JOIN", "FULL OUTER JOIN", "CROSS JOIN"],
        answerIndex: 2,
        explanation: "FULL OUTER JOIN merges all candidate relations, yielding NULL blanks on non-matching parameters."
      }
    ]
  },
  {
    id: "aptitude",
    title: "Quantitative Aptitude",
    icon: "Percent",
    notes: "Aptitude assessments screen candidates for analytical precision. Hot topic subsets: Percentages, Profit and Loss, Speed, Time and Distance, Permutations/Combinations, Ratios, Clocks, Calendar, and Logical syllogisms.",
    cards: [
      { front: "Formula for Relative speed when two bodies move in opposite directions?", back: "Relative Speed = Speed A + Speed B (Sum of their individual uniform velocity limits)." },
      { front: "Relation between LCM and HCF of two numbers A and B?", back: "A * B = LCM(A, B) * HCF(A, B) (The product of numbers always equals product of their metrics)." }
    ],
    mcqs: [
      {
        question: "A train running at 54 km/hr clears a telephone post in 10 seconds. Find the length of the train.",
        options: ["100 meters", "140 meters", "150 meters", "180 meters"],
        answerIndex: 2,
        explanation: "54 km/hr is 54 * (5/18) = 15 m/sec. Distance (length) = Speed * Time = 15 * 10 = 150 meters."
      }
    ]
  }
];
