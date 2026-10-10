/**
 * Static (non-AI) learning-topic content, used when GEMINI_API_KEY is not configured or generation fails.
 * Produces the same payload shape as the Gemini curriculum generator in server/routes/learning.ts.
 */

export interface TopicPayload {
  name: string;
  theory: string;
  visualExplanation: string;
  codeExamples: { title: string; code: string }[];
  practiceQuestions: string[];
  codingChallenges: { title: string; description: string; starterCode: string }[];
  quizzes: { question: string; options: string[]; answerIndex: number; explanation: string }[];
  interviewQuestions: { question: string; answer: string }[];
}

export function getDynamicTopicPayload(trackId: string, _topicId: string, topicName: string): TopicPayload {
  const isPython = trackId === 'python';
  const isJava = trackId === 'java';
  const isCpp = trackId === 'cpp';
  const isC = trackId === 'c';
  const isJs = trackId === 'javascript';

  const nameLower = topicName.toLowerCase();
  
  let conceptType = 'general';
  if (nameLower.includes('pointer') || nameLower.includes('address') || nameLower.includes('malloc') || nameLower.includes('free') || nameLower.includes('reference')) {
    conceptType = 'pointers_memory';
  } else if (nameLower.includes('oop') || nameLower.includes('class') || nameLower.includes('object') || nameLower.includes('inheritance') || nameLower.includes('polymorphism') || nameLower.includes('encapsulation') || nameLower.includes('abstraction') || nameLower.includes('interface') || nameLower.includes('constructor') || nameLower.includes('decorator') || nameLower.includes('dunder') || nameLower.includes('magic')) {
    conceptType = 'oop';
  } else if (nameLower.includes('thread') || nameLower.includes('gil') || nameLower.includes('async') || nameLower.includes('promise') || nameLower.includes('concurrency') || nameLower.includes('multiprocessing') || nameLower.includes('event loop') || nameLower.includes('callback')) {
    conceptType = 'concurrency';
  } else if (nameLower.includes('array') || nameLower.includes('string') || nameLower.includes('list') || nameLower.includes('tuple') || nameLower.includes('dict') || nameLower.includes('set') || nameLower.includes('hash') || nameLower.includes('collection') || nameLower.includes('stack') || nameLower.includes('queue') || nameLower.includes('tree') || nameLower.includes('graph') || nameLower.includes('heap') || nameLower.includes('bst')) {
    conceptType = 'data_structures';
  } else if (nameLower.includes('loop') || nameLower.includes('conditional') || nameLower.includes('if') || nameLower.includes('while') || nameLower.includes('for') || nameLower.includes('statement') || nameLower.includes('operator') || nameLower.includes('variable') || nameLower.includes('scope') || nameLower.includes('context') || nameLower.includes('basics') || nameLower.includes('intro') || nameLower.includes('setup') || nameLower.includes('cast') || nameLower.includes('type') || nameLower.includes('io') || nameLower.includes('input') || nameLower.includes('output') || nameLower.includes('format')) {
    conceptType = 'control_flow';
  } else if (nameLower.includes('api') || nameLower.includes('rest') || nameLower.includes('scraping') || nameLower.includes('numpy') || nameLower.includes('pandas') || nameLower.includes('eda') || nameLower.includes('machine learning') || nameLower.includes('ml') || nameLower.includes('pattern') || nameLower.includes('trie') || nameLower.includes('segment') || nameLower.includes('algorithm') || nameLower.includes('search') || nameLower.includes('sort')) {
    conceptType = 'advanced';
  }

  const langLabel = isPython ? 'Python' : isJava ? 'Java' : isCpp ? 'C++' : isC ? 'C' : 'JavaScript';

  let theory = `In this module, we explore the core principles of **${topicName}** within the context of **${langLabel}** development. Understanding how this concept affects runtime behaviors, memory structures, and architectural styles is vital for engineering high-performance systems. We discuss the syntax, execution lifecycles, common traps, and corporate SDE requirements.`;
  if (conceptType === 'pointers_memory') {
    theory = `**Pointers, addresses, and memory management** form the foundation of systems architectures and execution runtime environments. In low-level scopes, a variable represents a direct mapping to a physical RAM address, allowing direct dereferencing and memory updates. Runtimes manage this utilizing stack frames for local primitives and heap segments for dynamic structures. Let's study how this functions in **${langLabel}**.`;
  } else if (conceptType === 'oop') {
    theory = `**Object-Oriented Programming (OOP)** is a software engineering paradigm that organizes code into objects representing real-world components. In **${langLabel}**, class blueprints govern how data fields (attributes) and functional methods (behaviors) are packaged together. Understanding the core pillars—encapsulation, inheritance, polymorphism, and abstraction—is crucial for scale.`;
  } else if (conceptType === 'concurrency') {
    theory = `**Concurrency, asynchronous executions, and multithreading** govern how application engines handle simultaneous operations. Runtimes achieve parallelism either through process isolation or thread interleaving, governed by runtime limits (e.g., Python's GIL or the JS single-threaded Event Loop). Let's review the concurrency models in **${langLabel}**.`;
  } else if (conceptType === 'data_structures') {
    theory = `**Data Structures** serve as specialized repositories for organizing, caching, and retrieving data elements efficiently. In **${langLabel}**, primitive collections (like sequences, associative arrays, and binary trees) have distinct memory layouts and access complexities. Choosing the correct structure directly affects time and space constraints.`;
  } else if (conceptType === 'control_flow') {
    theory = `**Control flow, conditions, scopes, and variable bindings** dictate the execution paths of a program. Conditionals direct branching logic based on boolean criteria, while loops manage execution repetition. Understanding variable scopes, lifetimes, and type bounds ensures clean, error-free program compilation and execution.`;
  } else if (conceptType === 'advanced') {
    theory = `**Advanced software patterns and computational engineering tools** are crucial for designing high-fidelity applications. This covers API routing, scraping systems, data frames wrangling (NumPy/Pandas), machine learning models, and complex data structures (like tries and segment trees) implemented in **${langLabel}**.`;
  }

  let visualExplanation = `+-------------------------------------------------------------+\n|                   ${topicName} Flow                      |\n+-------------------------------------------------------------+\n|  [Initialize]  -->  [Process Elements]  -->  [Final Output] |\n+-------------------------------------------------------------+`;
  if (conceptType === 'pointers_memory') {
    visualExplanation = `+--------------------------------------------------------+\n|              Memory Stack vs Heap Allocation           |\n+--------------------------------------------------------+\n|  [Stack Frame]                                         |\n|   - ptrVar  (Value: 0x7ffd98) -------------------+     |\n|                                                  |     |\n|  [Heap Segment]                                  |     |\n|   - Memory Address: 0x7ffd98                     |     |\n|   - Data Block: [ Heap allocated Object/Value ] <-+     |\n+--------------------------------------------------------+`;
  } else if (conceptType === 'oop') {
    visualExplanation = `+--------------------------------------------------------+\n|             OOP Blueprint Instantiation Flow           |\n+--------------------------------------------------------+\n|  [Class Blueprint: Fields & Methods]                   |\n|                     |                                  |\n|               (Instantiate)                            |\n|                     v                                  |\n|  [Heap Instance: unique attributes & prototype link]   |\n+--------------------------------------------------------+`;
  } else if (conceptType === 'concurrency') {
    visualExplanation = `+--------------------------------------------------------+\n|              Asynchronous Event Loop Cycle             |\n+--------------------------------------------------------+\n| [Call Stack] ----> [Async API Request / System Call]   |\n|      ^                           | (Resolves)          |\n|      |                           v                     |\n| [Event Loop] <---- [Task Queue / Microtask Queue]      |\n+--------------------------------------------------------+`;
  } else if (conceptType === 'data_structures') {
    visualExplanation = `+--------------------------------------------------------+\n|            Data Structure Nodes & Address Links        |\n+--------------------------------------------------------+\n| [Head Node: Val] ---> [Next Node: Val] ---> [Null]     |\n|        |                      |                        |\n|   (0x0014ef)             (0x0014f8)                    |\n+--------------------------------------------------------+`;
  } else if (conceptType === 'control_flow') {
    visualExplanation = `+--------------------------------------------------------+\n|              Control Flow Branching Invariant          |\n+--------------------------------------------------------+\n|                    [Evaluation Check]                  |\n|                       /         \\                      |\n|                (True) /           \\ (False)            |\n|                      v             v                   |\n|             [Condition Block]     [Fallback Block]     |\n|                      \\             /                   |\n|                       v           v                    |\n|                     [Merge / Exit Scope]               |\n+--------------------------------------------------------+`;
  }

  let codeExamples = [
    { title: "Example 1: Basic Structure", code: `// Welcome to ${topicName}` },
    { title: "Example 2: Advanced Concept Pattern", code: `// Advanced ${topicName}` }
  ];

  if (isPython) {
    if (conceptType === 'pointers_memory') {
      codeExamples = [
        { title: "Example 1: Object References and ID tracking", code: `# Python manages objects by reference\nx = [1, 2, 3]\ny = x\nprint(f"Are references identical? {x is y}") # True\nprint(f"Memory address of x: {id(x)}")` },
        { title: "Example 2: Deepcopy vs Shallowcopy", code: `import copy\noriginal = [[1, 2], [3, 4]]\nshallow = copy.copy(original)\ndeep = copy.deepcopy(original)\noriginal[0][0] = 99\nprint(shallow[0][0]) # 99 (shared nested ref)\nprint(deep[0][0])    # 1 (isolated copy)` }
      ];
    } else if (conceptType === 'oop') {
      codeExamples = [
        { title: "Example 1: Class Declaration and Constructor", code: `class TopicModel:\n    def __init__(self, name: str):\n        self.name = name  # Instance attribute\n\n    def display(self):\n        return f"Topic: {self.name}"\n\nmodel = TopicModel("${topicName}")\nprint(model.display())` },
        { title: "Example 2: Inheritance and super() Calls", code: `class BaseTrack:\n    def get_tier(self):\n        return "Standard"\n\nclass SpecialTrack(BaseTrack):\n    def get_tier(self):\n        base_val = super().get_tier()\n        return f"Premium - {base_val}"` }
      ];
    } else if (conceptType === 'concurrency') {
      codeExamples = [
        { title: "Example 1: Asyncio Coroutines", code: `import asyncio\n\nasync def fetch_data():\n    print("Starting delay...")\n    await asyncio.sleep(1)\n    return {"status": "ok"}\n\nasync def main():\n    res = await fetch_data()\n    print(res)\n\nasyncio.run(main())` },
        { title: "Example 2: Threading and Lock safety", code: `import threading\n\nval = 0\nlock = threading.Lock()\n\ndef increment():\n    global val\n    with lock:\n        val += 1` }
      ];
    } else {
      codeExamples = [
        { title: "Example 1: Standard Python syntax", code: `# Python logic implementation for ${topicName}\ndef execute(data):\n    print(f"Processing {data} for ${topicName}")\n    return True\n\nexecute("Main input")` },
        { title: "Example 2: Idiomatic implementation", code: `# Optimized sequence iteration\nitems = [1, 2, 3, 4]\nresult = [x * 2 for x in items if x % 2 == 0]\nprint(result)` }
      ];
    }
  } else if (isJs) {
    if (conceptType === 'pointers_memory') {
      codeExamples = [
        { title: "Example 1: Primitive vs Reference Copy", code: `let a = { value: 10 };\nlet b = a;\nb.value = 20;\nconsole.log(a.value); // 20 (both reference same memory address)` },
        { title: "Example 2: Deep Clone using Structured Clone", code: `const original = { nested: { val: 5 } };\nconst clone = structuredClone(original);\noriginal.nested.val = 99;\nconsole.log(clone.nested.val); // 5 (isolated duplicate)` }
      ];
    } else if (conceptType === 'concurrency') {
      codeExamples = [
        { title: "Example 1: Promise Chaining & Microtasks", code: `console.log("Start");\nPromise.resolve().then(() => console.log("Promise (Microtask)"));\nsetTimeout(() => console.log("Timeout (Macrotask)"), 0);\nconsole.log("End");` },
        { title: "Example 2: Async Await Fetch Wrapper", code: `async function loadData() {\n  try {\n    const res = await fetch("/api/problems");\n    const data = await res.json();\n    console.log(data);\n  } catch (err) {\n    console.error(err);\n  }\n}` }
      ];
    } else {
      codeExamples = [
        { title: "Example 1: Standard ES6 Syntax", code: `// JavaScript ES6 logic for ${topicName}\nconst handleAction = (payload) => {\n  console.log("Triggered ${topicName} processing for: ", payload);\n  return true;\n};\n\nhandleAction("Seed Payload");` },
        { title: "Example 2: Modern Array Callback", code: `const values = [10, 20, 30];\nconst mapped = values.map(v => v * 1.15);\nconsole.log(mapped);` }
      ];
    }
  } else if (isCpp || isC) {
    if (conceptType === 'pointers_memory') {
      codeExamples = [
        { title: "Example 1: Pointer Declarations and Dereferencing", code: `#include <stdio.h>\nint main() {\n    int val = 42;\n    int *ptr = &val;  // ptr holds address of val\n    printf("Address: %p\\n", ptr);\n    printf("Dereferenced value: %d\\n", *ptr);\n    return 0;\n}` },
        { title: "Example 2: Dynamic Allocation Heap memory", code: `#include <stdlib.h>\nint main() {\n    int *arr = (int*) malloc(5 * sizeof(int));\n    if (arr == NULL) return 1;\n    arr[0] = 100;\n    free(arr);\n    return 0;\n}` }
      ];
    } else {
      codeExamples = [
        { title: "Example 1: Core compile-grade code", code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Standard implementation for ${topicName}" << endl;\n    return 0;\n}` },
        { title: "Example 2: Modular logic representation", code: `// Function module\nint addValues(int a, int b) {\n    return a + b;\n}` }
      ];
    }
  } else {
    if (conceptType === 'pointers_memory') {
      codeExamples = [
        { title: "Example 1: Reference Assignments", code: `class Model { int val; }\npublic class Main {\n    public static void main(String[] args) {\n        Model m1 = new Model();\n        m1.val = 5;\n        Model m2 = m1; // copies reference, not object\n        m2.val = 10;\n        System.out.println(m1.val); // prints 10\n    }\n}` },
        { title: "Example 2: Garbage collection trigger hints", code: `public class Main {\n    public static void main(String[] args) {\n        String unused = new String("Temporary");\n        unused = null; // eligible for garbage collection\n        System.gc(); // hint JVM to execute sweep\n    }\n}` }
      ];
    } else {
      codeExamples = [
        { title: "Example 1: Java class package", code: `package com.placify;\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Processing ${topicName}");\n    }\n}` },
        { title: "Example 2: Object layout", code: `public class DataTracker {\n    private String key;\n    public DataTracker(String key) { this.key = key; }\n}` }
      ];
    }
  }

  const practiceQuestions = [
    `1. Implement a complete working snippet demonstrating the core constraints of ${topicName} in ${langLabel}.`,
    `2. Write unit assertions covering edge values and null-pointers in ${topicName} applications.`,
    `3. Optimize execution performance of a nested call invoking ${topicName} functions.`,
    `4. Map the memory stack trace and activation depth during ${topicName} lifecycle invocations.`,
    `5. Build a multi-file wrapper class integrating ${topicName} modules securely.`
  ];

  const codingChallenges = [
    {
      title: `Challenge: ${topicName} validation`,
      description: `Write a modular program that accepts standard compiler values and handles ${topicName} checks. Ensure your time complexity does not exceed O(N) and uses minimal auxiliary heap memory.`,
      starterCode: isPython ? `def solve(input_str):\n    # Write Python logic here\n    return True`
                 : isJs ? `function solve(input) {\n    // Write JavaScript logic here\n    return true;\n}`
                 : `// Implement solver below\nchar* solve(char* input) {\n    return "true";\n}`
    }
  ];

  const quizzes = [
    {
      question: `What is the primary architectural purpose of ${topicName} in ${langLabel}?`,
      options: ["Optimizing execution speeds", "Structuring system memory scopes", "Isolating process scopes", "All of the above"],
      answerIndex: 3,
      explanation: `${topicName} serves as a key building block for managing runtime boundaries, variable lifetimes, and thread flows.`
    },
    {
      question: `Which of the following represents a common error when working with ${topicName}?`,
      options: ["Stack overflow exceptions", "Memory segmentation faults", "Variable name collision or shadowing", "Unreachable code compilation limits"],
      answerIndex: 2,
      explanation: "Shadowing occurs when a variable declared within an inner scope hides a variable declared in an outer scope."
    },
    {
      question: `What is the typical time complexity target when accessing values in ${topicName} components?`,
      options: ["O(1) constant time", "O(N) linear sweep", "O(log N) logarithmic binary check", "O(N^2) quadratic nested sweep"],
      answerIndex: 0,
      explanation: "Efficient implementations target constant O(1) hash map operations or stack dereferences."
    },
    {
      question: `How does the ${langLabel} runtime allocate storage memory for ${topicName} structures?`,
      options: ["Exclusively on the stack", "Dynamic allocations on the heap", "Compile-time static code segment mapping", "It depends on scope lifetime and reference type"],
      answerIndex: 3,
      explanation: "Local primitive values reside on the stack while objects, dictionaries, and dynamic arrays sit on the heap."
    },
    {
      question: `Which SDE best practice should be applied when dealing with ${topicName}?`,
      options: ["Declare all reference bindings as global variables", "Avoid release checks or scope constraints", "Keep scopes localized and cleanly release heap variables", "Run nested recursive loops without base conditions"],
      answerIndex: 2,
      explanation: "Keeping scopes local prevents unexpected mutations, memory leaks, and global workspace namespace pollution."
    }
  ];

  const interviewQuestions = [
    {
      question: `Can you explain the main design pattern or trade-off associated with ${topicName}?`,
      answer: `Using ${topicName} introduces structured isolation of variables and actions. The trade-off is the heap/stack creation overhead versus compiler inline efficiency.`
    },
    {
      question: `What is the most common SDE interview trap when discussing ${topicName}?`,
      answer: "Interviewer traps usually test double allocations, scope hoisting (for JavaScript), mutable vs immutable parameters passing, or locking safety."
    },
    {
      question: `How would you optimize an engine built heavily around ${topicName}?`,
      answer: "Optimization involves utilizing resource pools, limiting unnecessary copy-on-write actions, and enforcing strict local constant scope constraints."
    }
  ];

  return {
    name: topicName,
    theory,
    visualExplanation,
    codeExamples,
    practiceQuestions,
    codingChallenges,
    quizzes,
    interviewQuestions
  };
}


