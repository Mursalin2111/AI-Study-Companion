import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase } from './schema.js';
import { execute, withTransaction } from './connection.js';
import { chunkDocument } from '../services/chunker.js';
import { generateLocalTfidfVector } from '../services/vectorStore.js';

export async function seedDatabase() {
  console.log('🌱 Initializing schema and seeding high-quality academic demo data...');
  initializeDatabase();

  const studentId = 'student-demo-user-id';
  const adminId = 'admin-demo-user-id';
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  withTransaction(() => {
    // 1. Users & Profiles
    execute('DELETE FROM users;');
    execute(
      `INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [studentId, 'student@versity.edu', defaultPasswordHash, 'student']
    );
    execute(
      `INSERT INTO profiles (user_id, name, university, department, semester, preferred_language, study_goals, streak_count, xp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        'Mursalin Ahmed',
        'University of Engineering & Technology',
        'Computer Science & Engineering',
        'Semester 5',
        'en',
        'Achieve GPA 3.8+ in Semester 5 finals and master Compiler Design & AI concepts.',
        7,
        480,
      ]
    );

    execute(
      `INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [adminId, 'admin@versity.edu', adminPasswordHash, 'admin']
    );
    execute(
      `INSERT INTO profiles (user_id, name, university, department, semester, preferred_language, study_goals, streak_count, xp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        'System Administrator',
        'University of Engineering & Technology',
        'Faculty of CSE',
        'Admin Staff',
        'en',
        'Platform administration and content management.',
        1,
        1000,
      ]
    );

    // 2. Subjects
    const sub1 = 'subject-compiler-design';
    const sub2 = 'subject-artificial-intelligence';
    const sub3 = 'subject-computer-networks';

    const examDate1 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const examDate2 = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0];
    const examDate3 = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];

    execute(
      `INSERT INTO subjects (id, user_id, name, code, description, instructor, color, icon, exam_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sub1,
        studentId,
        'Compiler Design',
        'CSE-3101',
        'Lexical analysis, syntax analysis, LL(1) and LR parsing, intermediate code generation, and optimization.',
        'Dr. Aminul Islam',
        '#3B82F6',
        'Cpu',
        examDate1,
      ]
    );

    execute(
      `INSERT INTO subjects (id, user_id, name, code, description, instructor, color, icon, exam_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sub2,
        studentId,
        'Artificial Intelligence',
        'CSE-3105',
        'Search algorithms, heuristics (A*), adversarial games, constraint satisfaction, and machine learning foundations.',
        'Prof. Farhana Rahman',
        '#8B5CF6',
        'Brain',
        examDate2,
      ]
    );

    execute(
      `INSERT INTO subjects (id, user_id, name, code, description, instructor, color, icon, exam_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sub3,
        studentId,
        'Computer Networks',
        'CSE-3109',
        'OSI layered architecture, TCP/IP protocols, flow and congestion control, IP subnetting, and routing algorithms.',
        'Dr. Kazi Tanvir',
        '#10B981',
        'Network',
        examDate3,
      ]
    );

    // 3. Materials & Chunks for Compiler Design
    const mat1 = 'material-compiler-notes';
    const compilerText = `### Chapter 1: Lexical Analysis and Tokenization
Lexical analysis is the initial phase of a modern compiler. The primary objective is to read the source program as a stream of raw characters and translate them into meaningful sequences called tokens. Tokens consist of a token name and an optional attribute value. Regular expressions are used to formally define the lexical syntax of identifiers, keywords, numbers, and operators. Deterministic Finite Automata (DFA) are constructed from regular expressions via Thompson's construction and subset construction algorithms to perform linear-time token recognition.

### Chapter 2: Context-Free Grammars and Syntax Analysis
Syntax analysis (parsing) takes the stream of tokens produced by the lexical analyzer and verifies whether the sequence conforms to the syntactic rules of the source language. A Context-Free Grammar (CFG) is formally defined as a 4-tuple G = (V, Sigma, R, S), where V is a finite set of non-terminal characters, Sigma is a finite set of terminal symbols, R is a finite set of production rules, and S is the start symbol. A grammar is ambiguous if there exists at least one string that has two or more distinct parse trees.

### Chapter 3: Top-Down Parsing and LL(1)
Top-down parsing attempts to construct the parse tree starting from the root non-terminal and working down to the terminal leaves. A major subclass of top-down parsers is the LL(1) parser. The first 'L' stands for scanning the input from left to right, the second 'L' denotes producing a leftmost derivation, and '1' indicates using one input symbol of lookahead. 

To construct an LL(1) predictive parsing table, two functions are essential: FIRST and FOLLOW.
- FIRST(alpha) is the set of terminals that begin strings derived from alpha.
- FOLLOW(A) is the set of terminals that can appear immediately to the right of non-terminal A in some sentential form.

A grammar is LL(1) if and only if for every pair of productions A -> alpha | beta:
1. FIRST(alpha) and FIRST(beta) are disjoint sets.
2. If beta derives epsilon, then FIRST(alpha) and FOLLOW(A) are disjoint sets.
Left recursion must be eliminated and common prefixes left-factored before constructing an LL(1) parsing table.

### Chapter 4: Bottom-Up Parsing and LR Parsers
Bottom-up parsing builds the parse tree starting from the leaves (the input tokens) and working upward toward the root symbol. The most powerful shift-reduce parsers belong to the LR family. LR stands for Left-to-right scanning and Rightmost derivation in reverse.
The primary variants include:
- Simple LR (SLR(1)): Uses LR(0) items and checks FOLLOW sets to resolve shift-reduce and reduce-reduce conflicts.
- Canonical LR (LR(1)): Uses LR(1) items carrying explicit lookahead tokens, eliminating false reduction conflicts.
- Lookahead LR (LALR(1)): Merges LR(1) item sets that share identical cores, significantly reducing the state count while retaining lookahead precision. Modern tools like Yacc and Bison implement LALR(1).`;

    const extractedDoc = {
      text: compilerText,
      pages: [
        { pageNumber: 1, text: compilerText.slice(0, 1000) },
        { pageNumber: 2, text: compilerText.slice(1000) },
      ],
    };
    const chunks = chunkDocument(extractedDoc, 700, 80);

    execute(
      `INSERT INTO materials (id, subject_id, user_id, title, filename, file_path, file_size, file_type, status, extracted_text, chunk_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mat1,
        sub1,
        studentId,
        'Compiler Design Comprehensive Lecture Notes',
        'compiler_design_notes.pdf',
        '/uploads/compiler_design_notes.pdf',
        245760,
        'PDF',
        'ready',
        compilerText,
        chunks.length,
      ]
    );

    for (const c of chunks) {
      const vec = generateLocalTfidfVector(c.content + ' ' + c.sectionHeading);
      execute(
        `INSERT INTO document_chunks (id, material_id, chunk_index, content, section_heading, page_number, embedding_json, token_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          mat1,
          c.index,
          c.content,
          c.sectionHeading,
          c.pageNumber,
          JSON.stringify(vec),
          c.tokenCount,
        ]
      );
    }

    // 4. Summaries for Material 1
    execute(
      `INSERT INTO summaries (id, material_id, user_id, type, language, content, key_concepts_json)
       VALUES (?, ?, ?, 'exam', 'en', ?, ?)`,
      [
        uuidv4(),
        mat1,
        studentId,
        `### Compiler Design — Exam Summary

⭐ **High-Priority Exam Topics:**
1. **Lexical Analysis**: Role of DFA, Thompson's construction, token vs lexeme vs pattern.
2. **Grammar Transformations**: Elimination of Left Recursion and Left Factoring.
3. **FIRST & FOLLOW Sets**: Calculation rules, epsilon propagation.
4. **LL(1) Parsing**: Predictive table construction and condition for LL(1) conflicts.
5. **LR Parsing Family**: Difference between SLR(1), LR(1), and LALR(1); Shift-Reduce and Reduce-Reduce conflicts.

💡 **Key Exam Formulas & Properties:**
- If A -> alpha | beta, then FIRST(alpha) ∩ FIRST(beta) = empty set.
- SLR(1) state count is identical to LR(0) state count, whereas LR(1) has much larger state tables.
- LALR(1) merges states with identical cores, maintaining compact table size.`,
        JSON.stringify(['FIRST & FOLLOW', 'LL(1) Parsing', 'LR(1) Items', 'LALR(1) Parsing', 'DFA Construction', 'Shift-Reduce Conflicts']),
      ]
    );

    // 5. Flashcards Deck & Cards
    const deck1 = 'deck-compiler-design';
    execute(
      `INSERT INTO flashcard_decks (id, subject_id, material_id, user_id, title, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [deck1, sub1, mat1, studentId, 'Compiler Design High-Yield Concepts', 'Core definitions and parsing principles']
    );

    const cardsData = [
      {
        front: 'What are the two conditions for a grammar to be LL(1)?',
        back: '1. For productions A -> alpha | beta, FIRST(alpha) and FIRST(beta) are disjoint.\n2. If beta derives epsilon, then FIRST(alpha) and FOLLOW(A) are disjoint.',
        topic: 'LL(1) Parsing',
        hint: 'Think of FIRST sets and FOLLOW sets when epsilon is present.',
      },
      {
        front: 'What is the main difference between SLR(1) and LALR(1)?',
        back: 'SLR(1) uses LR(0) items and checks the global FOLLOW set for reductions, while LALR(1) merges LR(1) states with identical cores and carries specific lookahead tokens.',
        topic: 'LR Parsing',
        hint: 'Compare LR(0) items + FOLLOW vs LR(1) items with lookaheads.',
      },
      {
        front: 'What is a Shift-Reduce conflict in bottom-up parsing?',
        back: 'A situation in a parser state where the parser cannot decide whether to shift the next input symbol onto the stack or reduce the symbols on the stack to a non-terminal.',
        topic: 'Shift-Reduce Parsing',
        hint: 'Stack action conflict between pushing next token vs applying a rule.',
      },
      {
        front: 'Why must Left Recursion be eliminated before LL(1) parsing?',
        back: 'Because a top-down predictive parser with left recursion would enter an infinite loop trying to expand the leftmost non-terminal repeatedly without consuming any input.',
        topic: 'Grammar Optimization',
        hint: 'Consider what happens to the call stack during recursive descent.',
      },
      {
        front: 'Define Lexeme, Token, and Pattern.',
        back: '- Token: Abstract category (e.g., IDENTIFIER, NUMBER).\n- Lexeme: The actual sequence of source characters matching the pattern (e.g., total_sum).\n- Pattern: Description of the rules (usually a regular expression).',
        topic: 'Lexical Analysis',
        hint: 'Category vs concrete text vs formal rule.',
      },
    ];

    for (const c of cardsData) {
      execute(
        `INSERT INTO flashcards (id, deck_id, user_id, front, back, topic, hint, interval, repetition, ease_factor, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 2.5, DATE('now'))`,
        [uuidv4(), deck1, studentId, c.front, c.back, c.topic, c.hint]
      );
    }

    // 6. Practice Quiz & Mock Exam
    const quiz1 = 'quiz-compiler-practice';
    execute(
      `INSERT INTO quizzes (id, subject_id, material_id, user_id, title, description, time_limit_mins, total_questions, difficulty, is_mock_exam)
       VALUES (?, ?, ?, ?, ?, ?, 15, 6, 'medium', 0)`,
      [
        quiz1,
        sub1,
        mat1,
        studentId,
        'Compiler Design: Parsing & Lexical Analysis',
        'Test your understanding of LL(1), LR parsing, and tokens.',
      ]
    );

    const questionsData = [
      {
        text: 'Which of the following parsing techniques is an example of bottom-up parsing?',
        options: ['LL(1) Parsing', 'Recursive Descent Parsing', 'Shift-Reduce / LR Parsing', 'Predictive Parsing'],
        correct: 'Shift-Reduce / LR Parsing',
        explanation: 'LR parsing is bottom-up because it constructs the parse tree from terminal leaves upward to the start symbol.',
        topic: 'LR Parsing',
      },
      {
        text: 'What must be eliminated from a Context-Free Grammar before constructing an LL(1) parsing table?',
        options: ['Right Recursion', 'Left Recursion and Common Prefixes', 'Epsilon Productions', 'Semantic Actions'],
        correct: 'Left Recursion and Common Prefixes',
        explanation: 'Left recursion causes infinite loops in top-down parsers, and common prefixes must be left-factored to ensure deterministic lookahead.',
        topic: 'LL(1) Parsing',
      },
      {
        text: 'Which parser generator commonly generates LALR(1) parsers?',
        options: ['Yacc / Bison', 'Lex / Flex', 'ANTLR (LL(*))', 'LLVM Clang AST'],
        correct: 'Yacc / Bison',
        explanation: 'Classic tools like Yacc and GNU Bison generate LALR(1) tables by merging LR(1) states that share identical cores.',
        topic: 'Parser Generators',
      },
      {
        text: 'In an LL(1) grammar, if production A -> epsilon exists, which set must not overlap with FIRST(A)?',
        options: ['FIRST(S)', 'FOLLOW(A)', 'LOOKAHEAD(A)', 'LAST(A)'],
        correct: 'FOLLOW(A)',
        explanation: 'If FIRST(A) and FOLLOW(A) intersect when epsilon is producible, the parser cannot decide whether to expand or derive epsilon upon seeing the lookahead symbol.',
        topic: 'FIRST & FOLLOW',
      },
      {
        text: 'What formal mechanism is typically used to implement the lexical analyzer engine?',
        options: ['Pushdown Automata', 'Deterministic Finite Automata (DFA)', 'Turing Machine', 'Linear Bounded Automata'],
        correct: 'Deterministic Finite Automata (DFA)',
        explanation: 'Regular expressions are converted to NFAs and then DFAs to scan tokens in deterministic linear O(n) time.',
        topic: 'Lexical Analysis',
      },
      {
        text: 'Which parsing method produces the largest parsing table in terms of state count for the same grammar?',
        options: ['SLR(1)', 'LALR(1)', 'Canonical LR(1)', 'Operator Precedence'],
        correct: 'Canonical LR(1)',
        explanation: 'Canonical LR(1) keeps states with different lookaheads separate, leading to hundreds or thousands of states compared to LALR(1).',
        topic: 'LR Parsing',
      },
    ];

    for (const q of questionsData) {
      execute(
        `INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options_json, correct_answer, explanation, topic, points)
         VALUES (?, ?, ?, 'mcq', ?, ?, ?, ?, 1)`,
        [uuidv4(), quiz1, q.text, JSON.stringify(q.options), q.correct, q.explanation, q.topic]
      );
    }

    // Previous Quiz Attempt
    const attemptId = 'attempt-compiler-sample';
    execute(
      `INSERT INTO quiz_attempts (
        id, quiz_id, user_id, score, total_points, accuracy, time_spent_secs,
        answers_json, weak_topics_json, strong_topics_json, ai_feedback
      ) VALUES (?, ?, ?, 5, 6, 83.3, 420, ?, ?, ?, ?)`,
      [
        attemptId,
        quiz1,
        studentId,
        JSON.stringify([
          { questionText: 'Parsing technique...', isCorrect: true, topic: 'LR Parsing' },
          { questionText: 'What must be eliminated...', isCorrect: true, topic: 'LL(1) Parsing' },
          { questionText: 'Which set must not overlap...', isCorrect: false, topic: 'FIRST & FOLLOW' },
        ]),
        JSON.stringify([{ topic: 'FIRST & FOLLOW', scorePercent: 50 }]),
        JSON.stringify([{ topic: 'LR Parsing', scorePercent: 100 }, { topic: 'LL(1) Parsing', scorePercent: 100 }]),
        'Solid performance! Pay special attention to FOLLOW set intersection rules for nullable non-terminals.',
      ]
    );

    // 7. Study Plan for Compiler Design
    const plan1 = 'study-plan-compiler';
    execute(
      `INSERT INTO study_plans (id, subject_id, user_id, exam_date, daily_hours, current_level, target_grade)
       VALUES (?, ?, ?, ?, 2.0, 'intermediate', 'A+')`,
      [plan1, sub1, studentId, examDate1]
    );

    const studyTasksData = [
      { day: 1, title: 'Lexical Analysis & DFA Construction', desc: 'Review regular expressions, Thompson construction, and tokenization edge cases.', mins: 90, topic: 'Lexical Analysis', comp: 1 },
      { day: 2, title: 'Context-Free Grammars & Ambiguity', desc: 'Identify ambiguous grammars and rewrite them into unambiguous forms.', mins: 90, topic: 'CFG', comp: 1 },
      { day: 3, title: 'Calculate FIRST & FOLLOW Sets', desc: 'Solve 10 textbook problems on grammar sets with epsilon derivations.', mins: 120, topic: 'FIRST & FOLLOW', comp: 1 },
      { day: 4, title: 'Construct LL(1) Parsing Tables', desc: 'Build parsing tables and trace derivations for valid and invalid inputs.', mins: 120, topic: 'LL(1) Parsing', comp: 0 },
      { day: 5, title: 'LR(0) and SLR(1) Item Sets', desc: 'Generate canonical collections of LR(0) items and build SLR(1) tables.', mins: 120, topic: 'LR Parsing', comp: 0 },
      { day: 6, title: 'LALR(1) and Conflict Resolution', desc: 'Understand core-merging and solve Shift-Reduce / Reduce-Reduce conflicts.', mins: 120, topic: 'LALR(1)', comp: 0 },
      { day: 7, title: 'Timed Mock Exam & Flashcard Revision', desc: 'Take a full 30-minute mock exam and review all incorrect questions.', mins: 60, topic: 'Full Revision', comp: 0 },
    ];

    for (const st of studyTasksData) {
      const taskDate = new Date(Date.now() + (st.day - 3) * 86400000).toISOString().split('T')[0];
      execute(
        `INSERT INTO study_tasks (id, plan_id, day_number, date_str, title, description, estimated_minutes, topic, is_completed, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          plan1,
          st.day,
          taskDate,
          st.title,
          st.desc,
          st.mins,
          st.topic,
          st.comp,
          st.comp ? new Date().toISOString() : null,
        ]
      );
    }

    // 8. Personal Study Notes
    execute(
      `INSERT INTO notes (id, subject_id, user_id, title, content_markdown, tags_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        sub1,
        studentId,
        'Quick Cheatsheet: Parsing Conflicts',
        `# Parsing Conflicts Summary

## 1. Shift-Reduce Conflict
- Occurs when parser can either **shift** the next input token or **reduce** using a production rule.
- Example: The famous *dangling-else* ambiguity.
- Resolution in Bison/Yacc: Favors **shift** by default.

## 2. Reduce-Reduce Conflict
- Occurs when two or more distinct production rules are valid for reduction on the same lookahead.
- Much more severe than shift-reduce; usually points to grammar ambiguity or flawed abstraction.
- Resolution in Bison/Yacc: Chooses the rule that appears earlier in the grammar file.

## 3. Key Formulas
$$\\text{FOLLOW}(A) = \\bigcup \\{ \\text{FIRST}(\\beta) \\setminus \\{\\epsilon\\} \\}$$`,
        JSON.stringify(['Parsing', 'Cheatsheet', 'Bison', 'Grammars']),
      ]
    );

    // 9. Activity Logs
    for (let i = 6; i >= 0; i--) {
      const logDate = new Date(Date.now() - i * 86400000).toISOString();
      const minutes = 30 + Math.round(Math.random() * 45);
      execute(
        `INSERT INTO study_activity_logs (id, user_id, subject_id, activity_type, duration_minutes, xp_earned, created_at)
         VALUES (?, ?, ?, 'reading', ?, ?, ?)`,
        [uuidv4(), studentId, sub1, minutes, minutes * 2, logDate]
      );
    }

    // 10. Achievements
    execute(
      `INSERT OR IGNORE INTO achievements (id, user_id, badge_code, title, description, icon)
       VALUES (?, ?, 'FIRST_UPLOAD', 'Curious Scholar', 'Uploaded first study material', 'FileUp')`,
      [uuidv4(), studentId]
    );
    execute(
      `INSERT OR IGNORE INTO achievements (id, user_id, badge_code, title, description, icon)
       VALUES (?, ?, 'STREAK_7', 'Dedicated Learner', 'Maintained a 7-day study streak', 'Flame')`,
      [uuidv4(), studentId]
    );

    // 11. Notifications
    execute(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES (?, ?, 'Exam Countdown: Compiler Design', 'Your exam is scheduled in 14 days. Review your daily study plan tasks.', 'exam_reminder')`,
      [uuidv4(), studentId]
    );
    execute(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES (?, ?, '🔥 7-Day Study Streak Active!', 'Keep up the consistent momentum! Earn +50 bonus XP today.', 'streak')`,
      [uuidv4(), studentId]
    );
  });

  console.log('✅ Seeding completed successfully!');
}

// Run directly if called as a script
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase().catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}
