import Link from "next/link";
import type { BlogPost } from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <div className={`single-blog-box ${post.boxClass}`}>
      <div className="single-blog-thumb">
        <img src={post.thumb} alt={post.title} />
        <div className="blog-meta-top">
          <span>{post.dateLabel}</span>
        </div>
      </div>
      <div className="blog-content">
        <div className="blog-author">
          <h4>
            <img src={post.authorImage} alt={post.author} />
            {post.author}
          </h4>
        </div>
        <div className="blog-title">
          <h3>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </h3>
        </div>
        <div className="blog-btn">
          <Link href={`/blog/${post.slug}`}>
            Continue Reading <img src={post.icon} alt="" />
          </Link>
        </div>
      </div>
    </div>
  );
}
