import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
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
                  <img src="/assets/images/inner-img/blog-details-thumb.png" alt={post.title} />
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
                      <i className="fa-solid fa-calendar-week" />
                      <span>{post.dateFull}</span>
                    </li>
                  </ul>
                  <h2 className="blog-title">{post.title}</h2>
                  {post.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)} className="blog-desc2">
                      {paragraph}
                    </p>
                  ))}
                  <div className="blog-quote">
                    <p>“{post.quote}”</p>
                  </div>
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
