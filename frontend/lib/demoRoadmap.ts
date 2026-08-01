/**
 * demoRoadmap.ts — Static demo data for the public "Demo Course" page.
 * ──────────────────────────────────────────────────────────────────
 * This is hand-authored, hard-coded content — NOT fetched from the backend
 * and NOT tied to any user. It exists purely so visitors on the landing
 * page can preview what a real, AI-generated VazhiAI roadmap looks like
 * before signing up.
 *
 * Persona this roadmap was written for:
 *   2nd Year Computer Science (Core) Engineering Student
 *   Career Goal: Become a Software Developer
 *
 * Not every day has full detail (topics/resources/practice/MCQs/assignment)
 * hand-authored — that would be a huge amount of hand-written content to
 * keep accurate. Instead, a representative set of "unlocked" days across
 * every module gets the full experience, and the remaining days show up
 * in the outline (so the full plan still feels real and complete) but
 * render a "sign up to unlock" teaser — which doubles as a natural
 * call-to-action.
 */
import { RoadmapOutlineItem, DayRoadmapDetails } from "@/types";

export const DEMO_ROADMAP_META = {
  title: "Software Developer Career Roadmap",
  description:
    "A personalized roadmap for a 2nd-year Computer Science student aiming to become a Software Developer — covering programming fundamentals, OOP, data structures & algorithms, databases, OS & networks, Git/GitHub, web development, system design, a deployed capstone project, and placement preparation.",
  duration_weeks: 5,
  experience_level: "Beginner-Friendly",
  available_time: "2–3 hours/day",
  learning_pace: "Standard",
  user_field: "Computer Science / IT",
  user_educational_status: "Student",
  user_dream_job: "Software Developer",
};

export const demoOutline: RoadmapOutlineItem[] = [
  // ── Module 1: Programming & OOP Foundations ──────────────────────────
  { day: 1, title: "Programming Fundamentals Refresher (C & Java Basics)", focus: "Warm up on variables, control flow, and I/O — the building blocks everything else is built on.", module: "Module 1: Programming & OOP Foundations", difficulty: "Beginner" },
  { day: 2, title: "Functions, Recursion & Memory Management", focus: "Master function design, parameter passing, and recursive problem-solving patterns like factorial and Fibonacci.", module: "Module 1: Programming & OOP Foundations", difficulty: "Beginner" },
  { day: 3, title: "Object-Oriented Programming in Java", focus: "Learn classes, encapsulation, inheritance, and polymorphism — the foundation of real-world software design.", module: "Module 1: Programming & OOP Foundations", difficulty: "Beginner" },
  { day: 4, title: "OOP Design Principles & SOLID Basics", focus: "Apply SOLID principles to write maintainable, extensible object-oriented code.", module: "Module 1: Programming & OOP Foundations", difficulty: "Intermediate" },

  // ── Module 2: Data Structures & Algorithms ───────────────────────────
  { day: 5, title: "Arrays, Strings & Time Complexity", focus: "Build intuition for Big-O analysis while solving classic array and string problems.", module: "Module 2: Data Structures & Algorithms", difficulty: "Intermediate" },
  { day: 6, title: "Linked Lists (Singly, Doubly, Circular)", focus: "Implement and manipulate linked list structures, including reversal and cycle detection.", module: "Module 2: Data Structures & Algorithms", difficulty: "Intermediate" },
  { day: 7, title: "Stacks, Queues & Their Applications", focus: "Use stacks and queues to solve real problems like balanced parentheses and BFS traversal.", module: "Module 2: Data Structures & Algorithms", difficulty: "Intermediate" },
  { day: 8, title: "Trees, Binary Search Trees & Traversals", focus: "Build BSTs and practice in-order, pre-order, and post-order traversal techniques.", module: "Module 2: Data Structures & Algorithms", difficulty: "Intermediate" },
  { day: 9, title: "Sorting, Searching & Hashing Techniques", focus: "Compare sorting algorithms and use hashing to solve lookup problems efficiently.", module: "Module 2: Data Structures & Algorithms", difficulty: "Intermediate" },

  // ── Module 3: Databases ──────────────────────────────────────────────
  { day: 10, title: "SQL & Relational Database Design", focus: "Design normalized schemas and write JOIN, GROUP BY, and subquery-based SQL.", module: "Module 3: Databases", difficulty: "Intermediate" },
  { day: 11, title: "Indexing, Transactions & NoSQL Basics", focus: "Understand database indexing for performance, ACID transactions, and when to reach for NoSQL.", module: "Module 3: Databases", difficulty: "Intermediate" },

  // ── Module 4: Operating Systems & Computer Networks ──────────────────
  { day: 12, title: "Operating Systems: Processes, Threads & Scheduling", focus: "Learn how OSes manage processes, threads, scheduling, and deadlocks.", module: "Module 4: Operating Systems & Computer Networks", difficulty: "Intermediate" },
  { day: 13, title: "Computer Networks: OSI, TCP/IP & HTTP", focus: "Understand how data actually travels from your browser to a server and back.", module: "Module 4: Operating Systems & Computer Networks", difficulty: "Intermediate" },

  // ── Module 5: Git, GitHub & Web Development ──────────────────────────
  { day: 14, title: "Git & GitHub Version Control Workflow", focus: "Get comfortable with branching, merging, and collaborating through Pull Requests.", module: "Module 5: Git, GitHub & Web Development", difficulty: "Beginner" },
  { day: 15, title: "Frontend Basics: HTML, CSS & JavaScript", focus: "Build responsive web pages using semantic HTML, modern CSS, and vanilla JavaScript.", module: "Module 5: Git, GitHub & Web Development", difficulty: "Beginner" },
  { day: 16, title: "Backend Basics: REST APIs with Node & Express", focus: "Design and build RESTful APIs with Node.js and Express, connected to a database.", module: "Module 5: Git, GitHub & Web Development", difficulty: "Intermediate" },

  // ── Module 6: System Design & Capstone Project ───────────────────────
  { day: 17, title: "System Design Fundamentals", focus: "Learn how large systems scale — load balancing, caching, and database scaling.", module: "Module 6: System Design & Capstone Project", difficulty: "Advanced" },
  { day: 18, title: "Design Patterns & Clean Code Practices", focus: "Learn common design patterns (Singleton, Factory, Observer) and clean code conventions used in industry.", module: "Module 6: System Design & Capstone Project", difficulty: "Advanced" },
  { day: 19, title: "Build & Deploy a Full-Stack Portfolio Project", focus: "Ship a real, live project end-to-end — the single highest-leverage thing for your resume.", module: "Module 6: System Design & Capstone Project", difficulty: "Advanced" },

  // ── Module 7: Placement Preparation ──────────────────────────────────
  { day: 20, title: "Resume & Portfolio Development", focus: "Turn your projects into an ATS-friendly resume and a polished personal portfolio.", module: "Module 7: Placement Preparation", difficulty: "Advanced" },
  { day: 21, title: "Aptitude & Interview Preparation (Technical + HR)", focus: "Sharpen quantitative aptitude, rapid-fire CS fundamentals, and HR interview storytelling.", module: "Module 7: Placement Preparation", difficulty: "Advanced" },
];

/** Days with fully hand-authored detail (topics/resources/practice/MCQs/assignment). */
export const DEMO_FULL_DAYS: Set<number> = new Set([1, 3, 5, 9, 10, 12, 13, 14, 17, 19, 20, 21]);

export const demoDayDetails: Record<number, DayRoadmapDetails> = {
  1: {
    day: 1,
    title: "Programming Fundamentals Refresher (C & Java Basics)",
    duration: "3 hours",
    topics: [
      "Variables, Data Types & Operators",
      "Control Flow (if-else, loops, switch)",
      "Input/Output Handling in Java",
      "Writing & Compiling Your First Programs",
    ],
    resources: [
      { type: "documentation", title: "Java Language Basics — Oracle Docs", link: "https://docs.oracle.com/javase/tutorial/java/nutsandbolts/index.html" },
      { type: "tutorial", title: "Java Tutorial — W3Schools", link: "https://www.w3schools.com/java/" },
      { type: "youtube", title: "Java Programming for Beginners — Full Course", link: "https://www.youtube.com/results?search_query=java+programming+for+beginners+full+course" },
      { type: "practice", title: "HackerRank — Java Practice Track", link: "https://www.hackerrank.com/domains/java" },
    ],
    practice: [
      { problem: "Sum of Two Numbers", platform: "HackerRank", difficulty: "Easy", link: "https://www.hackerrank.com/domains/java" },
      { problem: "FizzBuzz", platform: "LeetCode", difficulty: "Easy", link: "https://leetcode.com/problems/fizz-buzz/description/" },
    ],
    mcqTest: [
      { question: "What is the default value of an uninitialized local variable in Java?", options: ["A) 0", "B) null", "C) It must be initialized before use", "D) Depends on the IDE"], answer: "C", difficulty: "Easy" },
      { question: "Which loop guarantees the loop body executes at least once?", options: ["A) for", "B) while", "C) do-while", "D) switch"], answer: "C", difficulty: "Easy" },
      { question: "What does the modulus operator (%) return?", options: ["A) The quotient", "B) The remainder of division", "C) A rounded average", "D) A boolean"], answer: "B", difficulty: "Medium" },
      { question: "Which of the following is NOT a primitive data type in Java?", options: ["A) int", "B) char", "C) String", "D) boolean"], answer: "C", difficulty: "Hard" },
    ],
    codingAssignment: "Write a Java program that takes a student's marks in 5 subjects as input, calculates the total and percentage, and prints the grade (A/B/C/D/F) based on standard grading thresholds. Use if-else and formatted output.",
    revisionTasks: [
      "Re-implement the grade calculator using a switch statement instead of if-else.",
      "List all 8 primitive data types in Java from memory.",
      "Write pseudocode for a program that checks if a number is prime.",
    ],
  },

  3: {
    day: 3,
    title: "Object-Oriented Programming in Java",
    duration: "3 hours",
    topics: [
      "Classes, Objects & Constructors",
      "Encapsulation & Access Modifiers",
      "Inheritance & Method Overriding",
      "Polymorphism & Abstraction",
    ],
    resources: [
      { type: "documentation", title: "Object-Oriented Programming Concepts — Oracle", link: "https://docs.oracle.com/javase/tutorial/java/concepts/index.html" },
      { type: "tutorial", title: "OOP Concepts in Java — GeeksforGeeks", link: "https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/" },
      { type: "youtube", title: "Object-Oriented Programming in Java — Full Tutorial", link: "https://www.youtube.com/results?search_query=object+oriented+programming+java+full+tutorial" },
      { type: "practice", title: "HackerRank — OOP in Java Practice", link: "https://www.hackerrank.com/domains/java" },
    ],
    practice: [
      { problem: "Design a Library Management System (Class Design)", platform: "GeeksforGeeks", difficulty: "Medium", link: "https://www.geeksforgeeks.org/explore?page=1&search=oop+design" },
      { problem: "Implement a Shape Hierarchy with Polymorphism", platform: "HackerRank", difficulty: "Medium", link: "https://www.hackerrank.com/domains/java" },
    ],
    mcqTest: [
      { question: "Which OOP pillar lets a subclass provide its own implementation of a method from its superclass?", options: ["A) Encapsulation", "B) Polymorphism", "C) Abstraction", "D) Composition"], answer: "B", difficulty: "Easy" },
      { question: "Which keyword prevents a class from being inherited in Java?", options: ["A) static", "B) private", "C) final", "D) const"], answer: "C", difficulty: "Easy" },
      { question: "Which access modifier restricts visibility to only within the same class?", options: ["A) public", "B) protected", "C) default", "D) private"], answer: "D", difficulty: "Medium" },
      { question: "What term describes hiding internal implementation and exposing only necessary functionality?", options: ["A) Inheritance", "B) Abstraction", "C) Overloading", "D) Casting"], answer: "B", difficulty: "Hard" },
    ],
    codingAssignment: "Design a small 'Vehicle' class hierarchy: a base class Vehicle with fields (brand, speed) and a method displayInfo(), then two subclasses Car and Bike that override displayInfo() to add their own details. Instantiate objects of each and demonstrate polymorphism using a Vehicle reference.",
    revisionTasks: [
      "Explain the difference between overloading and overriding with an example.",
      "List real-world analogies for all 4 OOP pillars.",
      "Refactor the Vehicle assignment to use an interface instead of a base class.",
    ],
  },

  5: {
    day: 5,
    title: "Arrays, Strings & Time Complexity",
    duration: "3 hours",
    topics: [
      "Array Traversal & Manipulation",
      "String Operations & Immutability",
      "Two-Pointer Technique",
      "Big-O Notation & Complexity Analysis",
    ],
    resources: [
      { type: "documentation", title: "Arrays — Oracle Java Docs", link: "https://docs.oracle.com/javase/tutorial/java/nutsandbolts/arrays.html" },
      { type: "tutorial", title: "Array Data Structure — GeeksforGeeks", link: "https://www.geeksforgeeks.org/array-data-structure/" },
      { type: "youtube", title: "Arrays & Time Complexity — Data Structures Tutorial", link: "https://www.youtube.com/results?search_query=arrays+and+time+complexity+data+structures+tutorial" },
      { type: "practice", title: "LeetCode — Problem Set", link: "https://leetcode.com/problemset/" },
    ],
    practice: [
      { problem: "Two Sum", platform: "LeetCode", difficulty: "Easy", link: "https://leetcode.com/problems/two-sum/description/" },
      { problem: "Reverse a String In-Place", platform: "HackerRank", difficulty: "Easy", link: "https://www.hackerrank.com/domains/algorithms?filters%5Bsubdomains%5D[]=warmup" },
    ],
    mcqTest: [
      { question: "What is the time complexity of accessing an element by index in an array?", options: ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n²)"], answer: "A", difficulty: "Easy" },
      { question: "What is the worst-case time complexity of linear search?", options: ["A) O(1)", "B) O(log n)", "C) O(n)", "D) O(n log n)"], answer: "C", difficulty: "Easy" },
      { question: "Why are Java Strings immutable?", options: ["A) To save keystrokes", "B) For thread-safety, security, and string-pool caching", "C) Because arrays are immutable", "D) It's a compiler limitation"], answer: "B", difficulty: "Medium" },
      { question: "Which technique is most efficient for finding a pair with a given sum in a SORTED array?", options: ["A) Brute force nested loop", "B) Two-pointer technique", "C) Recursion", "D) Bubble sort first"], answer: "B", difficulty: "Hard" },
    ],
    codingAssignment: "Given an unsorted array of integers, write a function to find the second-largest element in O(n) time without sorting. Then extend it to return the second-largest UNIQUE element.",
    revisionTasks: [
      "Solve 'Two Sum' first with brute force, then optimize using a HashMap.",
      "Write out the time complexity of your second-largest solution and justify it.",
      "Practice reversing a string both iteratively and recursively.",
    ],
  },

  9: {
    day: 9,
    title: "Sorting, Searching & Hashing Techniques",
    duration: "3 hours",
    topics: [
      "Bubble, Selection & Insertion Sort",
      "Merge Sort & Quick Sort",
      "Binary Search & Its Variants",
      "Hash Tables & Collision Handling",
    ],
    resources: [
      { type: "documentation", title: "Arrays.sort() — Java API Docs", link: "https://docs.oracle.com/javase/8/docs/api/java/util/Arrays.html" },
      { type: "tutorial", title: "Sorting Algorithms — GeeksforGeeks", link: "https://www.geeksforgeeks.org/sorting-algorithms/" },
      { type: "youtube", title: "Sorting Algorithms Explained — Merge Sort & Quick Sort", link: "https://www.youtube.com/results?search_query=sorting+algorithms+explained+merge+sort+quick+sort" },
      { type: "practice", title: "LeetCode — Problem Set", link: "https://leetcode.com/problemset/" },
    ],
    practice: [
      { problem: "Merge Sort Implementation", platform: "GeeksforGeeks", difficulty: "Medium", link: "https://www.geeksforgeeks.org/explore?page=1&search=merge+sort" },
      { problem: "Binary Search", platform: "LeetCode", difficulty: "Easy", link: "https://leetcode.com/problems/binary-search/description/" },
    ],
    mcqTest: [
      { question: "What is the average-case time complexity of Quick Sort?", options: ["A) O(n)", "B) O(n log n)", "C) O(n²)", "D) O(log n)"], answer: "B", difficulty: "Easy" },
      { question: "Binary Search requires the input array to be:", options: ["A) Sorted", "B) Reversed", "C) Unique-valued only", "D) Circular"], answer: "A", difficulty: "Easy" },
      { question: "Which is a common technique to resolve hash collisions?", options: ["A) Recursion", "B) Chaining / open addressing", "C) Binary search", "D) Memoization"], answer: "B", difficulty: "Medium" },
      { question: "Which sorting algorithm is stable AND has O(n log n) worst-case complexity?", options: ["A) Quick Sort", "B) Selection Sort", "C) Merge Sort", "D) Bubble Sort"], answer: "C", difficulty: "Hard" },
    ],
    codingAssignment: "Implement Merge Sort from scratch (no built-in sort functions) and use it to sort an array of student records by marks. Then implement binary search to look up a student's rank.",
    revisionTasks: [
      "Compare the time and space complexity of Merge Sort vs Quick Sort.",
      "Implement a simple hash table using separate chaining.",
      "Trace through Binary Search manually on a 10-element sorted array.",
    ],
  },

  10: {
    day: 10,
    title: "SQL & Relational Database Design",
    duration: "3 hours",
    topics: [
      "Relational Model & ER Diagrams",
      "SQL: SELECT, JOIN & GROUP BY",
      "Normalization (1NF–3NF)",
      "Primary/Foreign Keys & Constraints",
    ],
    resources: [
      { type: "documentation", title: "PostgreSQL Tutorial — Official Docs", link: "https://www.postgresql.org/docs/current/tutorial.html" },
      { type: "tutorial", title: "SQL Tutorial — W3Schools", link: "https://www.w3schools.com/sql/" },
      { type: "youtube", title: "SQL Full Course — Joins & Normalization", link: "https://www.youtube.com/results?search_query=sql+full+course+for+beginners+joins+normalization" },
      { type: "practice", title: "HackerRank — SQL Practice", link: "https://www.hackerrank.com/domains/sql" },
    ],
    practice: [
      { problem: "Employee–Department JOIN Queries", platform: "HackerRank", difficulty: "Medium", link: "https://www.hackerrank.com/domains/sql" },
      { problem: "Second Highest Salary", platform: "LeetCode", difficulty: "Medium", link: "https://leetcode.com/problems/second-highest-salary/description/" },
    ],
    mcqTest: [
      { question: "Which SQL clause is used to filter grouped results?", options: ["A) WHERE", "B) HAVING", "C) ORDER BY", "D) LIMIT"], answer: "B", difficulty: "Easy" },
      { question: "What does Third Normal Form (3NF) primarily eliminate?", options: ["A) Duplicate rows", "B) Transitive dependencies", "C) NULL values", "D) Foreign keys"], answer: "B", difficulty: "Medium" },
      { question: "Which JOIN returns all rows from both tables, matched where possible?", options: ["A) INNER JOIN", "B) LEFT JOIN", "C) FULL OUTER JOIN", "D) CROSS JOIN"], answer: "C", difficulty: "Medium" },
      { question: "A Foreign Key primarily enforces what?", options: ["A) Uniqueness within a table", "B) Referential integrity between tables", "C) Faster indexing", "D) Data encryption"], answer: "B", difficulty: "Hard" },
    ],
    codingAssignment: "Design a normalized database schema (up to 3NF) for a college management system with Students, Courses, and Enrollments. Write the CREATE TABLE statements and 3 SELECT queries (using JOIN, GROUP BY, and a subquery).",
    revisionTasks: [
      "Draw the ER diagram for your schema before writing SQL.",
      "Practice 5 JOIN queries on a sample dataset.",
      "Explain the difference between DELETE, TRUNCATE and DROP.",
    ],
  },

  12: {
    day: 12,
    title: "Operating Systems: Processes, Threads & Scheduling",
    duration: "3 hours",
    topics: [
      "Process vs Thread",
      "CPU Scheduling Algorithms (FCFS, SJF, Round Robin)",
      "Deadlocks & Prevention",
      "Memory Management Basics (Paging, Virtual Memory)",
    ],
    resources: [
      { type: "documentation", title: "Operating Systems — NPTEL", link: "https://nptel.ac.in/courses/106/105/106105214/" },
      { type: "tutorial", title: "Operating Systems — GeeksforGeeks", link: "https://www.geeksforgeeks.org/operating-systems/" },
      { type: "youtube", title: "Operating Systems — Scheduling & Deadlocks Explained", link: "https://www.youtube.com/results?search_query=operating+systems+process+scheduling+deadlock+tutorial" },
      { type: "practice", title: "GeeksforGeeks — OS Practice Questions", link: "https://www.geeksforgeeks.org/operating-systems/" },
    ],
    practice: [
      { problem: "CPU Scheduling Simulator (Round Robin)", platform: "GeeksforGeeks", difficulty: "Medium", link: "https://www.geeksforgeeks.org/explore?page=1&search=cpu+scheduling" },
      { problem: "Producer–Consumer Problem", platform: "Other", difficulty: "Medium", link: "https://www.geeksforgeeks.org/explore?page=1&search=producer+consumer+problem" },
    ],
    mcqTest: [
      { question: "Which scheduling algorithm can cause starvation of longer processes?", options: ["A) FCFS", "B) Round Robin", "C) Shortest Job First (SJF)", "D) Priority (aging-enabled)"], answer: "C", difficulty: "Easy" },
      { question: "Which of these is NOT one of the four necessary conditions for deadlock?", options: ["A) Mutual exclusion", "B) Hold and wait", "C) Preemption", "D) Circular wait"], answer: "C", difficulty: "Medium" },
      { question: "What is the main advantage of a thread over a process?", options: ["A) Threads have their own memory space", "B) Threads share memory and are lighter-weight", "C) Threads can't communicate", "D) Threads run slower"], answer: "B", difficulty: "Medium" },
      { question: "What does virtual memory primarily allow a system to do?", options: ["A) Run programs larger than physical RAM using disk as extension", "B) Delete unused files automatically", "C) Speed up the CPU clock", "D) Compress running programs"], answer: "A", difficulty: "Hard" },
    ],
    codingAssignment: "Simulate the Round Robin CPU scheduling algorithm (time quantum = 4) for a given set of 5 processes with arrival and burst times. Calculate and print the average waiting time and turnaround time.",
    revisionTasks: [
      "Compare FCFS, SJF and Round Robin with a worked example.",
      "List 2 real-world deadlock prevention strategies.",
      "Explain paging vs segmentation in your own words.",
    ],
  },

  13: {
    day: 13,
    title: "Computer Networks: OSI, TCP/IP & HTTP",
    duration: "3 hours",
    topics: [
      "OSI Model — 7 Layers",
      "TCP vs UDP",
      "IP Addressing & Subnetting Basics",
      "HTTP/HTTPS & the Request-Response Cycle",
    ],
    resources: [
      { type: "documentation", title: "HTTP Overview — MDN", link: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview" },
      { type: "tutorial", title: "Computer Networks — GeeksforGeeks", link: "https://www.geeksforgeeks.org/computer-network-tutorials/" },
      { type: "youtube", title: "Computer Networks — OSI & TCP/IP Explained", link: "https://www.youtube.com/results?search_query=computer+networks+osi+model+tcp+ip+explained" },
      { type: "practice", title: "GeeksforGeeks — Networking Practice Questions", link: "https://www.geeksforgeeks.org/computer-network-tutorials/" },
    ],
    practice: [
      { problem: "Subnetting Practice Problems", platform: "Other", difficulty: "Medium", link: "https://www.geeksforgeeks.org/explore?page=1&search=subnetting" },
      { problem: "Explain the TCP 3-Way Handshake (Write-up)", platform: "Other", difficulty: "Easy", link: "https://www.geeksforgeeks.org/explore?page=1&search=tcp+3-way+handshake" },
    ],
    mcqTest: [
      { question: "Which OSI layer is primarily responsible for routing?", options: ["A) Physical", "B) Data Link", "C) Network", "D) Transport"], answer: "C", difficulty: "Easy" },
      { question: "Which protocol guarantees reliable, ordered delivery of data?", options: ["A) UDP", "B) TCP", "C) IP", "D) ARP"], answer: "B", difficulty: "Easy" },
      { question: "What HTTP status code indicates a resource was 'Not Found'?", options: ["A) 200", "B) 301", "C) 404", "D) 500"], answer: "C", difficulty: "Medium" },
      { question: "What is the main purpose of DNS?", options: ["A) Encrypts network traffic", "B) Translates domain names to IP addresses", "C) Assigns MAC addresses", "D) Balances server load"], answer: "B", difficulty: "Hard" },
    ],
    codingAssignment: "Use your browser's DevTools (Network tab) to inspect the HTTP requests made when loading a website. Document the request method, status code, and 3 response headers for at least 2 requests.",
    revisionTasks: [
      "Draw and label all 7 layers of the OSI model from memory.",
      "Explain the difference between TCP and UDP with a real use-case for each.",
      "List 5 common HTTP status codes and what they mean.",
    ],
  },

  14: {
    day: 14,
    title: "Git & GitHub Version Control Workflow",
    duration: "2.5 hours",
    topics: [
      "Git Basics: init, add, commit, status",
      "Branching & Merging",
      "Resolving Merge Conflicts",
      "GitHub: Pull Requests & Collaboration Workflow",
    ],
    resources: [
      { type: "documentation", title: "Git Official Documentation", link: "https://git-scm.com/doc" },
      { type: "tutorial", title: "GitHub Get Started Guide", link: "https://docs.github.com/en/get-started" },
      { type: "youtube", title: "Git & GitHub Tutorial — Branching & Merging", link: "https://www.youtube.com/results?search_query=git+and+github+tutorial+for+beginners+branching+merging" },
      { type: "practice", title: "GitHub Skills — Interactive Courses", link: "https://github.com/skills" },
    ],
    practice: [
      { problem: "Create a Repo & Practice a Feature-Branch Workflow", platform: "Other", difficulty: "Easy", link: "https://github.com/skills" },
      { problem: "Resolve a Simulated Merge Conflict", platform: "Other", difficulty: "Medium", link: "https://github.com/skills/resolve-merge-conflicts" },
    ],
    mcqTest: [
      { question: "Which command stages changes for the next commit?", options: ["A) git commit", "B) git push", "C) git add", "D) git status"], answer: "C", difficulty: "Easy" },
      { question: "What does 'git clone' do?", options: ["A) Deletes a repository", "B) Creates a local copy of a remote repository", "C) Merges two branches", "D) Creates a new branch"], answer: "B", difficulty: "Easy" },
      { question: "A merge conflict is caused by:", options: ["A) Two commits with the same message", "B) Competing changes to the same lines in a file", "C) Pushing to the wrong remote", "D) An empty commit"], answer: "B", difficulty: "Medium" },
      { question: "Which GitHub feature is used to propose and review code changes before merging?", options: ["A) Issue", "B) Gist", "C) Pull Request", "D) Fork"], answer: "C", difficulty: "Hard" },
    ],
    codingAssignment: "Create a public GitHub repository for a small project. Make at least 3 commits with meaningful messages, create a new branch for a feature, and open a Pull Request merging it back into main.",
    revisionTasks: [
      "Practice resolving a merge conflict locally using a text editor.",
      "Write a good commit message following conventional commit style.",
      "Explore and star 3 open-source repositories relevant to your goal.",
    ],
  },

  17: {
    day: 17,
    title: "System Design Fundamentals",
    duration: "3.5 hours",
    topics: [
      "Client-Server Architecture",
      "Load Balancing & Horizontal Scaling",
      "Caching Strategies",
      "Database Scaling: Sharding & Replication",
    ],
    resources: [
      { type: "documentation", title: "AWS Well-Architected Framework", link: "https://aws.amazon.com/architecture/well-architected/" },
      { type: "tutorial", title: "System Design Roadmap — roadmap.sh", link: "https://roadmap.sh/system-design" },
      { type: "youtube", title: "System Design Fundamentals — Load Balancing & Caching", link: "https://www.youtube.com/results?search_query=system+design+fundamentals+for+beginners+load+balancing+caching" },
      { type: "practice", title: "System Design Primer — GitHub", link: "https://github.com/donnemartin/system-design-primer" },
    ],
    practice: [
      { problem: "Design a URL Shortener (Write-up)", platform: "Other", difficulty: "Medium", link: "https://github.com/donnemartin/system-design-primer" },
      { problem: "Design a Rate Limiter (Write-up)", platform: "Other", difficulty: "Hard", link: "https://github.com/donnemartin/system-design-primer" },
    ],
    mcqTest: [
      { question: "What is the primary purpose of a load balancer?", options: ["A) Encrypt traffic", "B) Distribute incoming traffic across multiple servers", "C) Compress database records", "D) Cache DNS lookups"], answer: "B", difficulty: "Easy" },
      { question: "Which caching strategy writes to the cache and the database at the same time?", options: ["A) Write-around", "B) Write-back", "C) Write-through", "D) Lazy loading"], answer: "C", difficulty: "Medium" },
      { question: "What is database sharding?", options: ["A) Encrypting a database", "B) Splitting a database into smaller pieces across servers", "C) Backing up a database daily", "D) Merging two databases"], answer: "B", difficulty: "Medium" },
      { question: "The CAP theorem describes a trade-off between which three properties (pick any 2 at a time)?", options: ["A) Consistency, Availability, Partition tolerance", "B) Caching, Authentication, Performance", "C) Cost, Accuracy, Precision", "D) Concurrency, Atomicity, Persistence"], answer: "A", difficulty: "Hard" },
    ],
    codingAssignment: "Write a 1-page high-level design document for a URL Shortener service (like bit.ly). Include: API design, database schema, and how you'd handle scaling to 10 million users a day.",
    revisionTasks: [
      "Sketch the architecture diagram for your URL Shortener.",
      "Explain the difference between vertical and horizontal scaling.",
      "Research and summarize one real outage caused by a scaling failure.",
    ],
  },

  19: {
    day: 19,
    title: "Build & Deploy a Full-Stack Portfolio Project",
    duration: "4 hours",
    topics: [
      "Planning a Portfolio-Worthy Project",
      "Connecting Frontend, Backend & Database",
      "Writing a Professional README",
      "Deploying to Vercel/Render/Netlify",
    ],
    resources: [
      { type: "documentation", title: "Vercel Deployment Docs", link: "https://vercel.com/docs" },
      { type: "tutorial", title: "Full-Stack Project Tutorials — freeCodeCamp", link: "https://www.freecodecamp.org/news/tag/full-stack/" },
      { type: "youtube", title: "Build & Deploy a Full-Stack Project — Portfolio Tutorial", link: "https://www.youtube.com/results?search_query=build+and+deploy+a+full+stack+project+portfolio+tutorial" },
      { type: "practice", title: "GitHub — Portfolio Project Ideas", link: "https://github.com/topics/portfolio" },
    ],
    practice: [
      { problem: "Deploy a Full-Stack App End-to-End", platform: "Other", difficulty: "Medium", link: "https://vercel.com/docs" },
      { problem: "Write a Professional Project README", platform: "Other", difficulty: "Easy", link: "https://www.makeareadme.com/" },
    ],
    mcqTest: [
      { question: "Why do recruiters value a live deployed link over just source code?", options: ["A) It looks nicer", "B) It proves the project actually works end-to-end", "C) It's required by GitHub", "D) It improves SEO"], answer: "B", difficulty: "Easy" },
      { question: "What should a good README always include?", options: ["A) Only the license", "B) Setup instructions, tech stack, and a live demo link", "C) The entire source code pasted in", "D) Nothing — code should speak for itself"], answer: "B", difficulty: "Medium" },
      { question: "Which is a common free platform for deploying a Next.js frontend?", options: ["A) Vercel", "B) Photoshop", "C) Figma", "D) Notion"], answer: "A", difficulty: "Medium" },
      { question: "Which is a common free platform for deploying a backend API?", options: ["A) Canva", "B) Render", "C) Slack", "D) Trello"], answer: "B", difficulty: "Hard" },
    ],
    codingAssignment: "Take a project you've already built (or plan to build) and deploy it end-to-end: frontend on Vercel/Netlify, backend on Render/Railway, with a working live link. Write a README with setup steps, tech stack, and screenshots.",
    revisionTasks: [
      "List 3 projects that would stand out most for a Software Developer resume.",
      "Add a live demo badge/link to your GitHub README.",
      "Ask a peer to review your project and give feedback.",
    ],
  },

  20: {
    day: 20,
    title: "Resume & Portfolio Development",
    duration: "2.5 hours",
    topics: [
      "ATS-Friendly Resume Structure",
      "Quantifying Achievements with Metrics",
      "Building a Personal Portfolio Website",
      "Optimizing Your LinkedIn & GitHub Profile",
    ],
    resources: [
      { type: "documentation", title: "Resume/CV Templates — Overleaf", link: "https://www.overleaf.com/latex/templates/tagged/cv" },
      { type: "tutorial", title: "Resume Writing Guides — freeCodeCamp", link: "https://www.freecodecamp.org/news/tag/resume/" },
      { type: "youtube", title: "How to Write a Software Developer Resume That Gets Interviews", link: "https://www.youtube.com/results?search_query=how+to+write+a+software+developer+resume+that+gets+interviews" },
      { type: "practice", title: "LinkedIn — Profile Optimization", link: "https://www.linkedin.com/" },
    ],
    practice: [
      { problem: "Rewrite 3 Resume Bullet Points Using the STAR/XYZ Method", platform: "Other", difficulty: "Easy", link: "https://www.freecodecamp.org/news/tag/resume/" },
      { problem: "Build a One-Page Portfolio Website", platform: "Other", difficulty: "Medium", link: "https://github.com/topics/portfolio" },
    ],
    mcqTest: [
      { question: "What does 'ATS' stand for in resume screening?", options: ["A) Applicant Tracking System", "B) Automated Talent Score", "C) Applicant Testing Software", "D) Advanced Text Scanner"], answer: "A", difficulty: "Easy" },
      { question: "Which format do most ATS parse most reliably?", options: ["A) A scanned image", "B) A single-column, text-based PDF/Word resume", "C) A heavily designed 3-column PDF", "D) A PowerPoint file"], answer: "B", difficulty: "Medium" },
      { question: "What's the recommended formula for a strong resume bullet point?", options: ["A) Just list the technology used", "B) Action verb + what you did + measurable impact", "C) A full paragraph description", "D) A quote from your manager"], answer: "B", difficulty: "Medium" },
      { question: "What should your developer portfolio website always include?", options: ["A) Your school timetable", "B) Links to your best 2–3 projects with live demos and source code", "C) A blog post every day", "D) Stock photos only"], answer: "B", difficulty: "Hard" },
    ],
    codingAssignment: "Rewrite your resume's experience/projects section using the formula: 'Action Verb + What You Built + Technology Used + Quantified Impact.' Then list 3 concrete improvements you'd make to your LinkedIn headline and About section.",
    revisionTasks: [
      "Get your resume reviewed by 2 peers or a senior.",
      "Ensure every bullet point has a number or measurable outcome where possible.",
      "Update your GitHub profile README with a short bio and pinned repos.",
    ],
  },

  21: {
    day: 21,
    title: "Aptitude & Interview Preparation (Technical + HR)",
    duration: "3 hours",
    topics: [
      "Quantitative Aptitude: Time-Speed-Distance & Percentages",
      "Logical Reasoning & Puzzles",
      "Core CS Rapid-Fire Review (DSA, DBMS, OS, CN)",
      "Common HR Questions & the STAR Method",
    ],
    resources: [
      { type: "documentation", title: "Aptitude Practice — IndiaBIX", link: "https://www.indiabix.com/aptitude/questions-and-answers/" },
      { type: "tutorial", title: "Technical Interview Questions — GeeksforGeeks", link: "https://www.geeksforgeeks.org/technical-interview-questions/" },
      { type: "youtube", title: "Top Computer Science Interview Questions & Answers", link: "https://www.youtube.com/results?search_query=top+computer+science+interview+questions+and+answers" },
      { type: "practice", title: "LeetCode — Interview Study Plans", link: "https://leetcode.com/study-plan/" },
    ],
    practice: [
      { problem: "Daily Aptitude Practice Set (Percentages & Time-Speed-Distance)", platform: "Other", difficulty: "Easy", link: "https://www.indiabix.com/aptitude/questions-and-answers/" },
      { problem: "Mock Technical Interview — Core CS Rapid Fire", platform: "Other", difficulty: "Medium", link: "https://www.geeksforgeeks.org/technical-interview-questions/" },
    ],
    mcqTest: [
      { question: "A train covers 60 km in 45 minutes. What is its speed in km/h?", options: ["A) 60 km/h", "B) 70 km/h", "C) 80 km/h", "D) 90 km/h"], answer: "C", difficulty: "Easy" },
      { question: "In the STAR method for HR interviews, what does the 'R' stand for?", options: ["A) Role", "B) Result", "C) Reason", "D) Response"], answer: "B", difficulty: "Easy" },
      { question: "What technique helps most with logical reasoning puzzles under time pressure?", options: ["A) Guessing randomly", "B) Process of elimination", "C) Re-reading the question 5 times", "D) Skipping straight to answer choices"], answer: "B", difficulty: "Medium" },
      { question: "What is the most common reason candidates fail technical interviews despite knowing the answer?", options: ["A) Wrong programming language", "B) Poor communication of their thought process", "C) Typing too fast", "D) Using a whiteboard"], answer: "B", difficulty: "Hard" },
    ],
    codingAssignment: "Pick 3 of your strongest projects and prepare a 60-second 'walk me through this project' pitch for each, focusing on the problem, your role, the tech stack, and the impact. Practice saying them out loud.",
    revisionTasks: [
      "Time yourself solving 10 aptitude questions in 12 minutes.",
      "Write STAR-method answers for 'Tell me about a time you faced a conflict in a team.'",
      "Do a mock interview with a friend and record your answers to review.",
    ],
  },
};
