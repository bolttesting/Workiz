import Link from "next/link";

const metricTints = ["gradient-bg-end-1", "gradient-bg-end-2", "gradient-bg-end-5", "gradient-bg-end-3"];
const metricLabels = ["People", "Companies", "Live courses", "Revenue"];

const quickActions = [
  { href: "/courses", label: "New course", icon: "ri-graduation-cap-fill" },
  { href: "/blog", label: "Write blog", icon: "ri-quill-pen-fill" },
  { href: "/organizations", label: "Companies", icon: "ri-building-4-fill" },
  { href: "/orders", label: "Orders", icon: "ri-shopping-bag-3-fill" },
];

function BoneRows({ rows, columns }: { rows: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <td key={column}>
              <span className={column === 0 ? "workiz-bone workiz-bone--cell" : "workiz-bone workiz-bone--chip"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DashboardSkeleton() {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

  return (
    <div className="workiz-dash" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Loading dashboard</span>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h6 className="fw-semibold mb-0">Dashboard</h6>
          <p className="text-neutral-600 mt-4 mb-0">Courses, company seats, and paid revenue.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link href="/courses" className="btn btn-primary-600 radius-8 px-20">
            Manage courses
          </Link>
          <a href={`${webUrl}/courses`} className="btn btn-outline-primary-600 radius-8 px-20" target="_blank" rel="noreferrer">
            View website
          </a>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2">
        {quickActions.map((item) => (
          <Link key={item.href} href={item.href} className="btn btn-outline-primary-600 radius-8 px-16 py-8 d-inline-flex align-items-center gap-2">
            <i className={item.icon} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="row gy-4">
        <div className="col-xxl-8">
          <div className="row gy-4">
            {metricLabels.map((label, index) => (
              <div key={label} className="col-sm-6">
                <div className={`card shadow-1 radius-8 h-100 ${metricTints[index]}`}>
                  <div className="card-body p-20">
                    <div className="d-flex align-items-center gap-3 mb-16">
                      <span className="workiz-bone workiz-bone--dot" />
                      <p className="fw-medium text-primary-light mb-0">{label}</p>
                    </div>
                    <span className="workiz-bone workiz-bone--value" />
                    <span className="workiz-bone workiz-bone--meta" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-xxl-4">
          <div className="card h-100">
            <div className="card-body p-0">
              <div className="d-flex align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                <h6 className="text-lg mb-0">Seats and catalog</h6>
              </div>
              <div className="p-20 d-flex flex-column gap-3">
                <span className="workiz-bone workiz-bone--bar" />
                <span className="workiz-bone workiz-bone--bar" />
                <span className="workiz-bone workiz-bone--cell" />
                <span className="workiz-bone workiz-bone--cell" />
                <span className="workiz-bone workiz-bone--meta" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4">
        <div className="col-xxl-8">
          <div className="card shadow-1 radius-8 h-100">
            <div className="card-body p-0">
              <div className="px-20 py-16 border-bottom border-neutral-200">
                <h6 className="text-lg mb-0">Revenue</h6>
              </div>
              <div className="p-20">
                <span className="workiz-bone workiz-bone--chart" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-xxl-4">
          <div className="card shadow-1 radius-8 h-100">
            <div className="card-body p-20">
              <h6 className="text-lg mb-16">Quizzes</h6>
              <span className="workiz-bone workiz-bone--cell" />
              <span className="workiz-bone workiz-bone--value" />
              <span className="workiz-bone workiz-bone--btn mt-24" />
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4">
        {[
          { title: "Recent orders", href: "/orders", headers: ["Date", "Kind", "Amount"] },
          { title: "Courses", href: "/courses", headers: ["Title", "Status", "Price"] },
        ].map((panel) => (
          <div key={panel.title} className="col-xxl-6">
            <div className="card shadow-1 radius-8 h-100">
              <div className="card-body p-0">
                <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
                  <h6 className="text-lg mb-0">{panel.title}</h6>
                  <Link href={panel.href} className="text-primary-600 fw-semibold text-sm">
                    View all
                  </Link>
                </div>
                <div className="p-20">
                  <div className="workiz-admin-table-wrap">
                    <table className="table workiz-dash-table mb-0">
                      <thead>
                        <tr>
                          {panel.headers.map((header) => (
                            <th key={header}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <BoneRows rows={5} columns={panel.headers.length} />
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
