import Link from "next/link";

const metricTints = ["gradient-bg-end-1", "gradient-bg-end-2", "gradient-bg-end-5", "gradient-bg-end-3"];
const metricLabels = ["Courses", "Lessons done", "Certificates", "Invoices"];

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
  return (
    <div className="workiz-dash" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Loading dashboard</span>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h6 className="fw-semibold mb-0">Dashboard</h6>
          <span className="workiz-bone workiz-bone--lede" />
        </div>
        <Link href="/catalog" className="btn btn-outline-primary-600 radius-8 px-20">
          Browse catalog
        </Link>
      </div>

      <div className="card shadow-1 radius-8">
        <div className="card-body p-20 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="flex-grow-1">
            <span className="workiz-bone workiz-bone--title" />
            <span className="workiz-bone workiz-bone--meta" />
          </div>
          <span className="workiz-bone workiz-bone--btn" />
        </div>
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
                <h6 className="text-lg mb-0">Course mix</h6>
              </div>
              <div className="p-20 d-flex flex-column gap-3">
                <span className="workiz-bone workiz-bone--bar" />
                <span className="workiz-bone workiz-bone--cell" />
                <span className="workiz-bone workiz-bone--cell" />
                <span className="workiz-bone workiz-bone--meta" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-1 radius-8">
        <div className="card-body p-0">
          <div className="d-flex flex-wrap align-items-center justify-content-between px-20 py-16 border-bottom border-neutral-200">
            <h6 className="text-lg mb-0">Your courses</h6>
            <Link href="/my-courses" className="text-primary-600 fw-semibold text-sm">
              My courses
            </Link>
          </div>
          <div className="p-20">
            <div className="workiz-admin-table-wrap">
              <table className="table workiz-dash-table mb-0">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Access</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <BoneRows rows={5} columns={4} />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4">
        {[
          { title: "Certificates", href: "/certificates", headers: ["Course", "Issued", "PDF"] },
          { title: "Invoices", href: "/invoices", headers: ["Number", "Amount", "Status", ""] },
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
                            <th key={header || "action"}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <BoneRows rows={3} columns={panel.headers.length} />
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
