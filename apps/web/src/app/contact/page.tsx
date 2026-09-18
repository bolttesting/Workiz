import { SiteFooter, SiteHeader, Breadcrumb } from "@/components/SiteChrome";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <Breadcrumb title="Contact" crumb="Contact" />
      <section className="course-sign-form-area">
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <h2>Talk to Workiz</h2>
              <p>
                Contracting seats for your teams, setting up a company admin, or assigning courses by department? Email
                hello@workiz.com — based in Dubai Silicon Oasis, UAE.
              </p>
            </div>
            <div className="col-lg-6">
              <form className="sign-form-wrapper" action={`mailto:hello@workiz.com`} method="post">
                <div className="form-input-box">
                  <label>Name</label>
                  <input className="form-control" name="name" required />
                </div>
                <div className="form-input-box mt-3">
                  <label>Email</label>
                  <input className="form-control" type="email" name="email" required />
                </div>
                <div className="form-input-box mt-3">
                  <label>Message</label>
                  <textarea className="form-control" name="message" rows={5} required />
                </div>
                <div className="sign-btn mt-3">
                  <button type="submit">Send</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
