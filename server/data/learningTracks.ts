/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TrackTopic {
  id: string;
  name: string;
  content: string;
}

export interface LanguageTrack {
  id: string;
  name: string;
  color: string;
  logo: string;
  topics: TrackTopic[];
}

export const languageTracks: LanguageTrack[] = [
  {
    id: "python",
    name: "Python Masterclass (A-Z)",
    color: "from-blue-500 to-yellow-500",
    logo: "🐍",
    topics: [
      { id: "py-intro", name: "1. Introduction to Python & Setup", content: "Introduction to Python programming language, features, and setting up the environment." },
      { id: "py-variables", name: "2. Variables and Scope", content: "Understanding variable declarations, naming rules, local, global, and nonlocal scopes." },
      { id: "py-datatypes", name: "3. Core Data Types & Casting", content: "Numbers, booleans, string literals, and implicit/explicit type casting." },
      { id: "py-operators", name: "4. Arithmetic & Bitwise Operators", content: "Arithmetic, comparison, logical, identity, membership, and bitwise operators." },
      { id: "py-io", name: "5. Input & Output Formatting", content: "Reading stdin with input(), printing, and advanced string formatting (f-strings)." },
      { id: "py-conditionals", name: "6. Conditional Statements (if-elif-else)", content: "Decision making blocks, nested conditions, and ternary operators." },
      { id: "py-loops", name: "7. Loops (For, While) & Control", content: "Iterating sequences, while conditions, break, continue, and else-in-loops." },
      { id: "py-functions", name: "8. Functions & Variable Arguments", content: "Declaring def functions, positional/keyword arguments, *args, and **kwargs." },
      { id: "py-recursion", name: "9. Recursion & Stack Frames", content: "Base cases, call stack mechanics, recursion limits, and tail call optimization." },
      { id: "py-strings", name: "10. String Manipulation & Slicing", content: "String operations, immutable strings, finding, replacing, and sequence slicing." },
      { id: "py-lists", name: "11. Lists & Tuples (Sequence Types)", content: "Mutable list methods vs immutable tuples, indexing, and packing/unpacking." },
      { id: "py-dicts-sets", name: "12. Dictionaries & Sets", content: "Hash map dicts, set operations (union, intersection), complexity, and ordering." },
      { id: "py-modules", name: "13. Modules, Import System & Packages", content: "Creating modules, search path, packaging structures, and pip package manager." },
      { id: "py-files", name: "14. File Handling & Stream I/O", content: "Opening files, reading/writing, path operations, and resource context managers (with)." },
      { id: "py-exceptions", name: "15. Exception Handling & Custom Errors", content: "Try-except-finally blocks, raise exceptions, and defining custom error classes." },
      { id: "py-oop-classes", name: "16. OOP: Classes and Objects", content: "Class declaration, constructor (__init__), instance attributes, and self pointer." },
      { id: "py-oop-inheritance", name: "17. OOP: Inheritance & MRO", content: "Single/multiple inheritance, super(), and Method Resolution Order (MRO)." },
      { id: "py-oop-polymorphism", name: "18. OOP: Polymorphism & Dunder Methods", content: "Duck typing, method overriding, and operator overloading using magic methods." },
      { id: "py-oop-encapsulation", name: "19. OOP: Encapsulation & Properties", content: "Private/protected members, name mangling, and getter/setter decorators." },
      { id: "py-oop-abstraction", name: "20. OOP: Abstraction & ABC", content: "Defining abstract classes and methods using the abc module." },
      { id: "py-iterators", name: "21. Iterators & Iterable Protocols", content: "Understanding __iter__ and __next__ protocols, and building custom iterators." },
      { id: "py-generators", name: "22. Generators & Yield Statement", content: "Lazy evaluation, memory efficiency, generator expressions, and state preservation." },
      { id: "py-decorators", name: "23. Decorators & Closures", content: "Function closures, nesting, writing decorators, and parameterized wrapper flows." },
      { id: "py-lambdas", name: "24. Lambda Functions", content: "Writing anonymous single-expression functions in Python." },
      { id: "py-functional", name: "25. Functional Programming: Map, Filter, Reduce", content: "Higher-order functional concepts: map(), filter(), and functools.reduce()." },
      { id: "py-comprehensions", name: "26. List, Dict & Set Comprehensions", content: "Writing elegant, fast single-line creation loops for lists, dicts, and sets." },
      { id: "py-threads", name: "27. Multithreading & Global Interpreter Lock", content: "Thread lifecycle, threading module, race conditions, and GIL limitations." },
      { id: "py-multiprocessing", name: "28. Multiprocessing & IPC", content: "Bypassing the GIL, process pools, shared memory, and message queues." },
      { id: "py-async", name: "29. Asyncio & Async Programming", content: "Event loops, coroutines, async/await syntax, and non-blocking I/O scheduling." },
      { id: "py-db", name: "30. Database Connectivity (SQLite/MySQL)", content: "Connecting to databases, executing queries, transaction controls, and ORM basics." },
      { id: "py-apis", name: "31. REST APIs & Scraping", content: "Performing requests, parsing json payloads, and web parsing using BeautifulSoup." },
      { id: "py-numpy", name: "32. NumPy for Matrix Computation", content: "Arrays (ndarrays), slicing, vectorized operations, shape transforms, and linear algebra." },
      { id: "py-pandas", name: "33. Pandas for Data Wrangling", content: "DataFrames, Series, reading CSV/Excel, grouping, merging, and filtering datasets." },
      { id: "py-matplotlib", name: "34. Matplotlib & Visuals", content: "Line charts, bar plots, scatter graphs, histograms, and styling visualizations." },
      { id: "py-eda", name: "35. Exploratory Data Analysis (EDA)", content: "Statistical metrics, correlation matrices, handling outliers, and missing values." },
      { id: "py-ml-basics", name: "36. Machine Learning: Regression & Classification", content: "Linear regression, logistic regression, training pipelines, and decision trees." },
      { id: "py-ml-eval", name: "37. ML: Clustering & Model Metrics", content: "K-means clustering, precision, recall, F1 score, ROC curves, and cross-validation." },
      { id: "py-project", name: "38. Capstone Project: AI Applet", content: "Building and deploying a full AI-powered data science or ML tool." },
      { id: "py-interview", name: "39. Python FAQ & FAANG Puzzles", content: "Frequently asked interview questions, memory management, and edge scenarios." },
      { id: "py-patterns", name: "40. Advanced Design Patterns in Python", content: "Singleton, Factory, Strategy, Observer, and Decorator design patterns in Python." }
    ]
  },
  {
    id: "java",
    name: "Enterprise Java (A-Z)",
    color: "from-red-500 to-orange-600",
    logo: "☕",
    topics: [
      { id: "java-intro", name: "1. Java Fundamentals & Compilation", content: "Introduction to Java language, write once run anywhere, JDK/JRE, and compiling bytecode." },
      { id: "java-jvm", name: "2. JVM Architecture & JIT", content: "Deep dive into ClassLoader, JVM Memory Areas (Stack, Heap, Metaspace), and JIT compiler." },
      { id: "java-variables", name: "3. Variables & Memory Layout", content: "Primitive variables, object references, scopes, and garbage collection pointers." },
      { id: "java-datatypes", name: "4. Primitive Data Types & Wrappers", content: "Java numeric limits, character types, and autoboxing/unboxing wrapper classes." },
      { id: "java-operators", name: "5. Operators & Bitwise Actions", content: "Arithmetic, logical, shift, and bitwise logic operations in Java." },
      { id: "java-loops", name: "6. Loops & Control Statements", content: "Conditional if-else, switch expressions, for, while, do-while, and loop controls." },
      { id: "java-methods", name: "7. Methods & Method Overloading", content: "Defining methods, parameter passing (pass by value), and static vs instance contexts." },
      { id: "java-arrays", name: "8. Arrays (1D & Multi-dimensional)", content: "Array declaration, allocation, iteration, and utilities (Arrays class)." },
      { id: "java-strings", name: "9. String, StringBuilder & StringBuffer", content: "String constant pool, immutability, thread-safe buffers, and string slicing." },
      { id: "java-oop-classes", name: "10. OOP: Classes, Objects & Heap", content: "Instantiation, new keyword, class fields, instance methods, and reference storage." },
      { id: "java-oop-constructors", name: "11. OOP: Constructors & Initializers", content: "Default/parameterized constructors, constructor chaining (this() / super()), and static blocks." },
      { id: "java-oop-inheritance", name: "12. OOP: Inheritance & Method Overriding", content: "Extending classes, super keyword, and runtime overrides." },
      { id: "java-oop-polymorphism", name: "13. OOP: Runtime Polymorphism", content: "Dynamic method binding, interfaces, abstract classes, and polymorphism limits." },
      { id: "java-oop-encapsulation", name: "14. OOP: Encapsulation & Access", content: "Encapsulation, getters/setters, and access specifiers (public, private, protected, default)." },
      { id: "java-oop-abstraction", name: "15. OOP: Abstraction & Abstract Classes", content: "Declaring abstract structures, concrete methods, and abstraction interfaces." },
      { id: "java-interfaces", name: "16. Interfaces & Default Methods", content: "Multiple inheritance through interfaces, default, static, and private interface methods." },
      { id: "java-packages", name: "17. Packages & Java Module System", content: "Organizing namespaces, package importing, and Java Platform Module System (JPMS)." },
      { id: "java-exceptions", name: "18. Exception Handling & Resources", content: "Checked vs unchecked exceptions, try-catch-finally, throw, and try-with-resources." },
      { id: "java-collections-list", name: "19. Collections: List & Set Interfaces", content: "ArrayList, LinkedList, Vector, HashSet, LinkedHashSet, and TreeSet." },
      { id: "java-collections-map", name: "20. Collections: Map & Queue Interfaces", content: "HashMap, LinkedHashMap, TreeMap, PriorityQueue, ArrayDeque, and ConcurrentMap." },
      { id: "java-generics", name: "21. Generics & Type Erasure", content: "Generic classes, methods, wildcards (extends/super), and bytecode type erasure." },
      { id: "java-lambda", name: "22. Functional Interfaces & Lambdas", content: "Java functional programming, @FunctionalInterface, and writing lambda bodies." },
      { id: "java-streams", name: "23. Streams API (Filter, Map, Collect)", content: "Lazy pipelines, intermediate operations, terminal aggregators, and parallel streams." },
      { id: "java-io", name: "24. Java NIO & Serialization", content: "File channels, BufferedReader, ObjectOutputStream, and serializable keywords." },
      { id: "java-jdbc", name: "25. JDBC & DB Connectivity", content: "DriverManager, Connection, Statement, PreparedStatement, and ResultSets." },
      { id: "java-threads", name: "26. Multithreading & Thread Lifecycle", content: "Runnable, Thread subclassing, states (New, Runnable, Blocked, Waiting), and join/yield." },
      { id: "java-sync", name: "27. Thread Synchronization & Locks", content: "Synchronized blocks, volatile, ReentrantLock, deadlock, and wait/notify coordination." },
      { id: "java-networking", name: "28. Java Networking & Socket I/O", content: "TCP/UDP connections, Socket, ServerSocket, and URL connections." },
      { id: "java-patterns", name: "29. Core Design Patterns in Java", content: "Singleton, Factory, Abstract Factory, Builder, Observer, and Adapter patterns." },
      { id: "java-springboot", name: "30. Spring Boot Basics & IoC Container", content: "Dependency Injection, Inversion of Control, bean lifecycles, and Spring annotations." },
      { id: "java-springboot-jpa", name: "31. Spring Boot JPA & REST API Services", content: "Spring Data JPA, Hibernate, wiring services, controllers, and JSON responses." },
      { id: "java-interview", name: "32. Java FAQs & Coding Challenges", content: "Frequently asked core Java and Spring interview questions with model answers." },
      { id: "java-project", name: "33. Capstone Project: Spring Microservice", content: "Building and wire-testing an enterprise-grade backend service with DB persistency." }
    ]
  },
  {
    id: "c",
    name: "Systems C (A-Z)",
    color: "from-blue-600 to-indigo-500",
    logo: "💾",
    topics: [
      { id: "c-intro", name: "1. Basics & Compilation Stages", content: "Introduction to C, compilation workflow: preprocessor -> compiler -> assembler -> linker." },
      { id: "c-variables", name: "2. Variables & Constants", content: "Variable definitions, storage classes, declaration, and memory scope." },
      { id: "c-datatypes", name: "3. Core Data Types & Formats", content: "Int, float, char, double, qualifiers (signed, unsigned, long), and format specifiers." },
      { id: "c-operators", name: "4. Operators & Bitwise Actions", content: "Arithmetic, logical, relational, assignment, and bitwise shift operators." },
      { id: "c-io", name: "5. Input & Output (scanf, printf, fgets)", content: "Reading stdin securely, formatting stdout, buffer management, and puts/gets details." },
      { id: "c-conditionals", name: "6. Conditional Statements", content: "If, else-if, nested structures, switch-case, and default selectors." },
      { id: "c-loops", name: "7. Loops (For, While, Do-While)", content: "Iteration loops, break, continue, loops control, and infinite loops configurations." },
      { id: "c-functions", name: "8. Functions & Stack passing", content: "Functions definitions, call by value vs call by reference, and activation records." },
      { id: "c-recursion", name: "9. Recursion & Stack Frames", content: "Recursive loops, base case checks, stack overflows, and visual call-stack trace." },
      { id: "c-arrays", name: "10. Arrays (1D & 2D Matrices)", content: "Defining arrays, address mapping, index math, and multidimensional arrays." },
      { id: "c-strings", name: "11. C String Library Functions", content: "Null-terminated char arrays, strcpy, strcat, strlen, strcmp, and buffer safety." },
      { id: "c-pointers", name: "12. Address-Of & Pointers Introduction", content: "Understanding memory addresses, pointer declaration, dereference (*), and null pointers." },
      { id: "c-pointer-arithmetic", name: "13. Pointer Arithmetic & Array Duality", content: "Adding/subtracting pointers, scale factor, and accessing array items using pointers." },
      { id: "c-structures", name: "14. Structures & Memory Padding", content: "Defining struct layouts, size computation, padding, and arrow operator (->)." },
      { id: "c-unions", name: "15. Unions & Shareable Memory", content: "Defining union types, memory sizing, and overlapping variables allocation." },
      { id: "c-enums", name: "16. Enums & Typedef", content: "Creating enumerations, compile-time constants, and creating custom types with typedef." },
      { id: "c-malloc", name: "17. Dynamic Memory (malloc, free)", content: "Heap allocation, malloc, calloc, realloc, free, memory leaks, and dangling pointers." },
      { id: "c-linkedlist", name: "18. Singly & Doubly Linked Lists in C", content: "Creating self-referential structs, head nodes, node inserts, traversals, and deletions." },
      { id: "c-stack", name: "19. Stack Implementations in C", content: "Building stacks using dynamic arrays or linked nodes, push, pop, and top checks." },
      { id: "c-queue", name: "20. Queue Implementations in C", content: "FIFO queues using structures, circular array buffers, and linear lists." },
      { id: "c-trees", name: "21. Binary Trees & Traversals in C", content: "Binary tree node layout, pre-order, in-order, and post-order recursion tree walks." },
      { id: "c-files", name: "22. File Streams & Seek Operations", content: "FILE handles, fopen, fclose, fprintf, fscanf, fseek, ftell, and file modes." },
      { id: "c-preprocessor", name: "23. Preprocessor Directives & Macros", content: "#define, macro expansion, header guards, #ifdef, and compilation switches." },
      { id: "c-storage", name: "24. Storage Classes (static, extern)", content: "Auto, register, static, and extern linkage specs, and variables lifetimes." },
      { id: "c-algorithms", name: "25. DSA implementations in C", content: "Bubble sort, insertion sort, binary search, and recursive quicksort in C." },
      { id: "c-project", name: "26. Capstone Project: Systems Simulator", content: "Structuring, compiling, and testing a multi-file systems or terminal simulator app." },
      { id: "c-interview", name: "27. C Interview FAQs & Pointer Puzzles", content: "Tricky pointer questions, memory layout, segmentation faults, and compilation issues." }
    ]
  },
  {
    id: "cpp",
    name: "C++ Programming (A-Z)",
    color: "from-indigo-600 to-sky-500",
    logo: "⚡",
    topics: [
      { id: "cpp-intro", name: "1. Fundamentals & I/O Streams", content: "Differences from C, namespaces, std::cin, std::cout, and standard compiler stages." },
      { id: "cpp-oop-classes", name: "2. OOP: Classes & Access Specifiers", content: "Class declarations, private, public, protected segments, encapsulation, and this keyword." },
      { id: "cpp-constructors", name: "3. OOP: Constructors & RAII", content: "Default, parameterized, copy, and move constructors, destructors, and Resource Acquisition Is Initialization." },
      { id: "cpp-friend", name: "4. OOP: Friend Classes & Operators", content: "Friend functions/classes, operator overloading, and streaming overrides (<< and >>)." },
      { id: "cpp-inheritance", name: "5. OOP: Multiple & Virtual Inheritance", content: "Extending multiple classes, diamond problem, and virtual base classes." },
      { id: "cpp-polymorphism", name: "6. OOP: Virtual Functions & VTables", content: "Runtime polymorphism, virtual tables (VTable), virtual pointers (VPTR), and abstract classes." },
      { id: "cpp-templates", name: "7. Class & Function Templates", content: "Generic programming, templates, specialization, and template parameters constraints." },
      { id: "cpp-stl-vector", name: "8. STL: Vector & Deque", content: "Standard template vectors, dynamic arrays resizing, time complexity, and deque features." },
      { id: "cpp-stl-stack-queue", name: "9. STL: Stack & Queue Containers", content: "Adapter containers, stack (LIFO) push/pop, queue (FIFO), and priority queues." },
      { id: "cpp-stl-set", name: "10. STL Set & Multiset (R-B Trees)", content: "Sorted unique values, set, multiset, logarithmic lookup insertion, and iterators." },
      { id: "cpp-stl-map", name: "11. STL Map & Multimap", content: "Sorted key-value mappings using red-black trees, upper/lower bounds, and iterators." },
      { id: "cpp-stl-hash", name: "12. STL Unordered Set & Map", content: "Hashing containers: unordered_set and unordered_map, hash functions, and O(1) searches." },
      { id: "cpp-stl-algorithms", name: "13. STL Algorithms Library", content: "Std::sort, std::binary_search, std::lower_bound, std::transform, and lambda callbacks." },
      { id: "cpp-exceptions", name: "14. Try, Catch, Throw & Exceptions", content: "Structured exception handling, stack unwinding, throw mechanisms, and custom exceptions." },
      { id: "cpp-files", name: "15. File Streams (fstream) & Serialization", content: "Reading/writing text and binary files using ifstream, ofstream, and fstream." },
      { id: "cpp-smart-pointers", name: "16. Smart Pointers (unique, shared, weak)", content: "Automatic heap management, unique_ptr, shared_ptr reference count, and weak_ptr." },
      { id: "cpp-cp", name: "17. CP Templates & Optimizations", content: "Fast I/O templates, macros, bitwise operations, and standard CP headers configurations." },
      { id: "cpp-dsa", name: "18. Advanced DSA in C++", content: "Graph structures (adj list), DP representation, and memory efficient tree mappings." },
      { id: "cpp-project", name: "19. Capstone Project: Game Engine/Parser", content: "Writing a modular game core loop or custom compiler parser using template libraries." },
      { id: "cpp-interview", name: "20. C++ FAQs & Systems Puzzles", content: "Frequently asked C++ questions, virtual destructors, smart pointers leaks, and templates compilation." }
    ]
  },
  {
    id: "javascript",
    name: "JavaScript & ES6 (A-Z)",
    color: "from-yellow-400 to-yellow-600",
    logo: "🌐",
    topics: [
      { id: "js-context", name: "1. Execution Context & Call Stack", content: "JavaScript engine, global vs functional execution context, hoisting, and scopes." },
      { id: "js-variables", name: "2. Var, Let & Const scopes", content: "Block scope vs function scope, temporal dead zone, and variable declarations." },
      { id: "js-memory", name: "3. Primitive vs Reference Types", content: "Heap vs Stack layout, copy by value vs copy by reference, and object mutations." },
      { id: "js-coercion", name: "4. Type Coercion & Operators", content: "Implicit coercion rules, == vs === comparisons, and logical short-circuiting." },
      { id: "js-functions", name: "5. Functions & Rest Parameters", content: "Function declarations, expressions, arguments object, rest, and default parameters." },
      { id: "js-arrows", name: "6. Arrow Functions & Lexical 'this'", content: "Arrow functions syntax, arguments bindings, and resolving 'this' dynamically." },
      { id: "js-prototypes", name: "7. Objects & Prototype Inheritance", content: "Objects creation, prototypes chain, Object.create, and dunder proto definitions." },
      { id: "js-arrays", name: "8. ES6 Higher-Order Array Methods", content: "Iterating arrays using map(), filter(), reduce(), find(), and custom arrow predicates." },
      { id: "js-dom", name: "9. DOM Selection & Manipulation", content: "Selecting nodes (querySelector), updating text, style classes, and element insertions." },
      { id: "js-events", name: "10. Event Bubbling & Propagation", content: "AddEventListener, event capturing, target, and preventDefault/stopPropagation." },
      { id: "js-es6", name: "11. ES6+ Features (Destructuring, Spread)", content: "Array/object destructuring, rest/spread operators, template literals, and symbols." },
      { id: "js-callbacks", name: "12. Asynchronous Callbacks", content: "Understanding single-threaded event processing and nesting callbacks." },
      { id: "js-promises", name: "13. Promises & Promise Methods", content: "States (pending, fulfilled, rejected), then/catch, Promise.all, and Promise.race." },
      { id: "js-async", name: "14. Async / Await & Error Handles", content: "Writing clean synchronous-style async tasks using async keywords and try-catch." },
      { id: "js-apis", name: "15. Fetch API & HTTP Network Requests", content: "Fetching JSON data, GET/POST requests, HTTP headers, and handle network responses." },
      { id: "js-storage", name: "16. Local/Session Storage & Cookies", content: "Persisting web data, localStorage, sessionStorage, and cookies safety." },
      { id: "js-json", name: "17. JSON Parsing & Stringify", content: "Valid JSON schema, converting JS objects to strings, and parsing network payloads." },
      { id: "js-errors", name: "18. Error Handling (Try-Catch-Finally)", content: "Throwing Custom Errors, error object details, and finally blocks triggers." },
      { id: "js-modules", name: "19. ES Modules & CommonJS", content: "Import vs export syntax, require module structures, and bundler compilation flow." },
      { id: "js-classes", name: "20. OOP: ES6 Classes", content: "Constructor classes, class keywords, super(), static members, and private fields." },
      { id: "js-closures", name: "21. Closures & Lexical Scope", content: "Functions retaining reference to outer variables scope, module patterns, and memoization." },
      { id: "js-eventloop", name: "22. Event Loop & Task Queues", content: "Microtasks queue vs Macrotasks queue, call stack, and scheduler mechanics." },
      { id: "js-react", name: "23. React.js Fundamentals", content: "React elements, JSX, state hook (useState), properties (props), and component updates." },
      { id: "js-node", name: "24. Node.js & Express Basics", content: "Node environment, package.json, importing modules, routing, and creating Express API." },
      { id: "js-project", name: "25. Capstone Project: Dynamic Web App", content: "Assembling a full-featured web app using JS components and public API integrations." },
      { id: "js-interview", name: "26. JS FAQs & Core Engine Puzzles", content: "V8 engine compiler, garbage collector, memory leaks, and tricky hoisting questions." }
    ]
  }
];

const w3SchoolsTopicGroups = [
  {
    prefix: "html",
    title: "HTML",
    items: [
      "Introduction", "Editors", "Elements", "Attributes", "Headings", "Paragraphs", "Styles", "Formatting",
      "Quotations", "Comments", "Colors", "CSS Linking", "Links", "Images", "Tables", "Lists", "Block and Inline",
      "Div", "Classes", "Ids", "Iframes", "JavaScript in HTML", "File Paths", "Head", "Layout", "Responsive",
      "Forms", "Form Attributes", "Input Types", "Input Attributes", "Canvas", "SVG", "Media", "APIs", "Semantics"
    ]
  },
  {
    prefix: "css",
    title: "CSS",
    items: [
      "Syntax", "Selectors", "Colors", "Backgrounds", "Borders", "Margins", "Padding", "Height and Width",
      "Box Model", "Outline", "Text", "Fonts", "Icons", "Links", "Lists", "Tables", "Display", "Position",
      "Z Index", "Overflow", "Float", "Inline Block", "Align", "Combinators", "Pseudo Classes", "Pseudo Elements",
      "Opacity", "Navigation Bar", "Dropdowns", "Forms", "Counters", "Units", "Specificity", "Flexbox", "Grid",
      "Media Queries", "Animations", "Transitions", "Variables"
    ]
  },
  {
    prefix: "js",
    title: "JavaScript",
    items: [
      "Where To", "Output", "Statements", "Syntax", "Comments", "Variables", "Let", "Const", "Operators",
      "Arithmetic", "Assignment", "Data Types", "Functions", "Objects", "Events", "Strings", "String Methods",
      "Numbers", "Arrays", "Array Methods", "Dates", "Math", "Random", "Booleans", "Comparisons", "If Else",
      "Switch", "Loops", "Sets", "Maps", "Typeof", "Type Conversion", "RegExp", "Errors", "Scope", "Hoisting",
      "Strict Mode", "This", "Classes", "Modules", "JSON", "Debugging", "Async", "Promises", "Fetch API"
    ]
  },
  {
    prefix: "sql",
    title: "SQL and Databases",
    items: [
      "Syntax", "Select", "Where", "Order By", "Insert Into", "Null Values", "Update", "Delete", "Select Top",
      "Aggregate Functions", "Min Max", "Count", "Sum", "Avg", "Like", "Wildcards", "In", "Between", "Aliases",
      "Joins", "Inner Join", "Left Join", "Right Join", "Full Join", "Self Join", "Union", "Group By", "Having",
      "Exists", "Any All", "Case", "Stored Procedures", "Comments", "Operators", "Create Database", "Create Table",
      "Constraints", "Not Null", "Unique", "Primary Key", "Foreign Key", "Check", "Default", "Index", "Auto Increment",
      "Dates", "Views", "Injection Safety"
    ]
  },
  {
    prefix: "py",
    title: "Python",
    items: [
      "Syntax", "Comments", "Variables", "Data Types", "Numbers", "Casting", "Strings", "Booleans", "Operators",
      "Lists", "Tuples", "Sets", "Dictionaries", "If Else", "While Loops", "For Loops", "Functions", "Lambda",
      "Arrays", "Classes and Objects", "Inheritance", "Iterators", "Polymorphism", "Scope", "Modules", "Dates",
      "Math", "JSON", "RegEx", "PIP", "Try Except", "File Handling", "User Input", "String Formatting", "NumPy",
      "Pandas", "Matplotlib", "Machine Learning"
    ]
  },
  {
    prefix: "java",
    title: "Java",
    items: [
      "Syntax", "Output", "Comments", "Variables", "Data Types", "Type Casting", "Operators", "Strings", "Math",
      "Booleans", "If Else", "Switch", "While Loop", "For Loop", "Break Continue", "Arrays", "Methods",
      "Method Parameters", "Method Overloading", "Scope", "Recursion", "Classes", "OOP", "Constructors",
      "Modifiers", "Encapsulation", "Packages", "Inheritance", "Polymorphism", "Inner Classes", "Abstraction",
      "Interface", "Enums", "User Input", "Date", "ArrayList", "LinkedList", "HashMap", "HashSet", "Iterator",
      "Wrapper Classes", "Exceptions", "Regex", "Threads", "Lambda", "File Handling"
    ]
  },
  {
    prefix: "web",
    title: "Modern Web and Tools",
    items: [
      "Bootstrap Grid", "Bootstrap Components", "React Intro", "React JSX", "React Components", "React Props",
      "React Events", "React Hooks", "React Router", "TypeScript Types", "TypeScript Interfaces",
      "Node.js Intro", "Node Modules", "Express Routing", "REST APIs", "MongoDB CRUD", "Git Basics",
      "Git Branches", "GitHub Workflow", "AWS Cloud Basics", "Docker Basics", "Cyber Security Intro",
      "Data Science Intro", "AI Intro", "Machine Learning Basics", "DSA Intro", "Arrays DSA", "Linked Lists DSA",
      "Stacks DSA", "Queues DSA", "Hash Tables DSA", "Trees DSA", "Graphs DSA", "Sorting DSA", "Searching DSA"
    ]
  }
];

languageTracks.unshift({
  id: "w3schools",
  name: "W3Schools Full Web Syllabus",
  color: "from-cyan-500 to-cyan-700",
  logo: "W3",
  topics: w3SchoolsTopicGroups.flatMap((group) =>
    group.items.map((item, index) => ({
      id: `${group.prefix}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
      name: `${group.title}: ${item}`,
      content: `W3Schools-style lesson for ${group.title} ${item}. Learn the definition, syntax, examples, common mistakes, practice tasks, and placement interview usage.`
    }))
  )
});
