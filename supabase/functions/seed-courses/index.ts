// Seeds demo courses if none exist. Idempotent & safe to call on every page load.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LessonSeed = {
  title: string;
  lesson_type: "text" | "video" | "terminal" | "quiz";
  content?: string;
  video_url?: string;
  terminal_commands?: { command: string; output: string; hint?: string }[];
  duration_minutes?: number;
  quiz?: { question: string; options: string[]; correct_index: number; explanation?: string }[];
};

type ModuleSeed = { title: string; description?: string; lessons: LessonSeed[] };

type CourseSeed = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  cover_image: string;
  level: string;
  duration_minutes: number;
  instructor_name: string;
  certificate_paid: boolean;
  certificate_price_cents: number;
  sort_order: number;
  modules: ModuleSeed[];
};

const T = (s: string) => s.trim();

const COURSES: CourseSeed[] = [
  {
    title: "Linux Basics: From Zero to Comfortable",
    slug: "linux-basics-from-zero-to-comfortable",
    short_description: "Your first real Linux course. Learn the filesystem, shell, permissions and survive the terminal with confidence.",
    description: "A beginner-friendly tour of Linux. No prior experience required — by the end you'll be navigating directories, managing files, and feeling at home in the terminal.",
    cover_image: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1200&h=675&fit=crop",
    level: "beginner",
    duration_minutes: 90,
    instructor_name: "Noob to Root Team",
    certificate_paid: true,
    certificate_price_cents: 299,
    sort_order: 1,
    modules: [
      {
        title: "Welcome to Linux",
        description: "What Linux is and why it matters.",
        lessons: [
          {
            title: "What is Linux?",
            lesson_type: "text",
            duration_minutes: 4,
            content: T(`
## Welcome 👋

Linux is a free and open-source **operating system kernel** that powers everything from phones and servers to the world's fastest supercomputers.

### Why learn Linux?
- It runs the internet — most servers are Linux.
- It's the foundation of ethical hacking, DevOps, and cloud.
- It teaches you how computers *actually* work.

> Tip: A "distribution" (Ubuntu, Debian, Kali, Arch...) = Linux kernel + tools.

\`\`\`bash
uname -a
\`\`\`

That command prints information about your kernel.`),
          },
          {
            title: "Opening your first terminal",
            lesson_type: "terminal",
            duration_minutes: 5,
            content: T(`Time to meet the **terminal**. The terminal is where you type commands instead of clicking.

Try the commands below in the simulator.`),
            terminal_commands: [
              { command: "whoami", output: "noob", hint: "Prints your current username." },
              { command: "pwd", output: "/home/noob", hint: "Print Working Directory." },
              { command: "date", output: "Mon May 11 10:00:00 UTC 2026" },
            ],
          },
          {
            title: "Quiz: Linux fundamentals",
            lesson_type: "quiz",
            duration_minutes: 3,
            quiz: [
              { question: "What is Linux at its core?", options: ["A programming language", "An operating system kernel", "A web browser", "A text editor"], correct_index: 1, explanation: "Linux is the kernel — the core of the OS." },
              { question: "Which command prints your current directory?", options: ["whoami", "ls", "pwd", "cd"], correct_index: 2 },
            ],
          },
        ],
      },
      {
        title: "Filesystem & Navigation",
        description: "Move around like a pro.",
        lessons: [
          {
            title: "The Linux filesystem tree",
            lesson_type: "text",
            duration_minutes: 6,
            content: T(`Everything in Linux is a **file** — even devices and processes.

Key folders:
- \`/\` — the root of everything
- \`/home\` — user home directories
- \`/etc\` — system configuration
- \`/var\` — logs and variable data
- \`/usr\` — installed programs

\`\`\`bash
ls /
\`\`\``),
          },
          {
            title: "Navigating with cd, ls, pwd",
            lesson_type: "terminal",
            duration_minutes: 6,
            content: "Practice moving around the filesystem.",
            terminal_commands: [
              { command: "ls", output: "Desktop  Documents  Downloads  Music  Pictures", hint: "List contents of current directory." },
              { command: "cd Documents", output: "" },
              { command: "pwd", output: "/home/noob/Documents" },
              { command: "cd ..", output: "", hint: "'..' means the parent directory." },
            ],
          },
          {
            title: "Creating & removing files",
            lesson_type: "terminal",
            duration_minutes: 5,
            content: "Create, copy, move and delete files safely.",
            terminal_commands: [
              { command: "touch notes.txt", output: "" },
              { command: "mkdir projects", output: "" },
              { command: "mv notes.txt projects/", output: "" },
              { command: "rm projects/notes.txt", output: "", hint: "Careful — there is no recycle bin." },
            ],
          },
        ],
      },
      {
        title: "Permissions & Users",
        description: "Stay safe and understand who can do what.",
        lessons: [
          {
            title: "Understanding file permissions",
            lesson_type: "text",
            duration_minutes: 7,
            content: T(`Each file has **owner**, **group** and **others** permissions: read (r), write (w), execute (x).

\`\`\`bash
ls -l
# -rw-r--r-- 1 noob noob 0 May 11 10:00 notes.txt
\`\`\`

Change permissions with \`chmod\`:
\`\`\`bash
chmod 755 script.sh
\`\`\``),
          },
          {
            title: "sudo and root",
            lesson_type: "terminal",
            duration_minutes: 4,
            content: "`sudo` runs a command as the superuser.",
            terminal_commands: [
              { command: "sudo apt update", output: "Reading package lists... Done", hint: "Needs admin rights." },
              { command: "whoami", output: "noob" },
              { command: "sudo whoami", output: "root" },
            ],
          },
          {
            title: "Final quiz",
            lesson_type: "quiz",
            duration_minutes: 4,
            quiz: [
              { question: "Which command changes file permissions?", options: ["chown", "chmod", "chperm", "perm"], correct_index: 1 },
              { question: "What does `sudo` do?", options: ["Search files", "Delete files", "Run a command as root", "Show users"], correct_index: 2 },
              { question: "What does `..` refer to?", options: ["Hidden files", "Parent directory", "Current directory", "Home directory"], correct_index: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Master the Terminal & Bash",
    slug: "master-the-terminal-and-bash",
    short_description: "Level up your shell skills. Pipes, redirects, scripting, and the tricks pros use every day.",
    description: "Stop being scared of the terminal. This course turns the shell into your superpower — automate boring tasks, chain commands, and write bash scripts that just work.",
    cover_image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?w=1200&h=675&fit=crop",
    level: "intermediate",
    duration_minutes: 120,
    instructor_name: "Noob to Root Team",
    certificate_paid: true,
    certificate_price_cents: 399,
    sort_order: 2,
    modules: [
      {
        title: "Shell Power Tools",
        description: "The commands you'll use forever.",
        lessons: [
          {
            title: "grep, find & locate",
            lesson_type: "terminal",
            duration_minutes: 6,
            content: T(`Searching is half the job. Master these three and you'll find anything.

\`\`\`bash
grep "error" /var/log/syslog
find . -name "*.js"
\`\`\``),
            terminal_commands: [
              { command: "grep error app.log", output: "2026-05-11 ERROR: connection failed" },
              { command: "find . -name '*.txt'", output: "./notes.txt\n./docs/readme.txt" },
              { command: "locate bashrc", output: "/home/noob/.bashrc" },
            ],
          },
          {
            title: "Pipes and redirects",
            lesson_type: "text",
            duration_minutes: 6,
            content: T(`The **pipe** \`|\` sends the output of one command into another. **Redirects** \`>\` and \`>>\` save output to a file.

\`\`\`bash
ls -la | grep ".sh"
echo "hello" > greeting.txt
echo "world" >> greeting.txt
\`\`\`

This is where the shell goes from "command runner" to "data pipeline".`),
          },
          {
            title: "Chaining commands",
            lesson_type: "terminal",
            duration_minutes: 5,
            content: "Combine commands with `&&`, `||`, and `;`.",
            terminal_commands: [
              { command: "mkdir build && cd build", output: "" },
              { command: "false || echo 'recovered'", output: "recovered" },
              { command: "echo one ; echo two", output: "one\ntwo" },
            ],
          },
        ],
      },
      {
        title: "Bash Scripting",
        description: "Automate the boring stuff.",
        lessons: [
          {
            title: "Your first bash script",
            lesson_type: "text",
            duration_minutes: 7,
            content: T(`Create a file \`hello.sh\`:

\`\`\`bash
#!/bin/bash
NAME="$1"
echo "Hello, $NAME!"
\`\`\`

Make it executable and run it:
\`\`\`bash
chmod +x hello.sh
./hello.sh world
\`\`\``),
          },
          {
            title: "Variables, loops & conditionals",
            lesson_type: "text",
            duration_minutes: 8,
            content: T(`\`\`\`bash
for f in *.txt; do
  echo "Processing $f"
done

if [ -f config.yml ]; then
  echo "Found config"
else
  echo "Missing config"
fi
\`\`\``),
          },
          {
            title: "Practice in the terminal",
            lesson_type: "terminal",
            duration_minutes: 5,
            content: "Try these script-style one-liners.",
            terminal_commands: [
              { command: "for i in 1 2 3; do echo \"hi $i\"; done", output: "hi 1\nhi 2\nhi 3" },
              { command: "echo $USER", output: "noob" },
              { command: "ls *.md | wc -l", output: "3", hint: "Counts markdown files." },
            ],
          },
          {
            title: "Quiz: Shell mastery",
            lesson_type: "quiz",
            duration_minutes: 4,
            quiz: [
              { question: "What does the `|` operator do?", options: ["Comment a line", "Pipe output to next command", "Append to file", "Background a process"], correct_index: 1 },
              { question: "Which makes a script executable?", options: ["chmod +x file.sh", "run file.sh", "exec file.sh", "bash on file.sh"], correct_index: 0 },
              { question: "What does `>>` do?", options: ["Compare", "Append output", "Overwrite", "Pipe"], correct_index: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Introduction to Ethical Hacking",
    slug: "introduction-to-ethical-hacking",
    short_description: "A safe, legal, hands-on intro to penetration testing — recon, scanning, and the hacker mindset.",
    description: "Learn how hackers think — so you can defend systems better. This course is strictly for **authorized testing** and education. Lab environments only.",
    cover_image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=675&fit=crop",
    level: "intermediate",
    duration_minutes: 150,
    instructor_name: "Noob to Root Team",
    certificate_paid: true,
    certificate_price_cents: 499,
    sort_order: 3,
    modules: [
      {
        title: "The Hacker Mindset",
        description: "Ethics, laws, and how to learn responsibly.",
        lessons: [
          {
            title: "What is ethical hacking?",
            lesson_type: "text",
            duration_minutes: 6,
            content: T(`Ethical hacking = **authorized** security testing. You probe systems *with permission* to find weaknesses before criminals do.

### Golden rules
1. Never test systems you don't own or have written permission to test.
2. Document everything.
3. Report responsibly.

> Curiosity is fuel. Consent is mandatory.`),
          },
          {
            title: "Setting up your lab",
            lesson_type: "text",
            duration_minutes: 7,
            content: T(`Use a **virtual lab** — never the real internet — while learning.

Recommended:
- **Kali Linux** (attacker VM)
- **DVWA / Metasploitable** (target VM)
- **VirtualBox** or **VMware**

\`\`\`bash
sudo apt install virtualbox
\`\`\``),
          },
          {
            title: "Quiz: Ethics check",
            lesson_type: "quiz",
            duration_minutes: 3,
            quiz: [
              { question: "Is it OK to scan a website you don't own?", options: ["Yes, if you're learning", "Only with written permission", "Yes, if you don't break it", "It depends on the country"], correct_index: 1, explanation: "Always require written authorization." },
              { question: "What's the safest place to practice?", options: ["A friend's blog", "A virtual lab you control", "A government site", "Any public Wi‑Fi"], correct_index: 1 },
            ],
          },
        ],
      },
      {
        title: "Recon & Scanning",
        description: "Gather information legally on lab targets.",
        lessons: [
          {
            title: "Footprinting with whois & dig",
            lesson_type: "terminal",
            duration_minutes: 6,
            content: "Public information about a domain is fair game for **your own** domains and authorized targets.",
            terminal_commands: [
              { command: "whois example.com", output: "Domain Name: EXAMPLE.COM\nRegistrar: IANA" },
              { command: "dig example.com", output: ";; ANSWER SECTION:\nexample.com.  300 IN A  93.184.216.34" },
              { command: "host example.com", output: "example.com has address 93.184.216.34" },
            ],
          },
          {
            title: "Port scanning with nmap",
            lesson_type: "terminal",
            duration_minutes: 7,
            content: T(`\`nmap\` shows which ports are open on a host.

> Only scan hosts you are authorized to scan.`),
            terminal_commands: [
              { command: "nmap -sV 10.0.0.5", output: "PORT   STATE SERVICE VERSION\n22/tcp open  ssh     OpenSSH 8.9\n80/tcp open  http    nginx 1.24", hint: "-sV detects service versions." },
              { command: "nmap -p 1-1000 10.0.0.5", output: "Scanning... 998 closed, 2 open" },
            ],
          },
          {
            title: "Reading the results",
            lesson_type: "text",
            duration_minutes: 5,
            content: T(`Open ports = attack surface. For each open service ask:
- What software / version is running?
- Are there known CVEs?
- Is it exposed to the internet or only internal?

Document findings in a clear report — that's what real pentesters deliver.`),
          },
        ],
      },
      {
        title: "Common Vulnerabilities",
        description: "The big categories you'll meet on day one.",
        lessons: [
          {
            title: "OWASP Top 10 overview",
            lesson_type: "text",
            duration_minutes: 8,
            content: T(`The **OWASP Top 10** is the industry list of common web vulns:

1. Broken access control
2. Cryptographic failures
3. Injection (SQLi, XSS…)
4. Insecure design
5. Security misconfiguration
6. Vulnerable & outdated components
7. Identification & authentication failures
8. Software & data integrity failures
9. Logging & monitoring failures
10. SSRF

Learn one per week and you'll be dangerous (the good kind) in a few months.`),
          },
          {
            title: "Capstone quiz",
            lesson_type: "quiz",
            duration_minutes: 5,
            quiz: [
              { question: "What does `nmap -sV` do?", options: ["Stealth scan", "Detect service versions", "Spoof MAC", "Vulnerability scan"], correct_index: 1 },
              { question: "Which is #1 on the OWASP Top 10?", options: ["XSS", "SQL injection", "Broken access control", "SSRF"], correct_index: 2 },
              { question: "Best place to practice attacks?", options: ["Production sites", "A controlled lab", "Friends' servers", "Public Wi‑Fi"], correct_index: 1 },
              { question: "Before testing a target you must always have…", options: ["A VPN", "Written permission", "A pseudonym", "A hoodie"], correct_index: 1 },
            ],
          },
        ],
      },
    ],
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { count } = await supabase
      .from("courses")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ seeded: false, reason: "courses already exist", count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let inserted = 0;
    for (const c of COURSES) {
      const { modules, ...courseRow } = c;
      const { data: course, error: ce } = await supabase
        .from("courses")
        .insert({ ...courseRow, is_published: true, content_free: true })
        .select("id")
        .single();
      if (ce || !course) throw ce ?? new Error("course insert failed");

      let moduleOrder = 0;
      let lessonOrder = 0;
      for (const m of modules) {
        const { data: mod, error: me } = await supabase
          .from("modules")
          .insert({ course_id: course.id, title: m.title, description: m.description ?? null, sort_order: moduleOrder++ })
          .select("id")
          .single();
        if (me || !mod) throw me ?? new Error("module insert failed");

        for (const l of m.lessons) {
          const { quiz, ...lessonRow } = l;
          const { data: lesson, error: le } = await supabase
            .from("lessons")
            .insert({
              course_id: course.id,
              module_id: mod.id,
              title: lessonRow.title,
              lesson_type: lessonRow.lesson_type,
              content: lessonRow.content ?? null,
              video_url: lessonRow.video_url ?? null,
              terminal_commands: lessonRow.terminal_commands ?? [],
              duration_minutes: lessonRow.duration_minutes ?? 5,
              sort_order: lessonOrder++,
            })
            .select("id")
            .single();
          if (le || !lesson) throw le ?? new Error("lesson insert failed");

          if (quiz && quiz.length) {
            const rows = quiz.map((q, i) => ({
              lesson_id: lesson.id,
              question: q.question,
              options: q.options,
              correct_index: q.correct_index,
              explanation: q.explanation ?? null,
              sort_order: i,
            }));
            const { error: qe } = await supabase.from("quiz_questions").insert(rows);
            if (qe) throw qe;
          }
        }
      }
      inserted++;
    }

    return new Response(JSON.stringify({ seeded: true, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
