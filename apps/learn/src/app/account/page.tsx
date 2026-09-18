"use client";

import { useEffect, useState } from "react";
import { LearnShell } from "@/components/LearnShell";
import { apiClient } from "@/lib/api";
import type { InstructorProfile, Profile } from "@workix/db/types";

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<{ profile: Profile }>("/me")
      .then(async (r) => {
        setProfile(r.profile);
        if (r.profile.role === "instructor" || r.profile.role === "super_admin") {
          const i = await apiClient<{ profile: InstructorProfile | null }>("/instructor/profile");
          setInstructor(i.profile);
          setHeadline(i.profile?.headline ?? "");
          setBio(i.profile?.bio ?? "");
        }
      })
      .catch(() => undefined);
  }, []);

  async function saveInstructor(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const res = await apiClient<{ profile: InstructorProfile }>("/instructor/profile", {
        method: "PATCH",
        body: JSON.stringify({ headline, bio }),
      });
      setInstructor(res.profile);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <LearnShell>
      <h6 className="mb-24">Account</h6>
      <div className="card radius-12 mb-24">
        <div className="card-body">
          <p>
            <strong>Name:</strong> {profile?.full_name}
          </p>
          <p>
            <strong>Email:</strong> {profile?.email}
          </p>
          <p>
            <strong>Role:</strong> {profile?.role}
          </p>
        </div>
      </div>
      {instructor ? (
        <form className="card radius-12" onSubmit={saveInstructor}>
          <div className="card-body">
            <h6 className="mb-16">Public instructor profile</h6>
            {error ? <p className="text-danger">{error}</p> : null}
            {saved ? <p className="text-success">Saved.</p> : null}
            <label className="form-label">Headline</label>
            <input className="form-control mb-16" value={headline} onChange={(e) => setHeadline(e.target.value)} />
            <label className="form-label">Bio</label>
            <textarea className="form-control mb-16" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
            <button className="btn btn-primary-600" type="submit">
              Save profile
            </button>
          </div>
        </form>
      ) : null}
    </LearnShell>
  );
}
