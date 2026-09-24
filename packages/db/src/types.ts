export type UserRole =
  | "super_admin"
  | "instructor"
  | "company_admin"
  | "company_learner"
  | "individual_learner";

export type InstructorProfile = {
  user_id: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  public_visible: boolean;
};

export type CourseInstructor = {
  course_id: string;
  user_id: string;
  title: string;
  sort_order: number;
};

export type LessonType = "video" | "article" | "quiz";
export type EnrollmentSource = "purchase" | "seat";
export type MediaStatus = "uploaded" | "processing" | "ready" | "failed";
export type OrderKind = "course" | "seats";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type OrgStatus = "incomplete" | "active" | "past_due" | "canceled";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
};

export type Organization = {
  id: string;
  name: string;
  billing_email: string | null;
  seat_limit: number;
  seat_used: number;
  status: OrgStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  cover_video_url?: string | null;
  price_cents: number;
  currency: string;
  published: boolean;
  duration_minutes: number | null;
  level: string | null;
  learning_outcomes?: string[] | null;
  audience?: string[] | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string;
  category: string | null;
  thumb_url: string | null;
  author_name: string;
  author_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  type: LessonType;
  article_content: string | null;
  duration_seconds: number | null;
  sort_order: number;
  is_preview: boolean;
  quiz_id: string | null;
};

export type LessonResource = {
  id: string;
  lesson_id: string;
  title: string;
  file_key: string;
  file_url: string | null;
  content_type: string;
  byte_size: number | null;
  sort_order: number;
  created_at?: string;
};

export type MediaAsset = {
  id: string;
  lesson_id: string;
  original_key: string;
  hls_prefix: string | null;
  public_url?: string | null;
  status: MediaStatus;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  source: EnrollmentSource;
};

export type CourseReview = {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  body: string;
  created_at: string;
  updated_at?: string;
};

export type CourseQuestion = {
  id: string;
  course_id: string;
  user_id: string;
  body: string;
  answer_body: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  updated_at?: string;
};

export type Quiz = {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; email: string }; Update: Partial<Profile> };
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization> };
      courses: { Row: Course; Insert: Partial<Course> & { slug: string; title: string }; Update: Partial<Course> };
      modules: { Row: ModuleRow; Insert: Partial<ModuleRow> & { course_id: string; title: string }; Update: Partial<ModuleRow> };
      lessons: { Row: Lesson; Insert: Partial<Lesson> & { module_id: string; title: string }; Update: Partial<Lesson> };
      media_assets: { Row: MediaAsset; Insert: Partial<MediaAsset> & { lesson_id: string; original_key: string }; Update: Partial<MediaAsset> };
      lesson_resources: {
        Row: LessonResource;
        Insert: Partial<LessonResource> & { lesson_id: string; title: string; file_key: string };
        Update: Partial<LessonResource>;
      };
      enrollments: { Row: Enrollment; Insert: Partial<Enrollment> & { user_id: string; course_id: string; source: EnrollmentSource }; Update: Partial<Enrollment> };
      blog_posts: {
        Row: BlogPostRow;
        Insert: Partial<BlogPostRow> & { slug: string; title: string };
        Update: Partial<BlogPostRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
  };
};
