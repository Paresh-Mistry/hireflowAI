#!/usr/bin/env node
/**
 * Generates supabase/seed.sql deterministically (fixed PRNG seed, fixed UUIDs).
 * All people, companies and resumes are fictional. Dates are relative to the moment
 * the seed runs ("N days ago") so the dashboard always shows a recent, realistic window.
 *
 *   node scripts/generate-seed.mjs > supabase/seed.sql
 */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261019);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));
const q = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const uuid = (prefix, n) => `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;

const JOBS = [
  { t: "Senior Frontend Engineer", d: "Engineering", l: "Remote (India)", type: "full-time", status: "open", skills: ["React", "TypeScript", "Next.js", "Accessibility"], exp: 4,
    desc: "Own the customer-facing web app. You will build accessible, fast interfaces in React and TypeScript, collaborate closely with design, and raise the bar on testing and performance. Experience with Next.js and design systems is a strong plus." },
  { t: "Backend Engineer", d: "Engineering", l: "Bengaluru, India", type: "full-time", status: "open", skills: ["Node.js", "PostgreSQL", "REST APIs", "Docker"], exp: 3,
    desc: "Design and operate the services behind our hiring platform. You will model data in PostgreSQL, build reliable REST APIs in Node.js, and care about observability and security. Familiarity with queues and caching is helpful." },
  { t: "Full-Stack Engineering Intern", d: "Engineering", l: "Mumbai, India", type: "internship", status: "open", skills: ["JavaScript", "React", "Git"], exp: 0,
    desc: "A six-month internship shipping real features across our React front end and API. You will pair with senior engineers, write tests, and present your work at demo day. Curiosity and fundamentals matter more than years of experience." },
  { t: "Product Designer", d: "Design", l: "Remote (APAC)", type: "full-time", status: "open", skills: ["Figma", "User Research", "Design Systems", "Prototyping"], exp: 3,
    desc: "Shape end-to-end product experiences from discovery to polished UI. You will run user research, build prototypes in Figma, and contribute to our design system in partnership with engineering." },
  { t: "Data Analyst", d: "Analytics", l: "Pune, India", type: "full-time", status: "open", skills: ["SQL", "Python", "Tableau", "Statistics"], exp: 2,
    desc: "Turn hiring and product data into decisions. You will write SQL, build dashboards, and run analyses on funnel conversion and time-to-hire, communicating findings to non-technical stakeholders." },
  { t: "DevOps Engineer", d: "Infrastructure", l: "Hyderabad, India", type: "contract", status: "closed", skills: ["Kubernetes", "Terraform", "AWS", "CI/CD"], exp: 4,
    desc: "Contract role to harden our cloud infrastructure: infrastructure as code with Terraform, Kubernetes operations on AWS, and CI/CD pipeline improvements. This role has been filled." },
];

const COMPANIES = ["Northwind Labs", "Brightloop", "Kestrel Systems", "Pixelforge", "Lumen Analytics", "Harbor & Co", "Quanta Works", "Meridian Soft"];
const BULLETS = {
  frontend: [
    "Built and maintained a component library in {s0} and {s1} used by 6 product teams",
    "Cut largest-contentful-paint by 38% through code splitting and image optimisation",
    "Led accessibility audit and fixed keyboard and screen-reader issues across checkout",
    "Wrote unit and integration tests with Jest and Testing Library",
  ],
  backend: [
    "Designed REST APIs in {s0} serving 2M requests per day on {s1}",
    "Migrated a monolith's reporting queries to indexed {s1} views, reducing p95 latency by 55%",
    "Containerised services with Docker and automated deployments",
    "Introduced structured logging and alerting for on-call rotations",
  ],
  design: [
    "Ran 20+ user interviews and synthesised findings into product opportunities",
    "Built a design system in {s0} with documented components and tokens",
    "Prototyped flows in {s1} and validated them with usability tests",
    "Partnered with engineers to ship redesigned onboarding that lifted activation by 12%",
  ],
  data: [
    "Wrote {s0} and {s1} pipelines to model funnel conversion for the growth team",
    "Built executive dashboards in Tableau tracking weekly KPIs",
    "Ran A/B test analyses and reported confidence intervals to stakeholders",
    "Automated recurring reports, saving ~10 hours per week",
  ],
  devops: [
    "Managed Kubernetes clusters on AWS and automated provisioning with Terraform",
    "Built CI/CD pipelines that reduced release time from 2 hours to 15 minutes",
    "Set up Prometheus and Grafana monitoring with actionable alerts",
  ],
  intern: [
    "Built a personal finance tracker with {s0} and {s1} (open source on GitHub)",
    "Completed a campus placement-portal project in a team of four using Git workflows",
    "Contributed documentation fixes to an open-source library",
  ],
};
const POOLS = {
  frontend: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Jest", "GraphQL", "Accessibility", "Redux", "Vite", "Storybook"],
  backend: ["Node.js", "PostgreSQL", "Go", "REST APIs", "Docker", "Redis", "AWS", "Kafka", "Python", "gRPC"],
  design: ["Figma", "User Research", "Prototyping", "Design Systems", "Accessibility", "Illustration", "Framer"],
  data: ["SQL", "Python", "Tableau", "dbt", "Pandas", "Statistics", "Looker", "Excel"],
  devops: ["Kubernetes", "Terraform", "AWS", "CI/CD", "Docker", "Prometheus", "Linux", "Ansible"],
  intern: ["JavaScript", "React", "HTML", "CSS", "Git", "Python", "Node.js"],
};
const TITLES = {
  frontend: ["Frontend Engineer", "Senior Frontend Engineer", "UI Engineer"],
  backend: ["Backend Engineer", "Software Engineer", "API Developer"],
  design: ["Product Designer", "UX Designer", "Visual Designer"],
  data: ["Data Analyst", "Business Analyst", "Analytics Engineer"],
  devops: ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer"],
  intern: ["Computer Science Student", "Junior Developer", "Bootcamp Graduate"],
};
const CITIES = ["Mumbai, India", "Bengaluru, India", "Pune, India", "Hyderabad, India", "Delhi, India", "Chennai, India", "Remote (India)", "Singapore", "Dubai, UAE"];

// [name, family, years]
const PEOPLE = [
  ["Aarav Mehta", "frontend", 6], ["Priya Nair", "frontend", 4], ["Rohan Iyer", "frontend", 2], ["Sneha Kulkarni", "frontend", 5],
  ["Kabir Malhotra", "backend", 5], ["Ananya Reddy", "backend", 3], ["Vikram Singh", "backend", 7], ["Meera Joshi", "backend", 2],
  ["Ishaan Gupta", "intern", 0], ["Diya Patel", "intern", 0], ["Arjun Menon", "intern", 1], ["Riya Sharma", "intern", 0],
  ["Neha Bansal", "design", 4], ["Karan Deshmukh", "design", 3], ["Tara Fernandes", "design", 6],
  ["Siddharth Rao", "data", 3], ["Pooja Verma", "data", 2], ["Aditya Kapoor", "data", 5], ["Zoya Khan", "data", 1],
  ["Manish Pillai", "devops", 6], ["Lakshmi Narayanan", "devops", 4],
  ["Harsh Vora", "frontend", 3], ["Isha Chopra", "backend", 4], ["Dev Sethi", "intern", 0],
];

// [personIdx, jobIdx, finalStage, daysAgoApplied, source]
const APPS = [
  [0, 0, "interview", 12, "Referral"], [1, 0, "offer", 20, "LinkedIn"], [2, 0, "screening", 5, "Careers page"], [3, 0, "hired", 52, "Referral"],
  [21, 0, "applied", 2, "LinkedIn"], [21, 2, "rejected", 33, "Careers page"],
  [4, 1, "interview", 15, "LinkedIn"], [5, 1, "screening", 7, "Careers page"], [6, 1, "hired", 27, "Referral"], [7, 1, "rejected", 40, "Job board"],
  [22, 1, "applied", 1, "LinkedIn"], [4, 1 + 0, "interview", 15, "LinkedIn"].slice(0, 0).length ? null : null,
  [8, 2, "screening", 6, "Campus drive"], [9, 2, "interview", 10, "Campus drive"], [10, 2, "applied", 3, "Careers page"], [11, 2, "hired", 49, "Campus drive"],
  [23, 2, "applied", 1, "Careers page"], [10, 0, "rejected", 38, "Job board"],
  [12, 3, "offer", 22, "Referral"], [13, 3, "interview", 11, "LinkedIn"], [14, 3, "screening", 8, "Careers page"], [12, 3 + 0, "x", 0, ""].slice(0, 0).length ? null : null,
  [15, 4, "interview", 14, "LinkedIn"], [16, 4, "screening", 4, "Job board"], [17, 4, "hired", 26, "Referral"], [18, 4, "applied", 2, "Careers page"],
  [19, 5, "hired", 58, "Referral"], [20, 5, "rejected", 45, "LinkedIn"],
  [1, 2, "applied", 4, "Careers page"], [13, 4, "rejected", 30, "Job board"], [16, 2, "applied", 9, "Campus drive"],
  [3, 3, "applied", 6, "Referral"], [5, 4, "screening", 13, "LinkedIn"], [2, 2, "interview", 18, "Campus drive"],
].filter(Boolean);

const FLOW = ["applied", "screening", "interview", "offer", "hired"];
const NOTE_TEXT = [
  "Strong communicator on the intro call. Wants to understand team structure and growth path.",
  "Portfolio is impressive; follow up on the details of the checkout redesign.",
  "Salary expectations are within range. Available to start in 30 days.",
  "Technical screen went well. Struggled slightly with system design trade-offs but reasoned clearly.",
  "References requested. Two positive so far.",
  "Concern: limited exposure to production on-call. Probe in the next round.",
  "Great culture add: mentors juniors and writes thorough documentation.",
  "Asked thoughtful questions about our testing practices.",
];

function resume(person, family, years, city) {
  const pool = POOLS[family];
  const skillCount = family === "intern" ? 4 : between(5, 7);
  const skills = [...pool].sort(() => rand() - 0.5).slice(0, Math.min(skillCount, pool.length));
  const title = pick(TITLES[family]);
  const bullets = BULLETS[family]
    .map((b) => b.replace("{s0}", skills[0]).replace("{s1}", skills[1] ?? skills[0]))
    .slice(0, family === "intern" ? 3 : 4);
  const c1 = pick(COMPANIES);
  let c2 = pick(COMPANIES);
  if (c2 === c1) c2 = COMPANIES[(COMPANIES.indexOf(c1) + 1) % COMPANIES.length];
  const text = [
    `${person}`,
    `${title} · ${city}`,
    "",
    "SUMMARY",
    years > 0
      ? `${title} with ${years} year${years === 1 ? "" : "s"} of experience. Focused on shipping reliable work and learning quickly.`
      : "Final-year student looking for a first engineering role; strong fundamentals and several personal projects.",
    "",
    years > 0 ? "EXPERIENCE" : "PROJECTS",
    years > 0 ? `${title}, ${c1} (${2026 - Math.max(1, Math.ceil(years / 2))} – present)` : "Selected projects",
    ...bullets.slice(0, 2).map((b) => `- ${b}`),
    ...(years > 2 ? [`${pick(TITLES[family])}, ${c2} (${2026 - years} – ${2026 - Math.max(1, Math.ceil(years / 2))})`, ...bullets.slice(2).map((b) => `- ${b}`)] : bullets.slice(2).map((b) => `- ${b}`)),
    "",
    "SKILLS",
    skills.join(", "),
    "",
    "EDUCATION",
    years > 0 ? "B.Tech, Computer Science — University of Pune" : "B.Tech (expected 2027), Computer Science — Mumbai Institute of Technology",
  ].join("\n");
  return { skills, title, text };
}

const lines = [];
const out = (s = "") => lines.push(s);

out("-- Generated by scripts/generate-seed.mjs — deterministic fictional demo data. Do not edit by hand.");
out("-- Prerequisite: at least one user exists in auth.users (see README → Demo account).");
out("-- Re-running this file RESETS demo data (candidates, jobs, applications, notes, activity, analyses).");
out("begin;");
out("set local app.seeding = 'on';");
out("");
out("do $$ begin");
out("  if not exists (select 1 from public.profiles) then");
out("    raise exception 'No users found. Create the demo user first (npm run demo:user), then run this seed.';");
out("  end if;");
out("  perform set_config('app.owner', (select id::text from public.profiles order by created_at limit 1), true);");
out("end $$;");
out("");
out("delete from public.candidates;");
out("delete from public.jobs;");
out("");

JOBS.forEach((j, i) => {
  const reqs = JSON.stringify({ skills: j.skills, min_experience_years: j.exp, notes: "" });
  out(
    `insert into public.jobs (id, title, department, location, employment_type, description, requirements, status, created_by, created_at) values (${q(uuid("aaaaaaaa", i + 1))}, ${q(j.t)}, ${q(j.d)}, ${q(j.l)}, ${q(j.type)}, ${q(j.desc)}, ${q(reqs)}::jsonb, ${q(j.status)}, current_setting('app.owner')::uuid, now() - interval '${70 - i * 3} days');`,
  );
});
out("");

const generated = PEOPLE.map(([name, family, years], i) => {
  const city = CITIES[i % CITIES.length];
  const r = resume(name, family, years, city);
  const email = name.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.com";
  const slug = name.toLowerCase().replace(/[^a-z]+/g, "-");
  const hasResume = i % 7 !== 6; // a few candidates have no resume text, to demo the empty state
  out(
    `insert into public.candidates (id, full_name, email, phone, location, current_title, experience_years, skills, linkedin_url, portfolio_url, resume_text, created_by, created_at) values (${q(uuid("cccccccc", i + 1))}, ${q(name)}, ${q(email)}, ${q("+91 98" + String(10000000 + i * 137913).slice(0, 8))}, ${q(city)}, ${q(r.title)}, ${years}, ${q(JSON.stringify(r.skills))}::jsonb, ${q("https://www.linkedin.com/in/" + slug)}, ${family === "design" || family === "frontend" ? q("https://" + slug + ".example.com") : "null"}, ${hasResume ? q(r.text) : "null"}, current_setting('app.owner')::uuid, now() - interval '${APPS.filter((a) => a[0] === i).reduce((m, a) => Math.max(m, a[3]), 1) + between(0, 3)} days');`,
  );
  return r;
});
out("");

let appNo = 0;
const actLines = [];
const noteLines = [];
APPS.forEach(([pi, ji, stage, daysAgo, source]) => {
  appNo += 1;
  const id = uuid("bbbbbbbb", appNo);
  const flowEnd = stage === "rejected" ? Math.min(between(0, 2), FLOW.length - 2) : FLOW.indexOf(stage);
  // timeline of stage entries (days ago), each step 2–6 days later, never in the future
  let d = daysAgo;
  const steps = [{ stage: "applied", d }];
  for (let k = 1; k <= flowEnd; k++) {
    d = Math.max(0, d - between(2, 6));
    steps.push({ stage: FLOW[k], d });
  }
  if (stage === "rejected") {
    d = Math.max(0, d - between(1, 4));
    steps.push({ stage: "rejected", d });
  }
  const last = steps[steps.length - 1];
  out(
    `insert into public.applications (id, candidate_id, job_id, stage, source, applied_at, last_stage_changed_at, rejection_reason, created_by, created_at) values (${q(id)}, ${q(uuid("cccccccc", pi + 1))}, ${q(uuid("aaaaaaaa", ji + 1))}, ${q(stage)}, ${q(source)}, now() - interval '${daysAgo} days', now() - interval '${last.d} days', ${stage === "rejected" ? q(pick(["Skills not aligned with the role", "Withdrew after screening", "Salary expectations outside range", "Position filled by another candidate"])) : "null"}, current_setting('app.owner')::uuid, now() - interval '${daysAgo} days');`,
  );
  actLines.push(
    `insert into public.activity_logs (application_id, actor_id, event_type, description, metadata, created_at) values (${q(id)}, current_setting('app.owner')::uuid, 'application_created', ${q("Applied for " + JOBS[ji].t)}, '{}'::jsonb, now() - interval '${daysAgo} days');`,
  );
  for (let k = 1; k < steps.length; k++) {
    const from = steps[k - 1].stage;
    const to = steps[k].stage;
    actLines.push(
      `insert into public.activity_logs (application_id, actor_id, event_type, description, metadata, created_at) values (${q(id)}, current_setting('app.owner')::uuid, 'stage_changed', ${q("Moved from " + from[0].toUpperCase() + from.slice(1) + " to " + to[0].toUpperCase() + to.slice(1))}, ${q(JSON.stringify({ from, to }))}::jsonb, now() - interval '${steps[k].d} days');`,
    );
  }
  if (rand() < 0.45 && stage !== "applied") {
    const nd = Math.max(0, last.d + between(0, 1));
    noteLines.push(
      `insert into public.candidate_notes (application_id, author_id, content, created_at, updated_at) values (${q(id)}, current_setting('app.owner')::uuid, ${q(pick(NOTE_TEXT))}, now() - interval '${nd} days', now() - interval '${nd} days');`,
    );
    actLines.push(
      `insert into public.activity_logs (application_id, actor_id, event_type, description, metadata, created_at) values (${q(id)}, current_setting('app.owner')::uuid, 'note_added', 'Recruiter note added', '{}'::jsonb, now() - interval '${nd} days');`,
    );
  }
});
out("-- notes");
noteLines.forEach(out);
out("");
out("-- activity history (back-dated; triggers are suppressed by app.seeding)");
actLines.forEach(out);
out("");
out("commit;");
process.stdout.write(lines.join("\n") + "\n");
