# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individual learners buy courses and study them in the learn app. Company admins buy seats and assign the catalog to employees. Platform staff (super admins and instructors) publish courses and teach. This record’s primary scene is the individual learner returning to continue a course they already own.

## Product Purpose

WORKIZ is a platform-owned LMS. Individuals purchase courses. Companies purchase seats for the full catalog. Success for an individual is opening the learn app and resuming the next unfinished lesson without hunting through a catalog.

## Positioning

One catalog, two ways in: a personal purchase or a company seat. The learner’s dashboard shows only courses they can open, and distinguishes a purchase from a seat.

## Operating Context

Local apps: marketing on port 3000, learn on 3001, admin on 3002, API on 4000. Learners sign in, land on My courses, open a course player, and can reach certificates, invoices, and account from the same shell. Prices are in UAE Dirham.

## Capabilities and Constraints

Confirmed for the individual dashboard: profile (`/me`), enrollments and courses (`/me/enrollments`), lesson completion (`/me/progress`), certificates (`/me/certificates`), invoices (`/me/invoices`). Course outlines come from `/courses/:slug`. Continue opens the existing course player. Do not invent progress percentages the API cannot support, prices, or certificates that were not issued.

Inferred from the repository and the redesign request, not from a separate interview: the surface to replace is the individual learner home (`apps/learn`), not the company team page and not the marketing site.

## Brand Commitments

Name: WORKIZ. Mark colors already in the learn app: navy `#102846` and gold `#b69856`. The learn shell is the edudash sidebar (My courses, Catalog, Certificates, Invoices, Account).

## Evidence on Hand

Course titles, thumbnails, subtitles, enrollment source, lesson completion, certificate issue dates, and invoice numbers come from the API. Empty states are real when the learner has no enrollments. Do not fabricate testimonials, completion rates, or invoice amounts.

## Product Principles

- Show the next lesson before the catalog.
- A purchase and a company seat stay visibly different.
- Certificates and invoices are reachable from the same visit, without becoming the page.
- The shell navigation stays; the home composition can change.
