import "./load-env.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requireUser, type Authed } from "./lib/auth.js";
import { courses } from "./routes/courses.js";
import { admin } from "./routes/admin.js";
import { checkout } from "./routes/checkout.js";
import { webhooks } from "./routes/webhooks.js";
import { orgs } from "./routes/orgs.js";
import { quizzes } from "./routes/quizzes.js";
import { media } from "./routes/media.js";
import { me } from "./routes/me.js";
import { instructor, publicInstructors } from "./routes/instructors.js";
import { processPdfJob } from "./jobs/pdf.js";

type Vars = { auth: Authed };

const app = new Hono<{ Variables: Vars }>();

const origin = [
  process.env.NEXT_PUBLIC_WEB_URL,
  process.env.NEXT_PUBLIC_LEARN_URL,
  process.env.NEXT_PUBLIC_ADMIN_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://www.localhost:3000",
  "http://learn.localhost:3001",
  "http://admin.localhost:3002",
].filter(Boolean) as string[];

app.use("*", logger());
app.use(
  "*",
  cors({
    origin,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "workix-api" }));
app.route("/webhooks", webhooks);
app.route("/courses", courses);
app.route("/instructors", publicInstructors);

app.use("/me/*", requireUser);
app.use("/me", requireUser);
app.use("/checkout/*", requireUser);
app.use("/orgs/*", requireUser);
app.use("/quizzes/*", requireUser);
app.use("/media/*", requireUser);
app.use("/admin/*", requireUser);
app.use("/instructor/*", requireUser);

app.route("/me", me);
app.route("/checkout", checkout);
app.route("/orgs", orgs);
app.route("/quizzes", quizzes);
app.route("/media", media);
app.route("/admin", admin);
app.route("/instructor", instructor);

app.post("/internal/pdf", async (c) => {
  const secret = c.req.header("x-internal-secret");
  if (!process.env.INTERNAL_JOB_SECRET || secret !== process.env.INTERNAL_JOB_SECRET) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const job = await c.req.json();
  await processPdfJob(job);
  return c.json({ ok: true });
});

const port = Number(process.env.API_PORT || 4000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`WORKIZ API on :${port}`);
});
