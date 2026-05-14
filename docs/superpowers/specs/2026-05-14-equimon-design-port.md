# Equimon Design Port — Lab Assistant, Lecturer, Head of Lab

**Date:** 2026-05-14  
**Scope:** Pure visual redesign — zero logic, routing, API, or state changes.

---

## Goal

Port the high-fidelity Equimon design handoff (`LabManagement.zip`) into the existing React codebase for three roles: **Lab Assistant**, **Lecturer**, and **Head of Lab**. The sidebar, DashboardLayout, ITS logo, and all application logic remain untouched.

---

## Constraints

- Sidebar (`sidebar.jsx`) — **do not touch**
- DashboardLayout (`DashboardLayout.jsx`) — **do not touch**
- ITS logo (`ITSSecond.png`) — **do not touch**
- All API calls, TanStack Query hooks, routing, state — **do not touch**
- Only JSX structure and Tailwind classNames change inside page/component files

---

## Accent Colors (role-specific)

| Role | Accent | Usage |
|---|---|---|
| Lab Assistant | `#f97316` (orange) | All accent highlights, active states, gradients |
| Lecturer | `#2563eb` (blue) | All accent highlights, active states, gradients |
| Head of Lab | `#7c3aed` (purple) | All accent highlights, active states, gradients |

Stat card metric colors (red/green/blue/purple per metric type) remain as-is regardless of role accent.

---

## New Files — Shared Design Primitives

All under `front/src/components/ui/equimon/`. Pure presentational — no API calls, no hooks (except what's passed as props).

### `EquimonStatCard.jsx`
Props: `tint, fg, icon, label, value, sub, badge, onClick`  
- `rounded-2xl` card, tinted bg, 1px border at `fg33`
- Decorative blob: `absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-30`
- Icon tile: 44px white/80 rounded-xl with soft shadow
- Value: 34px extrabold in `fg` color
- `badge` prop renders rose-500 pill top-right (e.g. "2 late")
- Hover: `translate-y-[-2px] shadow-md` (200ms ease)

### `EquimonGreetingHeader.jsx`
Props: `accent, name, greeting, date, labLoad`  
- `rounded-2xl` white card, two decorative blobs at top-right (absolute, `accent` color, low opacity)
- 56px icon tile (sun/sunset/moon SVG based on time-of-day, passed as prop)
- Date kicker: 11px / 700 / 1.5px tracking / uppercase / slate-400
- Title: 28px / extrabold / slate-900, first name in `accent` color
- Right side (≥lg): "Current Lab Load · X% utilized" with thin gradient progress bar

### `EquimonPageHeader.jsx`
Props: `accent, icon, title, badge, sub, sideLabel`  
- `rounded-2xl` white card
- 56px icon tile with gradient bg `accent22 → accent11`, border `accent33`
- Date kicker + title (24px extrabold) + colored badge pill inline
- Subtitle in slate-500
- Optional right-side chip (today's load count) in solid `accent` bg

### `EquimonActionPanel.jsx`
Props: `accent, items, count`  
Each item: `{ kind, color, icon, title, desc, onClick }`  
- `rounded-2xl` white card with `divide-y slate-100` rows
- Header: title + "{n} items" pill in `accent`
- Each row: 36px rounded-xl tinted icon tile + bold title + truncated desc + chevron
- Hover: `bg-slate-50` on row

### `front/src/utils/printItsReceipt.js`
Function: `printItsReceipt(request)`  
- Opens `window.open("", "_blank", "width=900,height=1200")`
- Writes full ITS-letterhead HTML document into the new window
- Auto-prints after 250ms via `setTimeout(() => w.print(), 250)`
- Print stylesheet: `@page { size: A4; margin: 18mm 16mm; }`
- Letterhead: circular ITS seal placeholder + full institution name + address + double navy border
- Sections: A. Equipment Info · B. Borrower Info · C. Purpose · D. Loan Period · E. Approval Chain table · F. Current Status stamp
- Signature block: 3-column (Borrower · Supervising Lecturer · Lab Assistant)
- Typography: Times New Roman / serif for print
- Replaces `BorrowRequestReportModal.jsx` (jsPDF) — all existing call sites updated to call `printItsReceipt(request)` instead

---

## Pages Updated

### Lab Assistant (accent: `#f97316`)

| File | Changes |
|---|---|
| `LabAssistantDashboard.jsx` | Swap existing StatCard → EquimonStatCard; replace hero banner → EquimonGreetingHeader; add EquimonActionPanel below greeting; update Equipment Overview and Activity Summary card styling to Equimon tokens |
| `EquipmentPreparation.jsx` | Prep cards: add gradient left rail (orange→prep, emerald→ready); status pill styling; checklist rows: 16px rounded checkbox, emerald fill when done, progress bar gradient; OpHeader → EquimonPageHeader |
| `LabAssistantBorrowRequests.jsx` | Return cards: colored left rail (rose=overdue, amber=due-soon, emerald=regular); status pills; OpHeader → EquimonPageHeader |
| `AllRequest.jsx` | Table header: 11px / 1.2px tracking / uppercase / slate-500 on bg-slate-50/70; row hover bg-slate-50/60; status pill palette from handoff; Print button → calls `printItsReceipt()`; Review button accent gradient |
| `AssistantSettings.jsx` | Page title area → EquimonPageHeader; card styling to Equimon tokens |

### Lecturer (accent: `#2563eb`)

| File | Changes |
|---|---|
| `LecturerDashboard.jsx` | Same dashboard swap as Lab Assistant but blue accent |
| `LecturerPendingApproval.jsx` | Approval cards: Equimon card style (rounded-2xl, tinted left rail, status pills, action buttons in accent) |
| `LecturerApprovalHistory.jsx` | Table styling: same header/row pattern as AllRequest |
| `LecturerSettings.jsx` | Page title → EquimonPageHeader |

### Head of Lab (accent: `#7c3aed`)

| File | Changes |
|---|---|
| `HeadDashboard.jsx` | Same dashboard swap as Lab Assistant but purple accent |
| `HeadFinalApproval.jsx` | Same as LecturerPendingApproval but purple accent |
| `HeadApprovalHistory.jsx` | Same as LecturerApprovalHistory |
| `HeadLabSettings.jsx` | Page title → EquimonPageHeader |

---

## Design Tokens Applied

```
Border radius:  rounded-2xl (20px) cards, rounded-xl (12px) tiles
Shadow rest:    shadow-sm / 0 1px 2px rgba(15,23,42,0.04)
Shadow hover:   0 8px 24px -12px rgba(15,23,42,0.16)
Typography:     Plus Jakarta Sans (already loaded via Google Fonts in index.html or Tailwind)
Status pills:   inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold
Transitions:    200ms ease on hover lift and background swap
```

---

## Files NOT Changed

- `front/src/components/layouts/sidebar.jsx`
- `front/src/components/DashboardLayout.jsx`
- `front/src/assets/images/ITSSecond.png`
- `front/src/pages/dashboards/StudentDashboard.jsx`
- `front/src/pages/admin/*`
- All `skeleton-framework/` files
- All API, routing, hook, and context files
