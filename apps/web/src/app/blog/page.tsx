import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";
import { BlogCard } from "@/components/BlogCard";
import { fetchBlogPosts } from "@/lib/blog";

export default async function BlogPage() {
  const posts = await fetchBlogPosts();
  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Blog" crumb="Blog" />
      <div className="blog-area style-one blog">
        <div className="container">
          <div className="row">
            {posts.map((post) => (
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
