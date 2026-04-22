# Decisions

- 2026-04-21: Use `/verify-email` as the guest-facing verification-needed page and send verification callbacks to `/login?verified=1`, preserving a safe `next` path when present.
- 2026-04-21: Use a single `/reset-password` page for both reset-link requests and token-based password updates so Better Auth's redirect callback lands on one stable frontend route.
- 2026-04-21: Route successful email/password sign-ins through `/passkey?next=...` so users can add a platform passkey before continuing to the destination page.
- 2026-04-21: Scaffold profile settings at `/profile/settings`, but only persist fields the backend currently patches (`userKind` and `isProfilePublic`); keep name, email, and avatar as read-only account metadata for now.
- 2026-04-21: Keep auth/settings pages thin by routing auth and passkey mutations through composables, and express their UI with Nuxt UI defaults plus inline Tailwind utilities rather than custom scoped class systems.
