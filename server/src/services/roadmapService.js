import OpenAI from "openai";
import { env } from "../config/env.js";

const openaiClient = env.openaiApiKey
  ? new OpenAI({ apiKey: env.openaiApiKey })
  : null;

export async function generateRoadmapImage({ companyType, timeline }) {
  if (!openaiClient) {
    console.error("[roadmap-image] OpenAI API key not configured. Image generation disabled.");
    console.error("[roadmap-image] Set OPENAI_API_KEY environment variable to enable DALL-E image generation");
    return null;
  }

  try {
    const timelineLabel = {
      "1_month": "1-Month Crash Sprint",
      "3_months": "3-Month Optimal Strategy",
      "6_months": "6-Month Complete Transformation"
    }[timeline];

    const companyLabel = companyType === "product" ? "Product-Based Companies" : "Service-Based Companies";

    const prompt = `Create a professional, colorful, and visually appealing infographic roadmap for placement interview preparation. 
    
    Topic: ${timelineLabel} for ${companyLabel}
    
    The infographic should include:
    - A clear timeline/phases at the top
    - Key milestones and achievements
    - Weekly or monthly breakdown with icons/visual elements
    - Color-coded sections for different topics (DSA, System Design, Behavioral, etc.)
    - Motivational elements and progress indicators
    - Professional corporate style with modern design
    - Clear typography and good use of whitespace
    
    Make it suitable for printing and highly motivational for students preparing for interviews.`;

    console.info("[roadmap-image] Requesting DALL-E image generation", { companyType, timeline });
    
    const response = await openaiClient.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
      style: "vivid"
    });

    const imageUrl = response.data[0].url;
    console.info("[roadmap-image] Image generated successfully", { companyType, timeline, urlLength: imageUrl.length });
    
    return imageUrl;
  } catch (error) {
    console.error("[roadmap-image] Failed to generate roadmap image:", {
      error: error.message,
      code: error.code,
      status: error.status,
      companyType,
      timeline
    });
    return null;
  }
}

export function generateRoadmap({ companyType, timeline }) {
  const roadmaps = {
    product: {
      "1_month": {
        title: "1-Month Crash Sprint for Product-Based Companies",
        answer: `# 1-Month Crash Sprint: Product Company Preparation

## Week 1: Foundation & Fundamentals
### DSA Intensive (5-6 hours/day)
- **Arrays & Strings**: Two pointers, sliding window, hashing (LeetCode Easy-Medium: 15-20 problems)
- **Core Concepts**: Time/Space complexity analysis
- **Daily Practice**: 3-4 problems, focus on pattern recognition

### System Design Basics (2 hours/day)
- Study scalability concepts
- Learn about databases, caching, load balancing fundamentals

### Behavioral Prep (1 hour/day)
- Prepare STAR method answers for common questions
- Research company culture and values

---

## Week 2-3: Core Competencies
### Advanced DSA (5-6 hours/day)
- **Linked Lists, Trees, Graphs**: BFS, DFS, Binary Search Trees
- **Dynamic Programming**: 0-1 Knapsack, LCS, Longest Increasing Subsequence
- **Problem Solving**: Medium difficulty problems (20-25 problems)

### Database & SQL (1-2 hours/day)
- SQL queries: JOINs, Aggregations, Indexing
- Practice 10-15 SQL problems

### Coding Challenges (1 hour/day)
- Online contests or mock interviews
- Focus on pressure handling

---

## Week 4: Polish & Practice
### Mock Interviews (4-5 hours/day)
- 2-3 mock technical interviews
- 1-2 mock HR rounds
- Get feedback and iterate

### Final Revision (2-3 hours/day)
- Revisit problem patterns
- Quick review of database concepts
- Refresh system design basics

### Day Before Interview
- Light revision only
- Sleep well
- Review company-specific information

---

## Daily Schedule Template
- **Morning (2-3 hrs)**: DSA problems
- **Afternoon (2-3 hrs)**: System design or specialized topics
- **Evening (1-2 hrs)**: Mock interviews or revision
- **Night (30 min)**: Reflection and next day planning

## Key Focus Areas
- **Data Structures**: Arrays, Strings, Hash Tables, Trees, Graphs
- **Algorithms**: Sorting, Searching, Dynamic Programming
- **Problem Solving**: Pattern recognition and optimization
- **Communication**: Explain your approach clearly

## Resources
- LeetCode (DSA problems)
- InterviewBit or HackerRank
- Educative.io (system design)
- Company specific prep on Blind`,
        infographicUrl: null
      },
      "3_months": {
        title: "3-Month Core Runway for Product-Based Companies",
        answer: `# 3-Month Optimal Strategy: Product Company Preparation

## Month 1: Strong Foundation Building
### Week 1-2: DSA Fundamentals
- **Arrays & Strings**: Master all basic patterns
- **Sorting Algorithms**: Understand time complexity trade-offs
- **Practice**: 25-30 problems across different patterns

### Week 3-4: Data Structures Deep Dive
- **Linked Lists**: Reversal, Cycle detection, Merge operations
- **Stacks & Queues**: Monotonic stacks, Sliding window maximums
- **Trees**: Traversals, Level-order, Path problems
- **Practice**: 25-30 problems

### Throughout Month 1:
- Build strong fundamentals
- Understand complexity analysis thoroughly
- Learn debugging techniques
- Start behavioral prep: Create 5-6 STAR stories

---

## Month 2: Advanced Problem Solving
### Week 1-2: Advanced DSA
- **Graphs**: BFS, DFS, Topological Sort, Shortest Path
- **Dynamic Programming**: Start with classics, progress to medium-hard
- **Binary Search**: Advanced variations
- **Practice**: 40-50 problems

### Week 3-4: System Design Foundations
- Scalability basics
- Database design patterns
- Caching strategies
- Load balancing concepts
- Complete 3-4 simple design scenarios

### Throughout Month 2:
- Increase problem difficulty gradually
- Time yourself during practice
- Start mock interviews
- Polish communication skills

---

## Month 3: Mastery & Interview Prep
### Week 1-2: Specialized Topics
- **Optimization**: Space-time tradeoffs
- **Advanced Graphs**: Network flow, minimum spanning trees
- **Bit Manipulation**: Common patterns
- **Practice**: 30-40 problems
- **System Design**: 5-6 medium complexity designs

### Week 3: Full Interview Simulation
- 3-4 mock technical interviews (with time pressure)
- 2 mock HR rounds
- Behavioral interview practice
- Technical presentation skills

### Week 4: Final Polish
- Revisit weak areas
- Review problem patterns
- System design final revision
- Company-specific preparation
- Rest and confidence building

---

## Daily Schedule (Flexible)
- **2-3 hours**: Focused DSA practice with new patterns
- **1-2 hours**: Reinforcement of previous patterns
- **1-2 hours**: System design or specialized topics
- **1 hour**: Mock interviews or communication practice
- **30 min**: Revision and planning

## Key Milestones
- **End of Month 1**: Comfortable with basic-medium DSA problems
- **End of Month 2**: Can solve medium-hard problems, basic system design
- **End of Month 3**: Ready for technical interviews

## Success Metrics
- Solve 150-200 unique DSA problems
- Complete 10+ system design scenarios
- Successfully complete 5+ mock interviews
- Strong behavioral stories prepared

## Resources
- LeetCode Premium (Curated Lists, Mock Interviews)
- System Design Primer
- Company-specific resources on Blind
- YouTube: Striver, TakeUForward, Tech With Tim`,
        infographicUrl: null
      },
      "6_months": {
        title: "6-Month Complete Transformation Profile",
        answer: `# 6-Month Complete Transformation: Product Company Mastery

## Month 1-2: Comprehensive Foundation
### Month 1: Core DSA & Fundamentals
- **Week 1-2**: Arrays, Strings, Hashing (40 problems)
- **Week 3-4**: Sorting, Searching, Basic Trees (35 problems)
- **Focus**: Understand WHY solutions work, not just memorization
- **Build**: Problem pattern library and solution templates

### Month 2: Data Structures Mastery
- **Week 1-2**: Advanced Trees, BSTs, Balanced Trees (40 problems)
- **Week 3-4**: Graphs, BFS, DFS, Trees as Graphs (40 problems)
- **Practice**: Weekly progress tracking
- **Build**: Reusable code templates

### Concurrent Activities:
- Start behavioral preparation: Document 10 STAR stories
- Learn Git and version control basics
- Understand coding best practices and conventions
- Join online communities (Blind, Reddit r/cscareerquestions)

---

## Month 3-4: Advanced Problem Solving & Design Thinking
### Month 3: Dynamic Programming & Advanced Algorithms
- **Week 1-2**: DP fundamentals and classic problems (45 problems)
- **Week 3-4**: Advanced DP, Greedy algorithms (40 problems)
- **Parallel**: Start system design basics
  - Study: Databases, SQL, NoSQL
  - Learn: Caching, Message queues
  - Practice: Simple design problems

### Month 4: System Design Foundations
- **Week 1-2**: Database design patterns, Indexing, Optimization
- **Week 3-4**: Distributed systems basics, API design, Microservices
- **Practice**: 8-10 end-to-end design scenarios
- **Projects**: Build 1-2 mini projects with system design consideration
- **DSA**: Continue daily practice (20-25 problems/week for maintenance)

### Behavioral Prep:
- Refine STAR stories with specific metrics
- Practice mock HR interviews
- Prepare technical questions to ask interviewers
- Company research framework

---

## Month 5: Specialization & Depth
### Focus Areas (Choose 1-2 based on role):
- **Backend**: System Design, Databases, Distributed Systems, API Design
- **Frontend**: System Design for Web, Performance Optimization, Component Architecture
- **Mobile**: Mobile-specific system design, Performance, Native vs Cross-platform
- **Full-Stack**: Balanced approach across all areas

### Advanced Topics:
- **Optimization**: Space-time tradeoffs, Edge cases
- **Large Scale Design**: Twitter-like systems, YouTube-like systems
- **Database**: Complex queries, Transactions, ACID properties
- **Specialization deep dive**: 5-6 complex design problems

### DSA Maintenance:
- Weekly problem solving (25-30 problems/week)
- Focus on weak areas
- Participate in contests (Codeforces, LeetCode contests)

### Preparation Updates:
- Update resume with projects and achievements
- Create portfolio (GitHub with well-documented projects)
- Prepare corner case handling strategies
- Design interview evaluation criteria self-assessment

---

## Month 6: Interview-Ready Polish
### Week 1-2: Intensive Mock Interviews
- 5-6 technical mock interviews with feedback
- 3-4 system design mock interviews
- 2-3 HR/behavioral mock interviews
- Improve based on feedback

### Week 3: Specialization & Edge Cases
- Deep dive into weak areas identified in mocks
- Practice explaining complex concepts simply
- Prepare for follow-up questions
- Communication skills refinement

### Week 4: Final Preparation
- Light revision of problem patterns
- Quick system design review
- Behavioral story final polish
- Company-specific interview preparation
- Mock interview final rounds
- Rest and mental preparation

---

## Weekly Schedule Framework
### DSA & Coding (10-12 hours/week)
- 4-5 hours: New problem patterns
- 3-4 hours: Practice and reinforcement
- 2-3 hours: Mock interviews or contests

### System Design (5-6 hours/week, especially Month 3 onwards)
- 2-3 hours: Learning new concepts
- 2-3 hours: Design scenario practice

### Behavioral & Communication (3-4 hours/week)
- 1-2 hours: Story refinement
- 1-2 hours: Mock HR rounds
- 30 min: Reading/reflection

### Projects & Real Application (2-3 hours/week, especially Month 4-5)
- Build projects incorporating learning
- Open source contributions
- Code review participation

---

## Key Milestones
- **End Month 1**: Solid DSA fundamentals
- **End Month 2**: Comfortable with complex data structures
- **End Month 3**: DP mastery + system design basics
- **End Month 4**: Advanced system design capabilities
- **End Month 5**: Specialization depth and expertise
- **End Month 6**: Interview-ready professional

## Success Metrics
- Solve 250-300 unique problems
- Complete 25+ system design scenarios
- Successfully complete 10+ mock interviews with positive feedback
- Strong, measurable behavioral stories
- Portfolio with 2-3 substantial projects
- Understanding of trade-offs and optimization

## Resources
- LeetCode Premium (with patterns and contests)
- System Design Primer & Educative.io
- Design Interview YouTube channels
- Company engineering blogs
- Technical books: CTCI, System Design Interview Vol 1
- Mock interview platforms: Pramp, Interviewing.io
- Community: Blind, Reddit, Slack communities`,
        infographicUrl: null
      }
    },
    service: {
      "1_month": {
        title: "1-Month Crash Sprint for Service-Based Companies",
        answer: `# 1-Month Crash Sprint: Service Company Preparation

## Week 1: Quick Start Fundamentals
### DSA Quick Course (4-5 hours/day)
- **Arrays & Strings**: Basic patterns, 2-pointer, prefix sum (10-15 problems)
- **Sorting & Searching**: Selection sort, bubble sort, binary search (5 problems)
- **Complexity Analysis**: Time and space basics
- **Focus**: Speed and pattern recognition

### Core Java/Tech Stack (1-2 hours/day)
- Collections framework (if Java role)
- Basic OOPS concepts
- String manipulation

### Behavioral Prep (1 hour/day)
- Prepare 3-4 STAR stories
- Study company values and hiring manager expectations
- Prepare standard questions

---

## Week 2: Coding Interviews Ready
### Essential DSA (4-5 hours/day)
- **Strings, Arrays, Hashing**: 15-20 medium problems
- **Linked Lists Basics**: Reversal, Cycle detection (5 problems)
- **Trees Basics**: Traversals, LCA (5 problems)
- **Practice**: Solve under time constraints

### Database & SQL Crash Course (1-2 hours/day)
- SELECT queries with JOINs
- Basic INSERT, UPDATE, DELETE
- 10-12 SQL problems

### Communication Skills (30 min/day)
- Practice explaining solutions
- Pseudocode writing

---

## Week 3: Final Coding Push
### Interview-Level Problems (4-5 hours/day)
- Solve 15-20 medium-difficulty problems from recent interviews
- Include: Graph basics, DP basics, String manipulation
- Focus on weak areas

### Mock Interviews (1-2 hours/day)
- 1 full mock interview
- Practice with actual constraints and feedback
- Refine communication style

### System Design 101 (30 min/day)
- Understand basic web architecture
- Learn about databases and APIs
- Basic design principles

---

## Week 4: Interview Week
### Daily Routine (Until Interview)
- **Morning (2 hours)**: Solve 2-3 problems you found challenging
- **Mid-day (1 hour)**: Mock interview or communication practice
- **Evening (1 hour)**: Behavioral story rehearsal
- **Before bed**: Light revision, good sleep

### Topics for Last-Minute Review
- Sorting and searching algorithms
- String manipulation patterns
- Tree traversals
- Your strongest 15-20 problems

---

## Priority Areas for Service Companies
1. **Coding**: Medium-level problem-solving
2. **Core Concepts**: OOPS, Collections, Basic Database
3. **Communication**: Clear problem explanation
4. **Behavioral**: Team collaboration, learning ability
5. **Domain**: Your tech stack basics

## Quick Revision Template
- Day 1: Arrays, Strings (5 problems)
- Day 2: Trees, Linked Lists (5 problems)
- Day 3: Mixed medium problems (5 problems)
- Day 4: Database and SQL (practice queries)
- Day 5: System basics and behavioral
- Day 6-7: Rest and final prep

## Resource Tips
- Focus on 1 platform: LeetCode, HackerRank, or InterviewBit
- Study 5-8 problem solutions from Blind or InterviewBit
- Mock interviews: Focus on communication
- Company-specific prep from Blind forums`,
        infographicUrl: null
      },
      "3_months": {
        title: "3-Month Core Runway for Service-Based Companies",
        answer: `# 3-Month Strategy: Service Company Interview Mastery

## Month 1: Strong Foundation
### Week 1-2: DSA Foundation (3-4 hours/day)
- **Arrays & Strings**: Master basic patterns (sliding window, two pointers)
- **Sorting**: Understand algorithms deeply
- **Searching**: Binary search variations
- **Target**: 25-30 problems with full understanding

### Week 3-4: Data Structures (3-4 hours/day)
- **Linked Lists**: Complete coverage (reversal, cycles, merge)
- **Stacks & Queues**: Implementation and common patterns
- **Trees**: Basic traversals, properties, simple problems
- **Target**: 20-25 problems

### Throughout Month 1:
- **Parallel Track**: Learn your tech stack basics (Java Collections, Python, etc.)
- **Behavioral**: Document 5-6 STAR stories with metrics
- **Fundamentals**: Understand Big O notation thoroughly
- **Communication**: Start practicing explanations

---

## Month 2: Depth & Breadth
### Week 1-2: Advanced Data Structures (3-4 hours/day)
- **Trees**: BST, AVL basics, paths, LCA problems (15-20 problems)
- **Graphs**: BFS, DFS, shortest path basics (10-15 problems)
- **Hashing**: Complex problems using hash maps (8-10 problems)

### Week 3-4: Core Concepts (2-3 hours/day)
- **SQL**: Complex queries, JOINs, Aggregations (15-20 practice queries)
- **OOPS**: Inheritance, polymorphism, design patterns basics
- **Collections**: ArrayList, HashMap, TreeMap (how they work)
- **Data Structures**: Linked Lists, Trees, Hash tables under the hood

### Parallel Activities:
- **Coding Style**: Write clean, readable code
- **Problem Solving**: Focus on optimization
- **Interviews**: 2-3 mock interviews
- **Behavioral**: Refine stories with metrics

---

## Month 3: Interview Ready
### Week 1: Specialized Topics (2-3 hours/day)
- **String Algorithms**: KMP, pattern matching
- **Graph Algorithms**: Topological sort, Union-Find
- **Dynamic Programming Basics**: Classic problems (Fibonacci, Coin change)
- **Advanced SQL**: Window functions, CTEs

### Week 2: Focused Practice (2-3 hours/day)
- **Weak Areas**: Review patterns you struggle with
- **Company-Specific**: Study problems from Blind/company forums
- **Performance**: Timed practice under interview conditions
- **System Design**: Basic architecture and design principles

### Week 3-4: Mock Interviews & Polish (3-4 hours/day)
- **3-4 full mock technical interviews** with real feedback
- **2 mock HR/behavioral rounds**
- **Practice Feedback**: Implement improvements quickly
- **Communication**: Polish explanation style
- **Confidence**: Build with successful mock sessions

---

## Daily Schedule Template
### High-Focus Days (3-4 hours/day coding)
- **1.5 hours**: Learn new patterns or concepts
- **1-1.5 hours**: Solve 2-3 problems using these patterns
- **30 min**: Refine code quality and optimization
- **30 min**: Reflect on learning and plan next session

### Balanced Days (2-3 hours/day)
- **1 hour**: Problem solving (previous patterns)
- **1 hour**: Mock interview or communication practice
- **30-1 hour**: New concept learning or revision

### Rest & Reflection Days
- Light problem solving (1-2 problems)
- Behavioral story practice
- Company research and preparation

---

## Focus Areas by Company Type
### Core Required (All Companies)
1. **Coding**: Arrays, Strings, Linked Lists, Trees, Graphs, Hashing
2. **SQL**: SELECT with JOINs, basic optimization
3. **Communication**: Clear problem explanation

### Role-Specific (Choose Based on Target Role)
- **Backend**: SQL depth, API design basics, system thinking
- **Frontend**: Data structures in UI context, performance
- **Java**: Collections, Multithreading basics
- **Python**: Decorators, List comprehensions, Generators

---

## Success Metrics
- **Solve 120-150 unique DSA problems** across all categories
- **Practice 30-40 SQL queries** with increasing complexity
- **Complete 8-10 mock interviews** with improving scores
- **Strong STAR stories** backed by metrics
- **Comfortable explaining** complex problems
- **Familiar with tech stack** being used in interviews

## Weekly Checkpoints
- **End Week 1 of Month 1**: 25 problems solved with confidence
- **End Week 4 of Month 1**: Advanced data structures understood
- **End Month 2**: 100+ problems solved, comfortable with SQL
- **Week 2 of Month 3**: Specialized topics mastered
- **Week 4 of Month 3**: Ready for interviews

## Resource Strategy
- **LeetCode**: Focus on "Interview" section and company-specific lists
- **SQL**: LeetCode Database problems or Mode Analytics
- **Mock Interviews**: Pramp or company-specific mock interview platforms
- **Company Prep**: Blind forums and GeeksforGeeks company-specific articles
- **Books**: Cracking the Coding Interview (selective chapters)`,
        infographicUrl: null
      },
      "6_months": {
        title: "6-Month Complete Transformation for Service-Based Companies",
        answer: `# 6-Month Comprehensive Path: Service Company Excellence

## Month 1-2: Strong Foundation & Breadth
### Month 1: Core DSA Foundation (2-3 hours/day)
- **Arrays & Strings**: Master all basic patterns (Sliding window, Two pointers)
- **Sorting & Searching**: Deep understanding of algorithms
- **Basic Data Structures**: Stacks, Queues, Priority Queues
- **Daily Practice**: 25-30 problems/month with increasing complexity
- **Understanding**: Focus on WHY algorithms work

### Month 2: Data Structures Mastery (2-3 hours/day)
- **Linked Lists**: Complete mastery (Reversal, Cycles, Merge, Partition)
- **Trees**: BSTs, Balanced trees, traversals, common patterns
- **Graphs**: Basic BFS, DFS, Connectivity, Topological sort
- **Hashing**: Complex problems with Hash maps
- **Daily Practice**: 25-30 problems with focus on understanding

### Parallel Activities (Month 1-2):
- **Behavioral Prep**: 8-10 strong STAR stories with metrics
- **Tech Stack**: Deep dive into required technologies
  - If Java: Collections framework, OOP principles, Multithreading basics
  - If Python: Decorators, List comprehensions, OOP
  - If C++: STL, Pointers, Memory management
- **Fundamentals**: Big O analysis, complexity calculations
- **Code Quality**: Clean code practices, naming conventions
- **Communication**: Practice explaining solutions clearly

---

## Month 3-4: Depth & Specialization
### Month 3: Advanced Problem Solving (2.5-3 hours/day)
- **Advanced Trees & Graphs**: Complex problems, Segment trees, Tries
- **Interval Problems**: Scheduling, merging, partitioning
- **Dynamic Programming Intro**: Classic problems (Fibonacci, Coin Change, LCS)
- **String Algorithms**: Pattern matching, KMP, Regex basics
- **SQL Deep Dive**: Complex JOINs, Window functions, Aggregate functions
- **Daily Practice**: 20-25 problems/week + 15-20 SQL queries/week

### Month 4: Domain-Specific Specialization (2-3 hours/day)
Choose based on your target role:

#### For Backend Roles:
- Advanced SQL: Optimization, Indexing, Query planning
- API Design: REST principles, HTTP methods, status codes
- Database Design: Normalization, Schema design, Trade-offs
- Caching: Redis, Memcached concepts
- System Basics: Load balancing, Microservices introduction

#### For Frontend Roles:
- Problem-solving in UI context: DOM manipulation patterns
- Performance Optimization: Algorithm efficiency in browser
- Data Structure Usage: Efficient state management
- Design patterns: Singleton, Observer relevant to frontend

#### For Full-Stack Roles:
- Balanced: Cover both backend and frontend specialized areas
- Integration: How they work together
- End-to-end design thinking

### Parallel Activities (Month 3-4):
- **Mock Interviews**: 2-3 technical + 1 HR mock per month
- **Project Work**: 1 substantial project using your tech stack
- **Code Review**: Study and review open-source code
- **Company Research**: Deep dive into target companies
- **Interview Patterns**: Study 20-25 problems from company-specific lists

---

## Month 5: Integration & Refinement
### Week 1-2: Comprehensive Review (2-3 hours/day)
- **DSA Patterns**: Review weak areas, reinforce strong ones
- **SQL Scenarios**: Practice complex real-world queries
- **System Design**: 5-6 basic system design scenarios
- **Problem Solving**: Mixed difficulty problems under time pressure

### Week 3-4: Specialized Mastery (2-3 hours/day)
- **Deep Dive**: Your specialization area from Month 4
- **Edge Cases**: Handling corner cases and errors
- **Optimization**: Space and time tradeoffs
- **Real-World**: Apply to actual systems you know

### Daily Practice:
- **2-3 hours**: Focused problem-solving
- **30 min**: Code optimization and quality review
- **30 min**: Theory review and learning
- **1 hour**: Mock interview prep or communication practice

### Behavioral & Communication:
- **Final Polish**: Refine all STAR stories with metrics
- **Practice**: 3-4 mock interviews with feedback
- **Question Prep**: Prepare thoughtful questions for interviews
- **Storytelling**: Practice in natural, conversational way

---

## Month 6: Interview Excellence & Readiness
### Week 1: Confidence Building (2-3 hours/day)
- **3-4 Full Mock Technical Interviews**
- **Feedback Implementation**: Quickly adapt based on feedback
- **Weak Area Focus**: Last-minute strengthening
- **Problem Variations**: Solve common problems with different constraints

### Week 2: Final Specialization (1.5-2 hours/day)
- **Deep Problems**: 10-12 hard problems from your specialization
- **2 Mock HR Rounds**: Behavioral and culture fit
- **Communication Drill**: Explain complex concepts simply
- **Time Management**: Practice time allocation during interview

### Week 3: Polish & Confidence (1-2 hours/day)
- **Company-Specific**: Final prep for target companies
- **Resume Review**: Ensure alignment with company requirements
- **Portfolio**: Polish GitHub and project demonstrations
- **Interview Logistics**: Understand company process, format, duration
- **Light Revision**: Review favorite problem patterns

### Week 4: Ready & Prepared
- **Minimal Review**: 30 min/day problem review only
- **Mental Preparation**: Confidence building
- **Good Sleep**: Prioritize rest
- **Final Checklist**: Technical setup, resume, portfolio ready
- **Company Research**: Know what you'll ask

---

## Weekly Schedule Framework
### Typical Week During Months 1-4
- **DSA/Coding**: 8-10 hours (distributed across week)
- **SQL/Database**: 2-3 hours
- **Communication/Behavioral**: 1-2 hours
- **Mock Interviews**: 1-2 hours
- **Learning/Theory**: 2-3 hours
- **Total**: 14-21 hours/week focused study

### Typical Week During Months 5-6
- **Review & Practice**: 8-10 hours
- **Mock Interviews**: 2-3 hours
- **Specialization**: 2-3 hours
- **Behavioral/Communication**: 1-2 hours
- **Rest & Reflection**: Variable
- **Total**: 13-18 hours/week focused study

---

## Success Benchmarks
- **DSA**: Solve 180-220 unique problems across all categories
- **SQL**: Master 50-60 queries of varying complexity
- **Mock Interviews**: Complete 10-12 with improving feedback
- **Behavioral**: 8-10 strong stories with quantifiable results
- **Code Quality**: Write production-ready code
- **Communication**: Explain solutions clearly and confidently
- **Speed**: Solve medium problems in 20-30 minutes
- **Optimization**: Consistently find optimal solutions

## Resources & Tools
- **Problem Solving**: LeetCode (with filters and company lists)
- **Database**: LeetCode Database or Mode Analytics SQL tutorial
- **Mock Interviews**: Pramp, Interviewing.io
- **Interview Resources**: Blind forums, GeeksforGeeks company guides
- **Reference Books**: CTCI, System Design Interview Basics
- **Video Learning**: YouTube channels for your tech stack
- **Community**: Join study groups, Discord communities

## Key Differences: Product vs Service Company Prep
- **Service Companies**: Emphasis on fundamentals, practical code quality, communication
- **Product Companies**: Emphasis on optimization, complex algorithms, system design
- **Service Interview**: More on explaining thought process
- **Product Interview**: More on efficiency and edge cases`,
        infographicUrl: null
      }
    }
  };

  return roadmaps[companyType]?.[timeline] || null;
}
