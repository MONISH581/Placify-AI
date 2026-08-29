"""
knowledge_builder.py
Reads Placify's learning track content, problem data, and Q&A to build
a text corpus for the RAG pipeline's FAISS vector index.
"""

import os
import json
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_FILE = os.path.join(BASE_DIR, "server-db.json")
RAG_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(RAG_DIR, "knowledge_chunks.json")


# ─────────────────────────────────────────────────────────────────────────────
# Learning Track Content — inlined from learningTracks.ts
# ─────────────────────────────────────────────────────────────────────────────
LEARNING_TRACK_CONTENT = [
    # Python
    {"id": "py-intro", "source": "Python Track", "topic": "Introduction to Python & Setup", "content": "Python is a high-level, interpreted programming language known for readability and simplicity. Setting up requires installing Python from python.org. Use virtual environments (venv) to isolate project dependencies. Python uses indentation for code blocks."},
    {"id": "py-variables", "source": "Python Track", "topic": "Variables and Scope", "content": "Variables in Python are dynamically typed. Local scope exists inside functions. Global scope persists throughout the module. Use the 'global' keyword to modify global variables inside functions. 'nonlocal' modifies enclosing scope variables in nested functions."},
    {"id": "py-datatypes", "source": "Python Track", "topic": "Core Data Types & Casting", "content": "Python has int, float, complex, bool, str, list, tuple, dict, set, frozenset. Use int(), float(), str() for explicit casting. Python auto-converts compatible types. Strings are immutable sequences of Unicode characters."},
    {"id": "py-loops", "source": "Python Track", "topic": "Loops (For, While) & Control", "content": "For loops iterate over iterables. While loops run while condition is True. Break exits loop. Continue skips current iteration. Else block in loops runs when loop completes normally (without break). range() generates number sequences."},
    {"id": "py-functions", "source": "Python Track", "topic": "Functions & Variable Arguments", "content": "Functions are defined with 'def'. *args collects positional arguments as tuple. **kwargs collects keyword arguments as dict. Default parameters are evaluated once at definition. Lambda creates anonymous single-expression functions."},
    {"id": "py-recursion", "source": "Python Track", "topic": "Recursion & Stack Frames", "content": "Recursion calls function within itself. Base case stops recursion. Stack frames accumulate on the call stack. Python default recursion limit is 1000. sys.setrecursionlimit() can increase it. Tail call optimization is NOT done in Python."},
    {"id": "py-oop", "source": "Python Track", "topic": "OOP: Classes, Inheritance, Polymorphism", "content": "Classes are defined with 'class'. __init__ is the constructor. 'self' refers to the instance. Inheritance uses parentheses: class Child(Parent). super() calls parent methods. Python supports multiple inheritance. Method resolution uses MRO (C3 linearization). Polymorphism via duck typing."},
    {"id": "py-decorators", "source": "Python Track", "topic": "Decorators & Closures", "content": "Decorators wrap functions to add behavior without modifying the original. They use @syntax. Closures capture variables from enclosing scope. functools.wraps preserves wrapped function metadata. Common decorators: @property, @staticmethod, @classmethod."},
    {"id": "py-generators", "source": "Python Track", "topic": "Generators & Yield Statement", "content": "Generators produce values lazily using yield. They save memory compared to lists. Generator expressions use () instead of []. yield from delegates to another generator. Generators implement the iterator protocol (__iter__ and __next__)."},
    {"id": "py-async", "source": "Python Track", "topic": "Asyncio & Async Programming", "content": "async def defines a coroutine. await suspends execution until awaitable completes. asyncio.run() starts the event loop. asyncio.gather() runs multiple coroutines concurrently. aiohttp for async HTTP. Do not use blocking calls inside async functions."},
    {"id": "py-ml", "source": "Python Track", "topic": "Machine Learning: Regression & Classification", "content": "scikit-learn provides ML algorithms. Linear regression fits y = mx + b. Logistic regression classifies with sigmoid function. Decision trees split on feature thresholds. Random Forest combines multiple trees. XGBoost uses gradient boosting. train_test_split() divides data. cross_val_score() evaluates with K-fold CV."},

    # DSA
    {"id": "dsa-arrays", "source": "DSA", "topic": "Arrays & Sliding Window", "content": "Arrays store elements contiguously. Sliding window maintains a window of elements, expanding and contracting. Use for subarray problems: max sum, longest substring without repeat. Time complexity O(n). Two pointers technique uses left and right indices moving toward each other."},
    {"id": "dsa-strings", "source": "DSA", "topic": "Strings & Pattern Matching", "content": "Strings are sequences of characters. Common operations: reverse, palindrome check, anagram detection, substring search. KMP algorithm searches pattern in O(n+m). Rabin-Karp uses hashing. Z-algorithm finds all pattern occurrences. Use frequency maps for character counting."},
    {"id": "dsa-linked-list", "source": "DSA", "topic": "Linked Lists", "content": "Singly linked list has nodes with data and next pointer. Doubly linked list has prev and next. Common problems: reverse linked list, detect cycle (Floyd's tortoise and hare), find middle node (slow/fast pointers), merge two sorted lists. Time: O(n) traversal, O(1) insertion at head."},
    {"id": "dsa-stacks", "source": "DSA", "topic": "Stacks & Queues", "content": "Stack is LIFO. Queue is FIFO. Monotonic stack maintains elements in monotone order. Use stack for: balanced parentheses, next greater element, evaluate expressions. Deque supports O(1) operations at both ends. Priority queue (min-heap) extracts minimum in O(log n)."},
    {"id": "dsa-trees", "source": "DSA", "topic": "Binary Trees & BST", "content": "Binary tree: each node has at most two children. BST: left < node < right. Traversals: in-order (LNR) gives sorted output, pre-order (NLR), post-order (LRN). BFS uses queue for level-order. DFS uses recursion or stack. Height, diameter, LCA are classic tree problems."},
    {"id": "dsa-graphs", "source": "DSA", "topic": "Graphs: BFS, DFS, Shortest Path", "content": "Graph: nodes connected by edges. BFS explores level by level using queue. DFS explores depth-first using recursion/stack. Dijkstra finds shortest path in weighted graph with non-negative edges. Bellman-Ford handles negative edges. Floyd-Warshall finds all-pairs shortest paths. Topological sort for DAGs."},
    {"id": "dsa-dp", "source": "DSA", "topic": "Dynamic Programming", "content": "Dynamic programming solves problems by breaking into overlapping subproblems. Memoization (top-down): cache recursive results. Tabulation (bottom-up): fill DP table iteratively. Classic problems: Fibonacci, knapsack 0/1, longest common subsequence, coin change, longest increasing subsequence, edit distance."},
    {"id": "dsa-hashing", "source": "DSA", "topic": "Hashing & Hash Maps", "content": "Hash map provides O(1) average lookup, insert, delete. Collision resolution: chaining (linked lists) or open addressing (linear probing). Common uses: two-sum, group anagrams, frequency count, cache design (LRU uses OrderedDict in Python or HashMap + DoublyLinkedList in Java)."},
    {"id": "dsa-heaps", "source": "DSA", "topic": "Heaps & Priority Queues", "content": "Min-heap: parent <= children. Max-heap: parent >= children. heapq module in Python is a min-heap. Push: O(log n). Pop: O(log n). Build heap: O(n). Use for: K largest elements, K smallest, median maintenance (two heaps), Dijkstra's algorithm, task scheduling."},
    {"id": "dsa-backtracking", "source": "DSA", "topic": "Backtracking", "content": "Backtracking explores all possibilities, pruning invalid paths. Template: choose, explore, un-choose. Use for: N-Queens, permutations, combinations, subsets, sudoku solver, word search on grid. Time often O(n!) or O(2^n) but pruning helps. Visualize as a decision tree."},
    {"id": "dsa-binary-search", "source": "DSA", "topic": "Binary Search", "content": "Binary search requires sorted array. Bisect left/right find insertion points. Template: lo=0, hi=n-1, while lo<=hi: mid=(lo+hi)//2. Search space reduction: apply binary search on answer (monotonic functions). Common: search rotated array, find peak element, minimum in rotated array."},
    {"id": "dsa-sorting", "source": "DSA", "topic": "Sorting Algorithms", "content": "Comparison sorts: QuickSort O(n log n) avg, MergeSort O(n log n) stable, HeapSort O(n log n). Non-comparison: CountingSort O(n+k), RadixSort O(nk). Python's sort is Timsort (stable, O(n log n)). QuickSort pivot selection affects performance (choose median of three)."},
    {"id": "dsa-tries", "source": "DSA", "topic": "Tries (Prefix Trees)", "content": "Trie stores strings character by character. Each node represents a character. Insert: O(m) where m=string length. Search: O(m). Space: O(ALPHABET_SIZE * m * n). Use for: autocomplete, spell check, IP routing, word prefix problems. Compressed trie (Radix Tree) merges single-child nodes."},
    {"id": "dsa-segment-trees", "source": "DSA", "topic": "Segment Trees & Fenwick Trees", "content": "Segment tree supports range queries and point updates in O(log n). Build: O(n). Query and Update: O(log n). Use for: range sum, range minimum/maximum, range GCD. Fenwick tree (BIT) simpler for prefix sums. Lazy propagation extends segment trees to range updates."},
    {"id": "dsa-bit", "source": "DSA", "topic": "Bit Manipulation", "content": "AND (&), OR (|), XOR (^), NOT (~), left shift (<<), right shift (>>). XOR: a^a=0, a^0=a. Find single number in array. Count set bits: Brian Kernighan's algorithm. Check bit i: n & (1<<i). Set bit: n | (1<<i). Clear bit: n & ~(1<<i). Power of 2: n & (n-1) == 0."},

    # System Design
    {"id": "sys-cache", "source": "System Design", "topic": "Caching & Redis", "content": "Cache stores frequently accessed data in fast storage. Cache hit: data found. Cache miss: load from DB, store in cache. Eviction policies: LRU (least recently used), LFU (least frequently used), FIFO. Redis supports strings, hashes, lists, sets, sorted sets. TTL (time-to-live) auto-expires keys."},
    {"id": "sys-load-balancer", "source": "System Design", "topic": "Load Balancers & Scaling", "content": "Load balancer distributes traffic across servers. Algorithms: round robin, least connections, IP hash. Horizontal scaling adds more servers. Vertical scaling upgrades existing server. Stateless servers enable easy horizontal scaling. Sticky sessions route user to same server. CDN caches static content near users."},
    {"id": "sys-db-design", "source": "System Design", "topic": "Database Design & Sharding", "content": "Normalization reduces redundancy (1NF, 2NF, 3NF). Denormalization improves read performance. Sharding splits data across multiple DBs by shard key. Consistent hashing minimizes resharding. Replication copies data to replicas for read scaling and fault tolerance. CQRS separates read and write models."},
    {"id": "sys-api", "source": "System Design", "topic": "API Design & REST", "content": "REST APIs use HTTP methods: GET (read), POST (create), PUT/PATCH (update), DELETE. Stateless: each request contains all needed info. JSON is standard format. Rate limiting prevents abuse. API versioning via URL (/v1/) or headers. Pagination with cursor or offset. GraphQL allows clients to specify required fields."},
    {"id": "sys-messaging", "source": "System Design", "topic": "Message Queues & Event-Driven Systems", "content": "Message queues (Kafka, RabbitMQ) decouple producers and consumers. Topics in Kafka are partitioned for parallelism. Consumers in groups share partition workload. At-least-once vs exactly-once delivery. Event sourcing stores state as sequence of events. CQRS reads from projection, writes to event log."},

    # Interview Tips
    {"id": "interview-coding", "source": "Interview Tips", "topic": "Coding Interview Strategy", "content": "Clarify the problem before coding. Discuss edge cases. Start with brute force, then optimize. Think aloud. Analyze time and space complexity. Write clean code with meaningful variable names. Test with examples. Practice on LeetCode, HackerRank, Codeforces. Common patterns: two pointers, sliding window, BFS/DFS, DP."},
    {"id": "interview-hr", "source": "Interview Tips", "topic": "HR Interview Preparation", "content": "Tell me about yourself: structure as background + achievements + future goals. STAR method: Situation, Task, Action, Result for behavioral questions. Research the company and role. Prepare questions to ask the interviewer. Common: Why this company? Tell me about a challenge. Describe a conflict and how you resolved it."},
    {"id": "interview-system-design", "source": "Interview Tips", "topic": "System Design Interview", "content": "Framework: Clarify requirements → Estimate scale → API design → Data model → High-level design → Deep dive → Discuss trade-offs. Know CAP theorem. Common designs: URL shortener, chat system, Twitter, Netflix, Uber, rate limiter. Study Grokking the System Design Interview."},
    {"id": "interview-resume", "source": "Interview Tips", "topic": "Resume & ATS Optimization", "content": "Use action verbs: built, designed, optimized, reduced, implemented. Quantify impact: 'Reduced load time by 40%'. Include links to GitHub and projects. ATS-friendly: use standard section names, avoid tables/graphics. Tailor resume keywords to job description. Keep to 1 page for freshers."},

    # Company-Specific
    {"id": "company-tcs", "source": "Company Prep", "topic": "TCS Ninja/Digital Preparation", "content": "TCS Ninja: verbal ability, quantitative aptitude, programming logic, coding (easy-medium). TCS Digital: advanced coding, advanced aptitude, communication assessment, technical interview. Focus on: Java/Python basics, DBMS concepts, OS fundamentals, OOPS, SQL queries. Practice on TCS iON platform."},
    {"id": "company-infosys", "source": "Company Prep", "topic": "Infosys Preparation", "content": "Infosys InfyTQ: online assessment includes reasoning, math, verbal, coding. Focus on: coding in Java/Python, pseudocode analysis, logical reasoning puzzles. Technical interview covers DSA basics, DBMS SQL, OS, project discussion. HR round: standard behavioral questions."},
    {"id": "company-wipro", "source": "Company Prep", "topic": "Wipro ELITE Preparation", "content": "Wipro ELITE: online test with reasoning, English, quant, coding (2 problems). Problems are usually easy-medium. Technical interview covers OOPs, DBMS, OS, CN, and one project. HR round: standard questions about yourself, teamwork, strengths. Wipro values communication skills."},
    {"id": "company-google", "source": "Company Prep", "topic": "Google SWE Interview Preparation", "content": "Google interviews: phone screen + 4-5 onsite rounds. Focus: algorithms, data structures, system design (senior), coding. Problems are medium-hard LeetCode level. Think aloud, discuss time/space complexity. System design: discuss trade-offs. Google values correctness, efficiency, and communication. Practice with Google's interview guide."},
    {"id": "company-amazon", "source": "Company Prep", "topic": "Amazon SDE Interview Preparation", "content": "Amazon: 14 Leadership Principles are core to behavioral interviews. OLP questions use STAR format. Coding: 2 rounds of DSA (medium-hard). System design: 1 round. Use OLPs in behavioral answers: ownership, customer obsession, deliver results. Bar raiser round evaluates overall fit. Practice Amazon's leadership principles."},
    {"id": "company-microsoft", "source": "Company Prep", "topic": "Microsoft SWE Interview Preparation", "content": "Microsoft interviews: 4-5 rounds of coding + design + behavioral. Focus on problem-solving, code quality, and communication. Medium-hard DSA questions. System design for senior roles. Behavioral around teamwork and dealing with ambiguity. Final round with 'As Appropriate' (AA) person assesses cross-group collaboration."},
]


def build_knowledge_chunks() -> list:
    """
    Combine built-in learning content with DB problems/discussions.
    Returns list of {"id": ..., "text": ..., "source": ..., "topic": ...}
    """
    chunks = []

    # Built-in learning track content
    for item in LEARNING_TRACK_CONTENT:
        chunks.append({
            "id": item["id"],
            "text": f"[{item['source']}] {item['topic']}: {item['content']}",
            "source": item["source"],
            "topic": item["topic"]
        })

    # DB problems: editorials + hints
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            db = json.load(f)

        # Problem hints and editorials
        for prob in db.get("problems", [])[:150]:  # Limit to first 150 for index size
            pid = prob.get("id", "unknown")
            title = prob.get("title", "")
            desc = prob.get("description", "")
            tags = " ".join(prob.get("tags", []))
            hints = " | ".join(prob.get("hints", []))
            editorial = prob.get("editorial", "")
            diff = prob.get("difficulty", "")

            if editorial or hints:
                text = f"[Problem: {title} ({diff})] Tags: {tags}. {desc[:200]} Hints: {hints}. Editorial: {editorial}"
                chunks.append({
                    "id": f"prob-{pid}",
                    "text": text.strip(),
                    "source": "Problem Bank",
                    "topic": f"{title} ({diff})"
                })

        # Discussions
        for disc in db.get("discussions", []):
            did = disc.get("id", "unknown")
            title = disc.get("title", "")
            content = disc.get("content", "")
            if title and content:
                chunks.append({
                    "id": f"disc-{did}",
                    "text": f"[Discussion: {title}] {content}",
                    "source": "Community Discussion",
                    "topic": title
                })
    else:
        print(f"[KnowledgeBuilder] server-db.json not found, using only built-in content.")

    print(f"[KnowledgeBuilder] Total knowledge chunks: {len(chunks)}")
    return chunks


def save_chunks(chunks: list) -> str:
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)
    print(f"[KnowledgeBuilder] Saved {len(chunks)} chunks → {OUT_FILE}")
    return OUT_FILE


if __name__ == "__main__":
    chunks = build_knowledge_chunks()
    save_chunks(chunks)
