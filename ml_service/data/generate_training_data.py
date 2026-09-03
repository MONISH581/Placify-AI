"""
generate_training_data.py
Generates synthetic but realistic training datasets for all Placify ML models.
Reads server-db.json for real problem/user data and augments with synthetic samples.
"""

import json
import random
import os
import numpy as np
import pandas as pd

# Resolve path to server-db.json (two levels up from ml_service/data/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_FILE = os.path.join(BASE_DIR, "server-db.json")
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

random.seed(42)
np.random.seed(42)


# -----------------------------------------------------------------------------
# Load real DB data
# -----------------------------------------------------------------------------
def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    print(f"[WARN] server-db.json not found at {DB_FILE}, using empty DB.")
    return {"users": [], "problems": [], "submissions": []}


# -----------------------------------------------------------------------------
# 1. Placement Readiness Training Data  (REALISTIC: overlapping distributions)
# -----------------------------------------------------------------------------
def generate_placement_data(db, n_synthetic=800):
    """
    Generate a balanced placement dataset (~50/50) from a SINGLE mixed population.

    Design rationale
    ----------------
    The previous version generated two non-overlapping explicit buckets
    (Not Ready: level 1-6 / Ready: level 7-20, etc.).  That produces near-zero
    feature overlap, making the classification problem trivially easy (a single
    decision boundary on 'level' separates all samples).  The resulting 99%+
    accuracy is misleading — the model learned a lookup table, not real signals.

    This version draws ALL users from one realistic distribution whose parameters
    are inspired by real coding-platform user data:
      - level:           uniform 1-20  (same for everyone)
      - streak:          right-skewed exponential (most users have short streaks)
      - problems_solved: right-skewed exponential (most users solve relatively few)
      - accuracy:        normal centered at 58% with std 22%  (wide realistic spread)
      - xp:              derived from level + solved (correlated, not independent)

    A continuous readiness score is computed from a weighted combination of five
    normalised signals.  Gaussian noise (std=0.07) is added to blur the boundary
    and create genuinely ambiguous cases:
      - high solved count + low accuracy  → borderline
      - good accuracy + few problems      → borderline
      - long streak + poor other metrics  → borderline
      - moderate values across all        → borderline

    The median of the noisy scores is used as the threshold so the final split
    is always ~50/50 by construction, not by tuning a magic constant.

    Weights
    -------
      problems_solved  30%  (most informative; completing many problems matters most)
      accuracy         25%  (quality of work; solving wrong repeatedly penalises)
      level            20%  (platform progression — correlated but not sufficient alone)
      streak           15%  (consistency signal; long breaks hurt readiness)
      xp               10%  (overall engagement; largely redundant with the above)
    """
    rows = []

    # -- Real users from DB (keep as-is, they are few) ----------------------
    for user in db.get("users", []):
        solved = len(user.get("problemsSolved", []))
        subs = [s for s in db.get("submissions", []) if s.get("userId") == user.get("id")]
        rows.append({
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 0),
            "accuracy": user.get("accuracy", 50),
            "problems_solved": solved,
            "submission_count": len(subs),
            "placement_ready": 1 if user.get("xp", 0) > 1000 and solved > 5 else 0,
        })

    # -- Synthetic users: single mixed population ---------------------------
    # Step 1: draw raw features from realistic distributions.
    synthetic = []
    for _ in range(n_synthetic):
        level = random.randint(1, 20)

        # Exponential: most users have short streaks; a few sustain long ones.
        streak = int(np.random.exponential(45))
        streak = int(np.clip(streak, 0, 200))

        # Exponential: most users solve relatively few problems.
        problems_solved = int(np.random.exponential(65))
        problems_solved = int(np.clip(problems_solved, 0, 300))

        # Normal: centered at 58%, std 22%.  Real platforms show this spread.
        accuracy = int(np.clip(np.random.normal(58, 22), 15, 100))

        xp = (level * random.randint(200, 600)
              + problems_solved * random.randint(5, 25))

        submission_count = problems_solved + random.randint(0, max(1, problems_solved // 2))

        synthetic.append({
            "xp": xp,
            "level": level,
            "streak": streak,
            "accuracy": accuracy,
            "problems_solved": problems_solved,
            "submission_count": submission_count,
        })

    # Step 2: compute a continuous multi-signal readiness score.
    # Each signal is independently normalised to [0, 1] so no single feature
    # can dominate purely through its raw scale.
    scores = []
    for row in synthetic:
        # Thresholds chosen so the signal is non-trivially low for a typical
        # beginner and non-trivially high only for a consistent performer.
        solved_sig = float(np.clip(row["problems_solved"] / 80.0, 0.0, 1.0))
        acc_sig    = float(np.clip((row["accuracy"] - 40.0) / 55.0, 0.0, 1.0))
        level_sig  = float(np.clip(row["level"] / 15.0, 0.0, 1.0))
        streak_sig = float(np.clip(row["streak"] / 75.0, 0.0, 1.0))
        xp_sig     = float(np.clip(row["xp"] / 9000.0, 0.0, 1.0))

        raw = (
            0.30 * solved_sig +
            0.25 * acc_sig    +
            0.20 * level_sig  +
            0.15 * streak_sig +
            0.10 * xp_sig
        )
        # Gaussian noise blurs the boundary and creates genuine ambiguity.
        noisy = raw + float(np.random.normal(0.0, 0.07))
        scores.append(noisy)

    # Step 3: threshold at the MEDIAN so the split is exactly ~50/50
    # regardless of the distribution shape.  This avoids magic constants.
    threshold = float(np.median(scores))
    for row, score in zip(synthetic, scores):
        row["placement_ready"] = 1 if score >= threshold else 0
        rows.append(row)

    df = pd.DataFrame(rows)
    df = df.fillna(0)
    df["placement_ready"] = df["placement_ready"].astype(int)

    out_path = os.path.join(OUT_DIR, "placement_training.csv")
    df.to_csv(out_path, index=False)

    ready_count     = int(df["placement_ready"].sum())
    not_ready_count = int(len(df) - ready_count)
    total           = len(df)
    print(f"[OK] Placement data: {total} rows saved to {out_path}")
    print(f"     Placement Training Data")
    print(f"     Ready     : {ready_count}")
    print(f"     Not Ready : {not_ready_count}")
    print(f"     Balance   : {ready_count/total*100:.1f}% / {not_ready_count/total*100:.1f}%")
    return df


# -----------------------------------------------------------------------------
# 2. Problem Difficulty Training Data  (FIXED: 100 rich examples per class)
# -----------------------------------------------------------------------------

# Each tuple is (text, label).
# Texts are realistic algorithmic problem descriptions with strong vocabulary
# that correlates naturally with difficulty level.

EASY_SYNTHETIC = [
    ("Given an array of integers find the maximum element using a single loop iteration", "Easy"),
    ("Reverse a string in place without using extra memory", "Easy"),
    ("Check if a number is even or odd using modulo operator", "Easy"),
    ("Count the number of vowels in a given string by iterating each character", "Easy"),
    ("Find the sum of all elements in an integer array", "Easy"),
    ("Check whether a string is a palindrome by comparing characters from both ends", "Easy"),
    ("Print the Fibonacci sequence up to n terms using a simple loop", "Easy"),
    ("Given a number return its factorial using iteration", "Easy"),
    ("Find the smallest element in an unsorted array", "Easy"),
    ("Count occurrences of a given character in a string", "Easy"),
    ("Swap two variables without using a temporary variable", "Easy"),
    ("Remove all spaces from a string", "Easy"),
    ("Find the second largest element in an array using a single pass", "Easy"),
    ("Convert a decimal number to binary using division by 2", "Easy"),
    ("Given an array check if it contains a duplicate element using a hash set", "Easy"),
    ("Sum of digits of an integer by extracting each digit with modulo", "Easy"),
    ("Find the length of the longest word in a sentence", "Easy"),
    ("Check if a number is prime by checking divisibility up to its square root", "Easy"),
    ("Sort an array of numbers using bubble sort by swapping adjacent elements", "Easy"),
    ("Print all even numbers from 1 to N using a loop and modulo", "Easy"),
    ("Find the GCD of two numbers using the Euclidean algorithm with modulo", "Easy"),
    ("Merge two sorted arrays into a single sorted array using two pointers", "Easy"),
    ("Given a list of numbers return only the unique elements", "Easy"),
    ("Find the index of a target value in an array using linear search", "Easy"),
    ("Reverse an integer and return the result", "Easy"),
    ("Count the number of words in a sentence by splitting on whitespace", "Easy"),
    ("Check if all characters in a string are alphabetic", "Easy"),
    ("Given an array of 0s and 1s count how many 1s appear", "Easy"),
    ("Return the absolute value of an integer without using built-in functions", "Easy"),
    ("Given a string capitalize the first letter of every word", "Easy"),
    ("Find all pairs in an array that sum to a given target using nested loops", "Easy"),
    ("Determine if a year is a leap year using divisibility rules", "Easy"),
    ("Convert a string of digits to an integer without using built-in parse", "Easy"),
    ("Check if two strings are anagrams by comparing sorted character arrays", "Easy"),
    ("Remove duplicate values from an array using a hash set", "Easy"),
    ("Given an array of integers return true if the array is sorted ascending", "Easy"),
    ("Find the average of all numbers in a list", "Easy"),
    ("Count how many times a substring appears in a larger string", "Easy"),
    ("Print a multiplication table for a given number up to 10", "Easy"),
    ("Given a matrix of integers find the row with the maximum sum", "Easy"),
    ("Return true if a string contains only digits", "Easy"),
    ("Given a number reverse its digits and return the reversed number", "Easy"),
    ("Find the missing number in an array of 1 to n using the sum formula", "Easy"),
    ("Check if a linked list has exactly one element", "Easy"),
    ("Rotate an array to the right by k positions using extra space", "Easy"),
    ("Given a string remove all non-alphanumeric characters", "Easy"),
    ("Find the intersection of two arrays using hash set lookup", "Easy"),
    ("Sum all odd numbers from 1 to N using a simple loop", "Easy"),
    ("Check if a stack is empty before popping an element", "Easy"),
    ("Given a dictionary count the total number of keys", "Easy"),
    ("Find the longest string in a list of strings using iteration", "Easy"),
    ("Given two strings concatenate them and return the result", "Easy"),
    ("Check if an integer is positive negative or zero", "Easy"),
    ("Given a list find the element at the middle index", "Easy"),
    ("Count the frequency of each character in a string using a hash map", "Easy"),
    ("Insert an element at the beginning of an array", "Easy"),
    ("Delete the last element of an array", "Easy"),
    ("Given a string check if it starts with a specific prefix", "Easy"),
    ("Compute the power of a number using repeated multiplication loop", "Easy"),
    ("Given an array of strings return only those with length greater than five", "Easy"),
    ("Find the minimum of three numbers using comparison operators", "Easy"),
    ("Check if a number is a perfect square by taking its integer square root", "Easy"),
    ("Given a list of boolean values count how many are true", "Easy"),
    ("Convert all characters in a string to uppercase", "Easy"),
    ("Given an array print elements from index i to j inclusive", "Easy"),
    ("Remove the first occurrence of a value from a list", "Easy"),
    ("Check if a string contains only whitespace characters", "Easy"),
    ("Given two sorted arrays find the union of all elements", "Easy"),
    ("Find the product of all non-zero elements in an array", "Easy"),
    ("Given a number print its multiplication table from 1 to 10", "Easy"),
    ("Check if an array has more positive than negative numbers", "Easy"),
    ("Given a string return it with vowels replaced by asterisks", "Easy"),
    ("Find the number of digits in a given integer", "Easy"),
    ("Given an array find all elements that appear more than once", "Easy"),
    ("Implement a simple counter that increments and resets on command", "Easy"),
    ("Given a list of tuples sort them by the second element of each tuple", "Easy"),
    ("Check if a character is a vowel or consonant", "Easy"),
    ("Given a number return the sum of its first n multiples", "Easy"),
    ("Find the most frequent element in an array using a hash map counter", "Easy"),
    ("Given two numbers return the larger one without using max function", "Easy"),
    ("Determine if a string is a valid integer by checking each character", "Easy"),
    ("Given an array of characters join them into a single string", "Easy"),
    ("Find how many elements in an array are divisible by k", "Easy"),
    ("Given a matrix print its main diagonal elements", "Easy"),
    ("Calculate the perimeter of a rectangle given its width and height", "Easy"),
    ("Given a list of numbers return a new list with each number squared", "Easy"),
    ("Check if two arrays contain exactly the same elements in the same order", "Easy"),
    ("Given a string find the first non-repeating character using a frequency hash map", "Easy"),
    ("Compute the nth triangular number using the closed form formula", "Easy"),
    ("Given an array shift all zeros to the end maintaining relative order of non-zeros", "Easy"),
    ("Return the sum of the first and last elements in a list", "Easy"),
    ("Check if a word has more than five characters", "Easy"),
    ("Given an array replace all negative values with zero", "Easy"),
    ("Find the ASCII value of each character in a string", "Easy"),
    ("Given a number check if it is a multiple of both three and five", "Easy"),
    ("Given an array count elements that fall within a given numeric range", "Easy"),
    ("Compute the celsius to fahrenheit conversion using the standard formula", "Easy"),
    ("Given a list create a new list preserving only the unique elements in order", "Easy"),
    ("Find the largest digit in a given integer by extracting digits one by one", "Easy"),
]

MEDIUM_SYNTHETIC = [
    ("Find the longest substring without repeating characters using a sliding window and hash map", "Medium"),
    ("Given a sorted rotated array find the index of a target using binary search with pivot detection", "Medium"),
    ("Merge overlapping intervals by sorting by start time then scanning for overlaps", "Medium"),
    ("Find the number of islands in a 2D grid using BFS or DFS to mark visited cells", "Medium"),
    ("Given a string determine if it can be segmented into valid dictionary words using 1D dynamic programming", "Medium"),
    ("Implement an LRU cache using a doubly linked list and a hash map for O(1) get and put", "Medium"),
    ("Find the minimum number of coins to make a given amount using 1D dynamic programming tabulation", "Medium"),
    ("Given a binary tree return its level order traversal using BFS with a queue", "Medium"),
    ("Find the kth largest element in an unsorted array using a min-heap of size k", "Medium"),
    ("Check if a binary tree is a valid BST using an inorder traversal with boundary checking", "Medium"),
    ("Given a graph find whether a path exists between two nodes using BFS with a visited set", "Medium"),
    ("Solve the two-sum problem using a hash map to store complements in a single pass", "Medium"),
    ("Find the longest increasing subsequence using 1D DP with binary search optimization", "Medium"),
    ("Given a matrix perform a spiral traversal iterating layer by layer", "Medium"),
    ("Implement a stack that supports push pop and getMin in O(1) using an auxiliary min stack", "Medium"),
    ("Find all subsets of a given set using backtracking and recursive inclusion exclusion", "Medium"),
    ("Given a string find all valid parentheses combinations using backtracking recursion", "Medium"),
    ("Reconstruct a binary tree from its inorder and postorder traversal arrays", "Medium"),
    ("Given a directed graph perform a topological sort using DFS or Kahn BFS algorithm", "Medium"),
    ("Find the maximum product subarray using Kadane's algorithm tracking min and max products", "Medium"),
    ("Given a list of tasks and cooldown intervals find the minimum time to finish all tasks using a greedy heap", "Medium"),
    ("Find the shortest path in an unweighted graph using BFS and tracking parent pointers", "Medium"),
    ("Given a string of brackets check if it is balanced using a stack", "Medium"),
    ("Implement binary search on a 2D sorted matrix treating it as a flattened sorted array", "Medium"),
    ("Given a linked list detect if there is a cycle using Floyd's tortoise and hare algorithm", "Medium"),
    ("Find the median of two sorted arrays using binary search partitioning", "Medium"),
    ("Given a grid of 0s and 1s count the number of distinct connected components using union-find", "Medium"),
    ("Group a list of strings into anagram clusters using sorted string keys in a hash map", "Medium"),
    ("Given a sorted array remove duplicates in-place using the two-pointer technique", "Medium"),
    ("Find the maximum sum contiguous subarray using Kadane's algorithm tracking running sum", "Medium"),
    ("Given a binary search tree find the kth smallest element using inorder DFS traversal", "Medium"),
    ("Implement a queue using two stacks supporting enqueue and dequeue operations", "Medium"),
    ("Find all permutations of a string using recursive backtracking with swapping", "Medium"),
    ("Given a weighted undirected graph find the minimum spanning tree using Prim's greedy algorithm", "Medium"),
    ("Determine if a string matches a pattern with one-to-one character mapping using two hash maps", "Medium"),
    ("Find the next permutation of an array by scanning from right for a descent then swapping and reversing", "Medium"),
    ("Given a set of intervals find the minimum number of intervals to remove to make them non-overlapping using greedy sorting", "Medium"),
    ("Given an array of integers find the length of the longest consecutive sequence using a hash set", "Medium"),
    ("Solve the jump game problem by checking if you can reach the last index using greedy tracking of max reach", "Medium"),
    ("Given a binary matrix find the largest rectangle containing only 1s using the histogram approach with a stack", "Medium"),
    ("Find all pairs with a given difference in an unsorted array using a hash set", "Medium"),
    ("Given a string find if any permutation of it is a palindrome using character frequency counting", "Medium"),
    ("Implement a trie with insert and search operations using a nested dictionary or node class", "Medium"),
    ("Given a list of meeting time intervals find the minimum number of conference rooms required using a min-heap", "Medium"),
    ("Find the longest palindromic substring using dynamic programming with a 2D boolean table", "Medium"),
    ("Given a binary tree find its diameter as the longest path between any two nodes using DFS", "Medium"),
    ("Find the minimum path sum in a grid from top-left to bottom-right using DP rolling array", "Medium"),
    ("Given a linked list reverse it in groups of k nodes using iterative pointer manipulation", "Medium"),
    ("Find all nodes at distance k from a given node in a binary tree using BFS from the target node", "Medium"),
    ("Given an integer array find all triplets that sum to zero using sorting and two pointers", "Medium"),
    ("Implement a graph coloring check to determine if a graph is bipartite using BFS alternating colors", "Medium"),
    ("Given a list of words find the shortest transformation sequence using BFS word ladder approach", "Medium"),
    ("Count the number of paths from the top-left to the bottom-right of a grid using 2D DP", "Medium"),
    ("Given an integer array find all unique combinations that sum to a target using backtracking with pruning", "Medium"),
    ("Find the majority element in an array appearing more than half the time using Boyer-Moore voting", "Medium"),
    ("Given a binary tree check if it is symmetric using recursive or iterative BFS mirror comparison", "Medium"),
    ("Implement a snake and ladder game simulation using BFS to find minimum dice rolls", "Medium"),
    ("Given a string count the number of distinct substrings using a sliding window approach", "Medium"),
    ("Find if a word exists in a 2D character grid using DFS backtracking", "Medium"),
    ("Given an array of job deadlines and profits schedule jobs to maximize profit using greedy sorting", "Medium"),
    ("Given a binary tree convert it to a doubly linked list in-place using inorder traversal", "Medium"),
    ("Find the number of ways to climb n stairs taking 1 or 2 steps using 1D DP Fibonacci pattern", "Medium"),
    ("Given a number find all prime factors by trial division and return them as a list", "Medium"),
    ("Find the first and last position of a target in a sorted array using two separate binary search calls", "Medium"),
    ("Given a linked list find and remove the nth node from the end using two pointer fast slow gap", "Medium"),
    ("Determine if a directed graph has a cycle using DFS with a visited stack tracking recursion state", "Medium"),
    ("Given a character sequence find the character that appears most using a sliding window frequency map", "Medium"),
    ("Implement the Dutch national flag algorithm to sort 0s 1s and 2s in one pass with three pointers", "Medium"),
    ("Given a list of words build a frequency map and return the top k frequent words using a heap", "Medium"),
    ("Find the minimum number of jumps to reach the end of an array using greedy tracking of current range", "Medium"),
    ("Given a binary search tree serialize it to a string and deserialize it back using preorder traversal", "Medium"),
    ("Find all critical connections in a network graph whose removal increases components using bridge detection", "Medium"),
    ("Given a grid with obstacles find the number of unique paths from top-left to bottom-right using DP", "Medium"),
    ("Implement a rolling hash to detect repeated patterns in a string", "Medium"),
    ("Given an array find the maximum length subarray with equal number of 0s and 1s using prefix sum hash map", "Medium"),
    ("Find the minimum cost to connect all points using Kruskal's algorithm with a union-find data structure", "Medium"),
    ("Given a binary tree flatten it to a linked list in preorder using recursive rewiring", "Medium"),
    ("Determine the number of distinct islands in a binary grid using DFS and canonical shape encoding", "Medium"),
    ("Given a string return all possible palindrome partitions using backtracking with precomputed palindrome table", "Medium"),
    ("Find the longest common prefix among a list of strings using vertical scanning", "Medium"),
    ("Given a weighted directed graph detect if it contains a negative cycle using Bellman-Ford relaxation", "Medium"),
    ("Given an integer find the square root using binary search without built-in math functions", "Medium"),
    ("Implement power function with integer exponent using fast exponentiation by squaring", "Medium"),
    ("Given a list of characters perform in-place compression encoding consecutive repeated characters with count", "Medium"),
    ("Find all valid combinations of k numbers that sum to n using backtracking with pruning on remaining sum", "Medium"),
    ("Given a tree find the lowest common ancestor of two nodes using recursive DFS", "Medium"),
    ("Find the length of the longest subarray with sum equal to k using prefix sum and hash map", "Medium"),
    ("Given a string find the minimum window that contains all characters of a target using sliding window two pointers", "Medium"),
    ("Determine the number of provinces in a graph represented as adjacency matrix using union-find", "Medium"),
    ("Given a binary tree count the number of nodes at each level using BFS with queue", "Medium"),
    ("Find the number of bit flips needed to convert one integer to another using XOR and popcount", "Medium"),
    ("Given a sorted linked list remove all nodes that have duplicate numbers using dummy node technique", "Medium"),
    ("Implement insertion sort and measure time complexity behavior on nearly sorted inputs", "Medium"),
    ("Given a matrix rotate it 90 degrees clockwise in-place using transpose followed by reversal", "Medium"),
    ("Find the maximum area rectangle in a histogram using a monotonic stack", "Medium"),
    ("Given an unsorted array find two elements that sum to a target value using a single-pass hash map", "Medium"),
    ("Find the total number of valid parenthesis strings of length 2n using Catalan number DP", "Medium"),
    ("Given a graph with weighted edges find the shortest path using Dijkstra's algorithm with priority queue", "Medium"),
    ("Implement string compression replacing consecutive repeated characters by character and count", "Medium"),
]

HARD_SYNTHETIC = [
    ("Find the maximum sum rectangle in a 2D matrix using Kadane's algorithm applied column by column with 2D DP", "Hard"),
    ("Solve the N-queens problem placing N queens on an NxN chessboard using backtracking with column and diagonal conflict tracking", "Hard"),
    ("Given a string and pattern with wildcards implement regular expression matching using 2D dynamic programming state transitions", "Hard"),
    ("Find the maximum flow in a flow network using Ford-Fulkerson with BFS augmenting paths Edmonds-Karp variant", "Hard"),
    ("Given two strings find the shortest common supersequence length using 2D DP with longest common subsequence base", "Hard"),
    ("Solve the 0-1 knapsack problem with item weight and value constraints using 2D DP tracking capacity", "Hard"),
    ("Implement a segment tree supporting range sum queries and point updates in O(log n) with lazy propagation for range updates", "Hard"),
    ("Find the minimum number of operations to convert one string to another using edit distance 2D DP", "Hard"),
    ("Given a list of intervals find the minimum number of arrows to burst all balloons using greedy sorting by end position", "Hard"),
    ("Solve the traveling salesman problem on a small graph using bitmask dynamic programming over subsets of visited cities", "Hard"),
    ("Implement a Fenwick tree binary indexed tree supporting prefix sum queries and point updates in O(log n)", "Hard"),
    ("Given a grid find the shortest path from source to destination using A-star search with Manhattan distance heuristic", "Hard"),
    ("Find the kth smallest element in a sorted matrix using binary search on value range and element counting", "Hard"),
    ("Solve the burst balloons problem using interval DP with memoization over all possible last balloons to burst in range", "Hard"),
    ("Given a string find all palindrome substrings using Manacher's algorithm in linear time", "Hard"),
    ("Implement a persistent segment tree that supports point updates and historical range queries over multiple versions", "Hard"),
    ("Find the number of ways to tile a 2xN board using 1x2 dominoes using matrix exponentiation for large N", "Hard"),
    ("Solve the stone game problem using minimax DP over intervals where two players pick optimally from array ends", "Hard"),
    ("Given a directed graph find all strongly connected components using Kosaraju's two DFS passes algorithm", "Hard"),
    ("Implement a heavy-light decomposition to answer path queries on a tree in O(log squared n) time", "Hard"),
    ("Solve the egg drop problem finding the minimum number of trials to determine a critical floor using 2D DP", "Hard"),
    ("Find the longest increasing path in a matrix using DFS with memoization over all cells", "Hard"),
    ("Given an array find the number of subarrays with sum divisible by k using prefix sum modulo counting with hash map", "Hard"),
    ("Solve the alien dictionary problem by extracting character ordering from sorted words and performing topological sort", "Hard"),
    ("Find the maximum profit in stock trading with at most k transactions using 3D DP over days and transactions", "Hard"),
    ("Implement suffix array construction and LCP array computation for string pattern matching in O(n log n)", "Hard"),
    ("Solve the minimum cost to cut a stick into segments using interval DP tracking optimal cut positions", "Hard"),
    ("Given a chessboard find all knight tour paths visiting every square exactly once using backtracking with Warnsdorff heuristic", "Hard"),
    ("Implement an online median finder using two heaps a max-heap for lower half and min-heap for upper half balancing", "Hard"),
    ("Solve the interleaving string problem checking if a third string is formed by interleaving two strings using 2D DP", "Hard"),
    ("Find the number of distinct permutations of a string with duplicate characters using factorial divided by repeated counts", "Hard"),
    ("Given a binary tree find the maximum path sum between any two nodes using DFS tracking max contribution at each node", "Hard"),
    ("Solve the arithmetic expression evaluation problem parsing with parentheses using a stack-based recursive descent parser", "Hard"),
    ("Implement Dijkstra's algorithm with a priority queue for dense graphs and track shortest distances to all vertices", "Hard"),
    ("Solve the palindrome partitioning minimum cuts problem using 2D DP with Manacher preprocessing", "Hard"),
    ("Given a set of rectangles find the total area covered by their union using coordinate compression and sweep line", "Hard"),
    ("Implement a suffix automaton for efficient substring counting and occurrence tracking in linear time and space", "Hard"),
    ("Solve the longest common substring problem for multiple strings using generalized suffix array with LCP", "Hard"),
    ("Implement the Aho-Corasick automaton for multi-pattern string matching in linear time with failure links", "Hard"),
    ("Solve the optimal binary search tree problem minimizing expected search cost using interval DP on key frequencies", "Hard"),
    ("Given a graph find the minimum vertex cover using maximum bipartite matching and König's theorem", "Hard"),
    ("Solve the matrix chain multiplication problem finding the optimal parenthesization using interval DP on matrix dimensions", "Hard"),
    ("Find the longest bitonic subsequence in an array using two LIS computation passes forward and backward", "Hard"),
    ("Solve the word ladder problem in minimum steps using bidirectional BFS from both source and target simultaneously", "Hard"),
    ("Find the number of paths in a DAG from source to sink using topological sort and DP over vertices", "Hard"),
    ("Find the minimum cost to reach the bottom-right corner of a weighted grid using Dijkstra on a 2D graph", "Hard"),
    ("Solve the painter's partition problem dividing an array into k partitions minimizing maximum partition sum using binary search", "Hard"),
    ("Given a tree find all centroid decomposition layers and use them to answer path distance queries efficiently", "Hard"),
    ("Implement a treap combining BST and heap properties with randomized priority for balanced expected height", "Hard"),
    ("Solve the job scheduling problem with deadlines and weights to maximize total weight using DP with binary search", "Hard"),
    ("Find the largest rectangle in a histogram using a monotonic stack tracking bar indices and computing area on pop", "Hard"),
    ("Solve the count of range sum problem counting subarrays with sum in a given range using merge sort divide and conquer", "Hard"),
    ("Given a weighted bipartite graph find the maximum weight matching using the Hungarian algorithm", "Hard"),
    ("Implement offline LCA computation for multiple queries using Euler tour and sparse table for range minimum query", "Hard"),
    ("Solve the wildcard string matching problem using 2D DP handling question mark and star wildcards over characters", "Hard"),
    ("Find the minimum cut in a directed graph using max-flow min-cut theorem with Dinic's algorithm", "Hard"),
    ("Solve the count of smaller numbers after self problem using a modified merge sort tracking inversions across partitions", "Hard"),
    ("Given a weighted DAG find the longest path using topological sort and DP relaxation on edges", "Hard"),
    ("Implement a compressed trie or Patricia trie for space-efficient prefix storage and fast IP routing lookup", "Hard"),
    ("Find all critical articulation vertices in a graph using Tarjan's algorithm with low and disc discovery time arrays", "Hard"),
    ("Solve the number of ways to decode a digit string to letters using 1D DP handling single and double digit decodings", "Hard"),
    ("Given a tree decompose it using Euler tour to convert LCA and path queries into array range minimum queries", "Hard"),
    ("Solve the K-th permutation sequence problem for digits 1 to n using factorial number system decomposition", "Hard"),
    ("Find the longest substring containing at most k distinct characters using a sliding window with character frequency tracking", "Hard"),
    ("Solve the Russian doll envelopes problem finding the maximum number of nested envelopes using 2D LIS with binary search", "Hard"),
    ("Given a graph determine if it has an Eulerian circuit by checking vertex degree parity and graph connectivity with DFS", "Hard"),
    ("Implement a convex hull algorithm using Graham scan on a set of 2D points in O(n log n)", "Hard"),
    ("Find the number of distinct substrings of a string in O(n log n) using suffix array and LCP array computation", "Hard"),
    ("Solve the scrambled string problem checking if one string is a scrambled version of another using 3D interval DP", "Hard"),
    ("Given a weighted tree find the minimum spanning tree using Boruvka's algorithm with component merging iterations", "Hard"),
    ("Solve the maximum sum increasing subsequence problem where selected elements form an increasing sequence maximizing sum using DP", "Hard"),
    ("Solve the robot room cleaner problem in a grid with obstacles using DFS backtracking with relative direction tracking", "Hard"),
    ("Implement a randomized skip list data structure supporting O(log n) expected insert search and delete operations", "Hard"),
    ("Find the optimal strategy for a matrix game using saddle point or linear programming duality and minimax theorem", "Hard"),
    ("Given N ropes find the minimum cost to connect all ropes using a min-heap and Huffman coding greedy strategy", "Hard"),
    ("Solve the number of distinct palindromic subsequences in a string using interval DP handling unique character boundary pairs", "Hard"),
    ("Find the maximum of each window of size k in an array using a monotonic deque in O(n) time", "Hard"),
    ("Solve the longest zigzag subsequence problem using DP tracking the last direction of each step in the sequence", "Hard"),
    ("Implement the Miller-Rabin primality test for large numbers using modular exponentiation and witness checking", "Hard"),
    ("Find the maximum flow with minimum cost using the successive shortest paths algorithm with SPFA", "Hard"),
    ("Solve the 0-1 BFS shortest path problem in a grid with edge weights of 0 or 1 using a double-ended queue deque", "Hard"),
    ("Given a tree find the diameter using two BFS passes from arbitrary node to farthest then to farthest again", "Hard"),
    ("Implement offline square root decomposition for answering range queries with infrequent updates in O(sqrt n) per query", "Hard"),
    ("Solve the count of inversions problem in an array using merge sort and counting cross-partition inversions during merge phase", "Hard"),
    ("Find the minimum number of perfect squares that sum to n using BFS level-by-level exploration of reachable sums", "Hard"),
    ("Solve the weighted interval scheduling problem selecting non-overlapping intervals to maximize total weight using DP binary search", "Hard"),
    ("Implement a persistent data structure for functional updates allowing access to all historical versions of the array", "Hard"),
    ("Solve the maximum independent set problem on a tree using DP tracking whether each node is included or excluded", "Hard"),
    ("Find the number of ways to partition a set into two subsets with equal sum using subset-sum 2D DP", "Hard"),
    ("Implement the Berlekamp-Massey algorithm to find the shortest linear recurrence for a given integer sequence", "Hard"),
    ("Solve the K server problem on a line graph using DP tracking server positions with min-cost matching", "Hard"),
    ("Given a string find the lexicographically smallest rotation using suffix array or Booth's algorithm", "Hard"),
    ("Solve the minimum cost flow problem on a network using successive shortest paths and augmenting along cheapest routes", "Hard"),
    ("Implement a dynamic segment tree that allocates nodes lazily for large sparse range queries and updates", "Hard"),
    ("Solve the maximum sum of non-adjacent elements in a circular array using two DP passes excluding first or last element", "Hard"),
    ("Given N points on a plane find the pair with the minimum Euclidean distance using divide and conquer in O(n log n)", "Hard"),
    ("Solve the all-pairs shortest path problem using Floyd-Warshall 3D DP handling intermediate vertex relaxations", "Hard"),
    ("Find the number of valid bracket sequences of length 2n using Catalan number closed form or DP counting valid states", "Hard"),
]


def generate_difficulty_data(db):
    """
    Build difficulty training data using ONLY the clean synthetic examples.

    WHY we skip real DB problems:
      The 500 real problems from server-db.json use company names, topic labels
      (Arrays, Hashing, Linked Lists), and generic placement-style prose as their
      text. This vocabulary does NOT correlate with Easy/Medium/Hard difficulty —
      any topic can appear at any level. Including these rows adds noise that
      actively hurts TF-IDF classification (CV std was 0.24, meaning near-random
      performance in some folds).

      The synthetic examples use precise algorithmic vocabulary that IS strongly
      correlated with difficulty (e.g. "segment tree lazy propagation" is always
      Hard; "reverse a string" is always Easy). Training only on these gives the
      classifier clean, consistent signal.

    The real problems are still used for the Recommender and Metadata models.
    """
    rows = []

    # Synthetic examples only — 100 per class with discriminative vocabulary
    for text, diff in EASY_SYNTHETIC + MEDIUM_SYNTHETIC + HARD_SYNTHETIC:
        rows.append({"text": text, "difficulty": diff})

    df = pd.DataFrame(rows)
    df = df.dropna(subset=["text", "difficulty"])
    df = df[df["difficulty"].isin(["Easy", "Medium", "Hard"])]

    out_path = os.path.join(OUT_DIR, "difficulty_training.csv")
    df.to_csv(out_path, index=False)

    dist = df["difficulty"].value_counts()
    print(f"[OK] Difficulty data: {len(df)} rows saved to {out_path}")
    print(f"     Difficulty Training Data (synthetic only)")
    print(f"     Easy   : {dist.get('Easy', 0)}")
    print(f"     Medium : {dist.get('Medium', 0)}")
    print(f"     Hard   : {dist.get('Hard', 0)}")
    return df


# -----------------------------------------------------------------------------
# 3. Problem Recommendation Interaction Data
# -----------------------------------------------------------------------------
def generate_recommendation_data(db, n_users=200):
    problems = db.get("problems", [])
    prob_ids = [p["id"] for p in problems[:100]]  # Use first 100 for tractability

    rows = []
    # Real users
    for user in db.get("users", []):
        uid = user.get("id", "")
        for pid in user.get("problemsSolved", []):
            if pid in prob_ids:
                rows.append({"user_id": uid, "problem_id": pid, "solved": 1})

    # Synthetic users
    for i in range(n_users):
        uid = f"synthetic-user-{i}"
        level = random.randint(1, 10)
        n_solved = random.randint(1, min(30, len(prob_ids)))
        solved_probs = random.sample(prob_ids, n_solved)
        for pid in solved_probs:
            rows.append({"user_id": uid, "problem_id": pid, "solved": 1})

    df = pd.DataFrame(rows).drop_duplicates()
    out_path = os.path.join(OUT_DIR, "recommendation_interactions.csv")
    df.to_csv(out_path, index=False)
    print(f"[OK] Recommendation data: {len(df)} rows saved to {out_path}")
    return df


# -----------------------------------------------------------------------------
# 4. Save Problem Metadata (for recommender content features)
# -----------------------------------------------------------------------------
def save_problem_metadata(db):
    problems = db.get("problems", [])
    rows = []
    for prob in problems:
        tags = " ".join(prob.get("tags", []))
        text = f"{prob.get('title', '')} {tags} {prob.get('description', '')} {prob.get('difficulty', '')}"
        rows.append({
            "problem_id": prob.get("id", ""),
            "title": prob.get("title", ""),
            "difficulty": prob.get("difficulty", "Easy"),
            "tags": tags,
            "text": text.strip()
        })
    df = pd.DataFrame(rows)
    out_path = os.path.join(OUT_DIR, "problem_metadata.csv")
    df.to_csv(out_path, index=False)
    print(f"[OK] Problem metadata: {len(df)} rows saved to {out_path}")
    return df


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("Placify ML -- Training Data Generator")
    print("=" * 60)
    db = load_db()
    print(f"[DB] Users: {len(db.get('users', []))}, "
          f"Problems: {len(db.get('problems', []))}, "
          f"Submissions: {len(db.get('submissions', []))}")

    generate_placement_data(db)
    generate_difficulty_data(db)
    generate_recommendation_data(db)
    save_problem_metadata(db)

    print("=" * 60)
    print("[DONE] All training datasets generated successfully!")
    print("=" * 60)
