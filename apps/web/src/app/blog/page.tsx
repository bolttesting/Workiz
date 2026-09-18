import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { BlogCard } from "@/components/BlogCard";
import { BLOG_POSTS } from "@/lib/blog";

export default function BlogPage() {
  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Blog" crumb="Blog" />
      <div className="blog-area style-one blog">
        <div className="container">
          <div className="row">
            {BLOG_POSTS.map((post) => (
              <div className="col-xl-4 col-lg-6 col-md-6" key={post.slug}>
                <BlogCard post={post} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
