import os
import chromadb
from chromadb.config import Settings
import uuid
from typing import List, Dict, Any

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_data")

class RAGSystem:
    def __init__(self):
        os.makedirs(DB_DIR, exist_ok=True)
        self.client = chromadb.PersistentClient(path=DB_DIR)
        
        self.dsa_collection = self.client.get_or_create_collection(name="dsa_knowledge")
        self.cs_collection = self.client.get_or_create_collection(name="cs_knowledge")
        self.interview_collection = self.client.get_or_create_collection(name="interview_knowledge")

        self._seed_comprehensive_knowledge()

    def _seed_comprehensive_knowledge(self):
        if self.dsa_collection.count() < 9:
            docs = [
                "Arrays have O(1) random access by memory indexing. Two-pointer techniques optimize subarray search from O(N^2) to O(N).",
                "Strings in many languages are immutable. Sliding window technique solves substring problems with unique character bounds in O(N).",
                "Linked lists allow O(1) insertion/deletion at pointers. Floyd's Cycle Finding algorithm detects loops using slow and fast pointers.",
                "Trees: Binary Search Trees maintain left < root < right. Inorder traversal of BST yields sorted values.",
                "Graphs: Breadth-First Search (BFS) uses a Queue to find the shortest path in unweighted graphs. Depth-First Search (DFS) uses Stack/Recursion.",
                "Graphs: Dijkstra's algorithm uses a Priority Queue (Min-Heap) for shortest paths in non-negative weighted graphs in O((V + E) log V).",
                "Dynamic Programming solves overlapping subproblems with optimal substructure using Top-Down (Memoization) or Bottom-Up (Tabulation).",
                "Trie (Prefix Tree) provides O(L) insertion and lookup for words of length L, essential for autocomplete and prefix matching.",
                "Sorting: QuickSort has O(N log N) average time complexity using partition pointers. MergeSort provides stable O(N log N) with O(N) extra space."
            ]
            meta = [{"topic": "DSA", "subtopic": "Data Structures", "category": "Technical"} for _ in docs]
            ids = [f"dsa-{i}" for i in range(len(docs))]
            self.dsa_collection.upsert(documents=docs, metadatas=meta, ids=ids)

        if self.cs_collection.count() < 9:
            docs = [
                "DBMS: ACID properties ensure reliable transactions - Atomicity (all or nothing), Consistency, Isolation, Durability.",
                "DBMS: Database Normalization (1NF, 2NF, 3NF, BCNF) eliminates data redundancy and update anomalies.",
                "DBMS: B-Trees and B+ Trees are disk-friendly data structures used for database indexing, maintaining O(log N) search and range queries.",
                "Operating Systems: A process is an executing program instance with its own virtual memory space. A thread is a lightweight execution unit inside a process sharing memory.",
                "Operating Systems: Deadlock occurs when processes hold resources while waiting for others. Necessary conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.",
                "Operating Systems: Virtual memory uses paging and page tables to map process virtual addresses to physical RAM frames.",
                "Computer Networks: TCP (Transmission Control Protocol) is connection-oriented, reliable, with 3-way handshake (SYN, SYN-ACK, ACK). UDP is connectionless and low latency.",
                "Computer Networks: OSI 7-layer model: Application, Presentation, Session, Transport, Network, Data Link, Physical.",
                "OOP: Four pillars - Encapsulation (hiding state), Abstraction (hiding implementation), Inheritance (code reuse), Polymorphism (overriding/overloading)."
            ]
            meta = [{"topic": "CS Fundamentals", "subtopic": "Core CS", "category": "Technical"} for _ in docs]
            ids = [f"cs-{i}" for i in range(len(docs))]
            self.cs_collection.upsert(documents=docs, metadatas=meta, ids=ids)

        if self.interview_collection.count() < 4:
            docs = [
                "Coding Interview Strategy: 1. Clarify constraints & edge cases. 2. State brute force complexity. 3. Propose optimized approach. 4. Code cleanly. 5. Test with sample inputs.",
                "HR Interview STAR Method: Structure behavioral answers with Situation, Task, Action, and Measurable Result.",
                "Resume Preparation: Quantify impact (e.g., 'Improved API response time by 40% using Redis caching'). Keep ATS friendly formatting with bold standard section headers.",
                "Placement Screening: Master time complexity analysis (Big-O, Big-Omega, Big-Theta) and be prepared to derive recurrence relations using Master Theorem."
            ]
            meta = [{"topic": "Interview Prep", "subtopic": "Career", "category": "Soft Skills & Process"} for _ in docs]
            ids = [f"interview-{i}" for i in range(len(docs))]
            self.interview_collection.upsert(documents=docs, metadatas=meta, ids=ids)

    def semantic_search(self, query: str, topic: str = None, n_results: int = 3) -> List[Dict[str, Any]]:
        collections = [self.dsa_collection, self.cs_collection, self.interview_collection]
        results = []

        for col in collections:
            try:
                res = col.query(query_texts=[query], n_results=n_results)
                if res and res.get("documents") and len(res["documents"]) > 0:
                    for idx, doc in enumerate(res["documents"][0]):
                        results.append({
                            "content": doc,
                            "metadata": res["metadatas"][0][idx] if res.get("metadatas") else {}
                        })
            except Exception as e:
                print(f"[RAGSystem] Query error: {e}")

        return results[:n_results]

rag_store = RAGSystem()
