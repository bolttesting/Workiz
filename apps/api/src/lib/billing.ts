import type Stripe from "stripe";
import { adminDb } from "./db.js";
import { listSeatPlans } from "./plans.js";
import { readReminderStatus } from "./reminder-status.js";
import { stripe } from "./stripe.js";

type OrgRow = {
  id: string;
  stripe_subscription_id: string | null;
  current_period_end?: string | null;
  status: string;
};

export function periodEndIso(sub: Stripe.Subscription) {
  const legacy = sub as Stripe.Subscription & { current_period_end?: number };
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const unix = legacy.current_period_end ?? item?.current_period_end;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

export async function rememberPeriodEnd(orgId: string, periodEnd: string | null) {
  if (!periodEnd) return false;
  const { error } = await adminDb.from("organizations").update({ current_period_end: periodEnd }).eq("id", orgId);
  if (error && /current_period_end/i.test(error.message)) return false;
  return !error;
}

export type CompanyInvoice = {
  id: string;
  number: string;
  amountCents: number;
  currency: string;
  issuedAt: string | null;
};

export type CompanyProblemOrder = {
  id: string;
  status: string;
  amountCents: number;
  createdAt: string | null;
  label: string;
};

export type CompanyMoneyPoint = { key: string; amountCents: number };

export type CompanyBilling = {
  companyName: string;
  seats: number;
  seatsUsed: number;
  status: string;
  monthlyCents: number | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasSubscription: boolean;
  invoices: CompanyInvoice[];
  problemOrders: CompanyProblemOrder[];
  monthSources: { label: string; amountCents: number }[];
  paymentsByMonth: CompanyMoneyPoint[];
  paymentsByDay: CompanyMoneyPoint[];
  mailNote: string | null;
};

export async function loadCompanyBilling(orgId: string): Promise<CompanyBilling | null> {
  const { data: org } = await adminDb
    .from("organizations")
    .select("id, name, seat_limit, seat_used, status, stripe_subscription_id, current_period_end")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return null;

  let monthlyCents: number | null = null;
  let renewsAt = org.current_period_end ? String(org.current_period_end) : null;
  let cancelAtPeriodEnd = false;
  let status = String(org.status);

  if (org.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const sub = await stripe().subscriptions.retrieve(org.stripe_subscription_id);
      const item = sub.items.data[0];
      const unit = item?.price?.unit_amount ?? 0;
      const quantity = item?.quantity ?? 1;
      monthlyCents = unit * quantity;
      renewsAt = periodEndIso(sub) ?? renewsAt;
      cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
      if (renewsAt) await rememberPeriodEnd(org.id, renewsAt);
      status =
        sub.status === "active" || sub.status === "trialing"
          ? "active"
          : sub.status === "past_due"
            ? "past_due"
            : "canceled";
    } catch {
      /* keep the saved company record if Stripe is briefly unavailable */
    }
  }

  const { data: orders } = await adminDb
    .from("orders")
    .select("id, kind, status, amount_cents, course_id, seat_quantity, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);
  const paidOrders = (orders ?? []).filter((order) => order.status === "paid");
  const orderIds = paidOrders.map((order) => order.id);
  const { data: invoices } = orderIds.length
    ? await adminDb
        .from("invoices")
        .select("id, number, amount_cents, currency, issued_at")
        .in("order_id", orderIds)
    : { data: [] as { id: string; number: string; amount_cents: number; currency: string; issued_at: string | null }[] };

  const courseIds = [...new Set((orders ?? []).map((order) => order.course_id).filter((id): id is string => Boolean(id)))];
  const titleById = new Map<string, string>();
  if (courseIds.length) {
    const { data: courses } = await adminDb.from("courses").select("id, title").in("id", courseIds);
    for (const course of courses ?? []) titleById.set(course.id, course.title);
  }
  const plans = await listSeatPlans().catch(() => []);
  const sourceLabel = (order: { kind?: string | null; amount_cents?: number | null; course_id?: string | null }) => {
    if (order.kind === "seats") {
      const match = plans.find((plan) => !plan.custom && plan.monthlyCents > 0 && plan.monthlyCents === (order.amount_cents ?? 0));
      return match?.name ?? "Company seats";
    }
    return titleById.get(order.course_id || "") || "Course";
  };

  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const byMonth = new Map(monthKeys.map((key) => [key, 0]));
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const byDay = new Map(
    Array.from({ length: daysInMonth }, (_, index) => {
      const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
      return [key, 0] as const;
    }),
  );
  const sourceMap = new Map<string, number>();
  for (const order of paidOrders) {
    const created = order.created_at ? new Date(order.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const key = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, "0")}`;
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + (order.amount_cents ?? 0));
    if (key === monthKey) {
      const day = String(order.created_at).slice(0, 10);
      if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + (order.amount_cents ?? 0));
      const label = sourceLabel(order);
      sourceMap.set(label, (sourceMap.get(label) ?? 0) + (order.amount_cents ?? 0));
    }
  }
  const mail = readReminderStatus();
  const mailFresh = mail ? Date.now() - new Date(mail.at).getTime() < 14 * 86_400_000 : false;

  return {
    companyName: org.name,
    seats: org.seat_limit,
    seatsUsed: org.seat_used,
    status,
    monthlyCents,
    renewsAt,
    cancelAtPeriodEnd,
    hasSubscription: Boolean(org.stripe_subscription_id),
    invoices: (invoices ?? [])
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amountCents: invoice.amount_cents,
        currency: invoice.currency,
        issuedAt: invoice.issued_at,
      }))
      .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? "")),
    problemOrders: (orders ?? [])
      .filter((order) => order.status === "failed" || order.status === "refunded")
      .slice(0, 5)
      .map((order) => ({
        id: String(order.id),
        status: String(order.status),
        amountCents: order.amount_cents ?? 0,
        createdAt: order.created_at ? String(order.created_at) : null,
        label: sourceLabel(order),
      })),
    monthSources: [...sourceMap.entries()]
      .map(([label, amountCents]) => ({ label, amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents)
      .slice(0, 6),
    paymentsByMonth: monthKeys.map((key) => ({ key, amountCents: byMonth.get(key) ?? 0 })),
    paymentsByDay: [...byDay.entries()].map(([key, amountCents]) => ({ key, amountCents })),
    mailNote: mail && !mail.ok && mailFresh ? "The Monday reminder email did not send." : null,
  };
}

export async function adminHomeSignals() {
  const empty = {
    draftCoursesNamed: [] as { id: string; title: string }[],
    openQuestions: [] as { id: string; prompt: string; courseTitle: string }[],
    pastDueCompanies: [] as { id: string; name: string }[],
    unusedSeatCompanies: [] as { id: string; name: string; seats: number }[],
    coursesWithoutInstructor: [] as { id: string; title: string }[],
    blogDrafts: [] as { id: string; title: string }[],
    emptyQuizzes: [] as { id: string; title: string; courseId: string | null }[],
  };
  try {
    const [
      drafts,
      questions,
      orgs,
      published,
      links,
      posts,
      quizRows,
      questionRows,
    ] = await Promise.all([
      adminDb.from("courses").select("id,title").eq("published", false).order("updated_at", { ascending: false }).limit(5),
      adminDb.from("course_questions").select("id,body,course_id").is("answer_body", null).order("created_at", { ascending: false }).limit(5),
      adminDb.from("organizations").select("id,name,status,seat_limit,seat_used"),
      adminDb.from("courses").select("id,title").eq("published", true),
      adminDb.from("course_instructors").select("course_id"),
      adminDb.from("blog_posts").select("id,title").eq("published", false).order("updated_at", { ascending: false }).limit(5),
      adminDb.from("quizzes").select("id,title,lesson_id").limit(80),
      adminDb.from("quiz_questions").select("quiz_id").limit(500),
    ]);
    const questionCourseIds = [...new Set((questions.data ?? []).map((row) => row.course_id).filter(Boolean))];
    const { data: questionCourses } = questionCourseIds.length
      ? await adminDb.from("courses").select("id,title").in("id", questionCourseIds)
      : { data: [] as { id: string; title: string }[] };
    const questionTitle = new Map((questionCourses ?? []).map((course) => [course.id, course.title]));
    const taught = new Set((links.data ?? []).map((row) => row.course_id));
    const asked = new Set((questionRows.data ?? []).map((row) => row.quiz_id));
    const lessonIds = (quizRows.data ?? []).map((row) => row.lesson_id).filter((id): id is string => Boolean(id));
    const { data: quizLessons } = lessonIds.length
      ? await adminDb.from("lessons").select("id,module_id").in("id", lessonIds)
      : { data: [] as { id: string; module_id: string }[] };
    const moduleIds = [...new Set((quizLessons ?? []).map((row) => row.module_id))];
    const { data: quizModules } = moduleIds.length
      ? await adminDb.from("modules").select("id,course_id").in("id", moduleIds)
      : { data: [] as { id: string; course_id: string }[] };
    const courseOfModule = new Map((quizModules ?? []).map((row) => [row.id, row.course_id]));
    const courseOfLesson = new Map((quizLessons ?? []).map((row) => [row.id, courseOfModule.get(row.module_id) ?? null]));
    return {
      draftCoursesNamed: (drafts.data ?? []).map((course) => ({ id: String(course.id), title: String(course.title) })),
      openQuestions: (questions.data ?? []).map((row) => ({
        id: String(row.id),
        prompt: String(row.body || "Question").replace(/\s+/g, " ").trim().slice(0, 80),
        courseTitle: questionTitle.get(row.course_id) || "Course",
      })),
      pastDueCompanies: (orgs.data ?? [])
        .filter((org) => org.status === "past_due")
        .slice(0, 5)
        .map((org) => ({ id: String(org.id), name: String(org.name || "Company") })),
      unusedSeatCompanies: (orgs.data ?? [])
        .filter((org) => org.status === "active" && Number(org.seat_limit) > 0 && Number(org.seat_used) === 0)
        .slice(0, 5)
        .map((org) => ({ id: String(org.id), name: String(org.name || "Company"), seats: Number(org.seat_limit) })),
      coursesWithoutInstructor: (published.data ?? [])
        .filter((course) => !taught.has(course.id))
        .slice(0, 5)
        .map((course) => ({ id: String(course.id), title: String(course.title) })),
      blogDrafts: (posts.error ? [] : posts.data ?? []).map((post) => ({ id: String(post.id), title: String(post.title || "Draft") })),
      emptyQuizzes: (quizRows.data ?? [])
        .filter((quiz) => !asked.has(quiz.id))
        .slice(0, 5)
        .map((quiz) => ({
          id: String(quiz.id),
          title: String(quiz.title || "Quiz"),
          courseId: quiz.lesson_id ? courseOfLesson.get(quiz.lesson_id) ?? null : null,
        })),
    };
  } catch {
    return empty;
  }
}

export async function scheduleCompanyCancel(orgId: string) {
  const { data: org } = await adminDb
    .from("organizations")
    .select("id, stripe_subscription_id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org?.stripe_subscription_id) {
    throw new Error("This package is not on a monthly card payment.");
  }
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Card payments are not configured.");
  const sub = await stripe().subscriptions.update(org.stripe_subscription_id, { cancel_at_period_end: true });
  await rememberPeriodEnd(orgId, periodEndIso(sub));
  return loadCompanyBilling(orgId);
}

export async function enrichOrganizationBilling<T extends OrgRow>(orgs: T[]) {
  if (!process.env.STRIPE_SECRET_KEY) return orgs;
  const client = stripe();
  return Promise.all(
    orgs.map(async (org) => {
      if (!org.stripe_subscription_id) return org;
      try {
        const sub = await client.subscriptions.retrieve(org.stripe_subscription_id);
        const periodEnd = periodEndIso(sub);
        if (periodEnd && periodEnd !== org.current_period_end) await rememberPeriodEnd(org.id, periodEnd);
        return {
          ...org,
          current_period_end: periodEnd ?? org.current_period_end ?? null,
          subscription_status: sub.status,
        };
      } catch {
        return org;
      }
    }),
  );
}
