import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { BLOG_POSTS, fetchBlogPost, fetchBlogPosts } from "@/lib/blog";

export async function generateStaticParams() {
  try {
    const posts = await fetchBlogPosts();
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return BLOG_POSTS.map((post) => ({ slug: post.slug }));
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) return { title: "Blog | Workiz" };
  return {
    title: post.seo_title || `${post.title} | Workiz`,
    description: post.seo_description || post.excerpt,
    keywords: post.seo_keywords || undefined,
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      images: post.og_image_url || post.thumb ? [{ url: post.og_image_url || post.thumb }] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) notFound();

  return (
    <>
      <SiteHeader />
      <Breadcrumb title={post.title} crumb="Blog Details" />
      <div className="blog-details-area">
        <div className="container">
          <div className="row">
            <div className="col-lg-10 offset-lg-1">
              <div className="single-blog-dtls-box">
                <div className="blog-thumb">
                  <img src={post.thumb || "/assets/images/inner-img/blog-details-thumb.png"} alt={post.title} />
                  <div className="meta-blog">
                    <Link href="/blog">{post.category}</Link>
                  </div>
                </div>
                <div className="blog-content">
                  <ul className="blog-author">
                    <li className="autor-name">
                      <img src={post.authorImage} alt={post.author} />
                      <span>{post.author}</span>
                    </li>
                    <li className="detail-calender">
                      <span>{post.dateFull}</span>
                    </li>
                  </ul>
                  <h2 className="blog-title">{post.title}</h2>
                  {post.content_html ? (
                    <div
                      className="workiz-blog-html"
                      dangerouslySetInnerHTML={{ __html: post.content_html }}
                    />
                  ) : (
                    <>
                      {post.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 32)} className="blog-desc2">
                          {paragraph}
                        </p>
                      ))}
                      {post.quote ? (
                        <div className="blog-quote">
                          <p>“{post.quote}”</p>
                        </div>
                      ) : null}
                    </>
                  )}
                  <div className="blog-btn mt-4">
                    <Link href="/blog">Back to Blog</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
