export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  dateLabel: string;
  dateFull: string;
  author: string;
  authorImage: string;
  thumb: string;
  icon?: string;
  boxClass?: string;
  category: string;
  body: string[];
  quote: string;
  content_html?: string;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  og_image_url?: string | null;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "strategies-for-online-learning",
    title: "10 Proven Strategies to Excel at Online Learning",
    excerpt: "Practical habits that help employees finish assigned courses and help companies get value from every seat.",
    dateLabel: "28 JAN",
    dateFull: "28 January, 2026",
    author: "John D. Alexon",
    authorImage: "/assets/images/home-one/blog-autor1.png",
    thumb: "/assets/images/home-one/blog-thumb1.png",
    icon: "/assets/images/home-one/blog-icon1.png",
    boxClass: "box-1",
    category: "Learning",
    body: [
      "Online learning works best when people treat it like a real work commitment, not a spare-time hobby. Set a weekly study block, open the same course until you finish the next lesson, and track progress in WORKIZ so managers can see what is getting done.",
      "For companies, the win is seat utilization. Assign a short path, review quiz results, and celebrate certificates. That keeps training connected to the job instead of a catalog nobody opens.",
      "Start with one course per person, not ten. Completion beats browsing.",
    ],
    quote: "Finish one lesson before you open the next. Progress compounds when focus stays narrow.",
  },
  {
    slug: "trends-shaping-learning",
    title: "Trends That Are Shaping the Learning Experience",
    excerpt: "Recorded lessons, quizzes, and certificates are becoming the default for busy teams.",
    dateLabel: "29 JAN",
    dateFull: "29 January, 2026",
    author: "Anjelina Watson",
    authorImage: "/assets/images/home-one/blog-autor2.png",
    thumb: "/assets/images/home-one/blog-thumb2.png",
    icon: "/assets/images/home-one/blog-icon2.png",
    boxClass: "box-2",
    category: "Product",
    body: [
      "Teams want learning that fits around work. That is why WORKIZ focuses on recorded video, structured lessons, and certificates instead of forcing everyone onto live calls.",
      "Seat contracts are rising because companies want one platform where admins create accounts and assign the right courses by department.",
      "The trend is ownership. Platform instructors teach the catalog you publish — not a marketplace of random sellers.",
    ],
    quote: "The best learning experience is the one people can finish between meetings.",
  },
  {
    slug: "soft-skills-and-professional-growth",
    title: "Learning Soft Skills for Professional Growth",
    excerpt: "Communication, leadership, and workplace habits travel with every role change.",
    dateLabel: "30 JAN",
    dateFull: "30 January, 2026",
    author: "David X. Barmer",
    authorImage: "/assets/images/home-one/blog-autor3.png",
    thumb: "/assets/images/home-one/blog-thumb3.png",
    icon: "/assets/images/home-one/blog-icon3.png",
    boxClass: "box-3",
    category: "Careers",
    body: [
      "Hard skills get you hired. Soft skills help you stay effective with customers and teammates. WORKIZ courses cover both so companies can train the whole team from one seat plan.",
      "Quizzes check understanding. Certificates give learners a clear finish line. Managers get a simple signal that training happened.",
      "Build a short soft-skills path first: communication, feedback, and leadership foundations. Then expand the catalog.",
    ],
    quote: "Professional growth sticks when practice, feedback, and proof of completion stay in one place.",
  },
];

function normalizePost(raw: Record<string, unknown>, index = 0): BlogPost {
  return {
    slug: String(raw.slug ?? ""),
    title: String(raw.title ?? ""),
    excerpt: String(raw.excerpt ?? ""),
    dateLabel: String(raw.dateLabel ?? ""),
    dateFull: String(raw.dateFull ?? ""),
    author: String(raw.author ?? "Workiz Team"),
    authorImage: String(raw.authorImage ?? "/assets/images/home-one/blog-autor1.png"),
    thumb: String(raw.thumb ?? "/assets/images/home-one/blog-thumb1.png"),
    icon: String(raw.icon ?? `/assets/images/home-one/blog-icon${(index % 3) + 1}.png`),
    boxClass: String(raw.boxClass ?? `box-${(index % 3) + 1}`),
    category: String(raw.category ?? "Learning"),
    body: Array.isArray(raw.body) ? (raw.body as string[]) : [],
    quote: String(raw.quote ?? ""),
    content_html: raw.content_html ? String(raw.content_html) : undefined,
    seo_title: (raw.seo_title as string | null) ?? null,
    seo_description: (raw.seo_description as string | null) ?? null,
    seo_keywords: (raw.seo_keywords as string | null) ?? null,
    og_image_url: (raw.og_image_url as string | null) ?? null,
  };
}

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API}/blog`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("blog api failed");
    const data = (await res.json()) as { posts?: Record<string, unknown>[] };
    if (!data.posts?.length) return BLOG_POSTS;
    return data.posts.map((post, index) => normalizePost(post, index));
  } catch {
    return BLOG_POSTS;
  }
}

export async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API}/blog/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = (await res.json()) as { post?: Record<string, unknown> };
      if (data.post) return normalizePost(data.post);
    }
  } catch {
    // fall through to static
  }
  return BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
