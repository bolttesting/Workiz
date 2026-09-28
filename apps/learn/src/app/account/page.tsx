"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@workix/db/browser";
import { LearnShell } from "@/components/LearnShell";
import { LearnPageHeader, LoadingState, formatRole } from "@/components/LearnUi";
import { apiClient } from "@/lib/api";
import type { InstructorProfile, Profile } from "@workix/db/types";

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient<{ profile: Profile }>("/me")
      .then(async (r) => {
        setProfile(r.profile);
        if (r.profile.role === "instructor" || r.profile.role === "super_admin") {
          const i = await apiClient<{ profile: InstructorProfile | null }>("/instructor/profile");
          setInstructor(i.profile);
          setHeadline(i.profile?.headline ?? "");
          setBio(i.profile?.bio ?? "");
        }
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  function onPhotoPick(file: File | null) {
    setPhotoFile(file);
    setPhotoMessage(null);
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function savePhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile) {
      setError("Choose an image first.");
      return;
    }
    setError(null);
    setPhotoMessage(null);
    setPhotoSaving(true);
    try {
      const body = new FormData();
      body.set("file", photoFile);
      const res = await apiClient<{ profile: Profile; avatarUrl: string }>("/me/avatar", { method: "POST", body });
      setProfile(res.profile);
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoMessage("Profile image saved.");
      window.dispatchEvent(new CustomEvent("workix-profile", { detail: { avatarUrl: res.avatarUrl } }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPhotoSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordMessage(null);
    if (nextPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (!profile) return;
    setPasswordSaving(true);
    try {
      const sb = createBrowserSupabase();
      const { error: currentError } = await sb.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      if (currentError) throw new Error("Current password is incorrect.");
      const { error: updateError } = await sb.auth.updateUser({ password: nextPassword });
      if (updateError) throw new Error(updateError.message);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPasswordSaving(false);
    }
  }

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
      <LearnPageHeader title="Account" description="Update your photo and password. Name and email stay on your learner profile." />
      {error ? (
        <div className="alert alert-danger radius-8 mb-24" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <LoadingState message="Loading account…" /> : null}
      {!loading && profile ? (
        <div className="row gy-4">
          <div className="col-xl-6">
            <div className="card radius-12 shadow-1 h-100">
              <div className="card-header border-bottom bg-base py-16 px-24">
                <h6 className="mb-0 fw-semibold">Profile</h6>
              </div>
              <div className="card-body p-24">
                <form onSubmit={savePhoto} className="d-flex align-items-center gap-3 mb-24">
                  {photoPreview || profile.avatar_url ? (
                    <img
                      src={photoPreview || profile.avatar_url || ""}
                      alt=""
                      width={64}
                      height={64}
                      className="radius-8"
                      style={{ width: 64, height: 64, objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      className="radius-8 d-inline-flex align-items-center justify-content-center fw-semibold"
                      style={{ width: 64, height: 64, background: "#102846", color: "#b69856" }}
                      aria-hidden="true"
                    >
                      {(profile.full_name || profile.email).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <label className="form-label mb-8" htmlFor="avatar">
                      Profile image
                    </label>
                    <input
                      id="avatar"
                      className="form-control form-control-sm mb-8"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => onPhotoPick(e.target.files?.[0] ?? null)}
                    />
                    <button className="btn btn-primary-600 btn-sm radius-8" type="submit" disabled={photoSaving || !photoFile}>
                      {photoSaving ? "Saving…" : "Save image"}
                    </button>
                    {photoMessage ? <p className="text-success mb-0 mt-8">{photoMessage}</p> : null}
                  </div>
                </form>
                <dl className="row mb-0 gy-3">
                  <dt className="col-sm-4 text-secondary-light fw-medium">Name</dt>
                  <dd className="col-sm-8 mb-0">{profile.full_name || "—"}</dd>
                  <dt className="col-sm-4 text-secondary-light fw-medium">Email</dt>
                  <dd className="col-sm-8 mb-0">{profile.email}</dd>
                  <dt className="col-sm-4 text-secondary-light fw-medium">Role</dt>
                  <dd className="col-sm-8 mb-0 text-capitalize">{formatRole(profile.role)}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="col-xl-6">
            <form className="card radius-12 shadow-1 h-100" onSubmit={savePassword}>
              <div className="card-header border-bottom bg-base py-16 px-24">
                <h6 className="mb-0 fw-semibold">Password</h6>
              </div>
              <div className="card-body p-24">
                {passwordMessage ? <p className="text-success mb-16">{passwordMessage}</p> : null}
                <label className="form-label" htmlFor="current-password">
                  Current password
                </label>
                <input
                  id="current-password"
                  className="form-control mb-16"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <label className="form-label" htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  className="form-control mb-16"
                  type="password"
                  autoComplete="new-password"
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <label className="form-label" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  className="form-control mb-16"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button className="btn btn-primary-600 radius-8" type="submit" disabled={passwordSaving}>
                  {passwordSaving ? "Updating…" : "Change password"}
                </button>
              </div>
            </form>
          </div>
          {instructor ? (
            <div className="col-xl-6">
              <form className="card radius-12 shadow-1 h-100" onSubmit={saveInstructor}>
                <div className="card-header border-bottom bg-base py-16 px-24">
                  <h6 className="mb-0 fw-semibold">Public instructor profile</h6>
                </div>
                <div className="card-body p-24">
                  {saved ? <p className="text-success mb-16">Saved.</p> : null}
                  <label className="form-label" htmlFor="headline">
                    Headline
                  </label>
                  <input id="headline" className="form-control mb-16" value={headline} onChange={(e) => setHeadline(e.target.value)} />
                  <label className="form-label" htmlFor="bio">
                    Bio
                  </label>
                  <textarea id="bio" className="form-control mb-16" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
                  <button className="btn btn-primary-600 radius-8" type="submit">
                    Save profile
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </LearnShell>
  );
}
