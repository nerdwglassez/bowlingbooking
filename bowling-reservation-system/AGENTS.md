# Agent / contributor routing

Use the smallest doc that matches the task. Avoid pasting the full root PRD unless defining new product scope.

| Task | Read first |
|------|------------|
| Browse all `/docs` files | [docs/README.md](docs/README.md) |
| Customer booking UI, confirmation, `/bookings`, profile, gift cards, waitlist claim | [docs/RESERVATION_FLOW.md](docs/RESERVATION_FLOW.md) + [docs/SHARED_PLATFORM.md](docs/SHARED_PLATFORM.md) |
| Staff/manager UI, admin UI, kiosk, partner API, crons affecting ops | [docs/STAFF_AND_ADMIN_EXPERIENCE.md](docs/STAFF_AND_ADMIN_EXPERIENCE.md) + [docs/SHARED_PLATFORM.md](docs/SHARED_PLATFORM.md) |
| Promo / corporate discount codes (booking preview, staff settings, admin) | [docs/STAFF_AND_ADMIN_EXPERIENCE.md](docs/STAFF_AND_ADMIN_EXPERIENCE.md) + [docs/RESERVATION_FLOW.md](docs/RESERVATION_FLOW.md) + [docs/SHARED_PLATFORM.md](docs/SHARED_PLATFORM.md) |
| Sessions, roles, availability, pricing, env, DB, shared header (`AppExperienceHeader`, `getHeaderUser`) | [docs/SHARED_PLATFORM.md](docs/SHARED_PLATFORM.md) |
| What requirements exist vs what is implemented | [PRD_GAP_ANALYSIS.md](PRD_GAP_ANALYSIS.md) |
| Full product specification | [bowling-prd.md](../bowling-prd.md) (repo root) |
| Run locally / deploy | [SETUP.md](SETUP.md), [docs/LOCAL_VS_LIVE.md](docs/LOCAL_VS_LIVE.md), [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) |

After behavior changes: update **PRD_GAP_ANALYSIS.md** and the relevant **flow doc** (`RESERVATION_FLOW` or `STAFF_AND_ADMIN_EXPERIENCE`).
