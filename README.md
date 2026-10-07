# Student Attendance Management System

React + Vite frontend and Express API for teacher authentication, academic years, class/section management, student management and transfers, daily attendance, attendance drafts and audit history, holidays, calendar, monthly reports, Excel/PDF exports, and teacher settings. MongoDB stores teacher-owned records; passwords are hashed with bcrypt and sessions use an HttpOnly JWT cookie.

## Setup

Requirements: Node.js 20.19+ or 22.12+, npm, and MongoDB.

Install dependencies from the project root:

```bash
npm run install:all
```

Create `server/.env` from `server/.env.example` and set:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/student_attendance
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

Use your MongoDB connection URI for `MONGODB_URI`. Keep `server/.env` private; it is ignored by Git. If `MONGODB_URI` is empty, the API starts but authentication requests explain that `MONGODB_URI` must be added to `server/.env`.

## Run

From the project root:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Login: http://localhost:5173/login
- Register: http://localhost:5173/register
- Dashboard: http://localhost:5173/dashboard
- Classes & Sections: http://localhost:5173/classes
- Students: http://localhost:5173/students
- Take Attendance: http://localhost:5173/attendance
- Attendance Calendar: http://localhost:5173/calendar
- Monthly Attendance Reports: http://localhost:5173/reports
- Academic Years: http://localhost:5173/academic-years
- Teacher Settings: http://localhost:5173/settings
- Backend: http://localhost:5000
- Health API: http://localhost:5000/api/health

Protected application pages and management APIs require a logged-in teacher account. The dashboard links to the academic year that is currently active for that teacher.

- `GET|POST /api/classes`
- `PUT|DELETE /api/classes/:id`
- `GET /api/sections?classId=:id` (the `classId` filter is optional)
- `POST /api/sections`
- `PUT|DELETE /api/sections/:id`

A class cannot be deleted until its sections are deleted.

Student APIs are protected by teacher authentication:

- `GET|POST /api/students`
- `GET|PUT|DELETE /api/students/:id`
- `POST /api/students/bulk-import/preview`
- `POST /api/students/bulk-import`

Student list queries support `classId`, `sectionId`, `status`, `search`, `page`, and `limit` (25, 50, or 100). Delete deactivates a record so historical information can be retained. CSV and Excel imports are previewed and validated before valid records are inserted. Download the template from the Students page.

Attendance and holiday APIs are protected by teacher authentication:

- `GET /api/attendance?sectionId=:id&date=YYYY-MM-DD`
- `GET /api/attendance/calendar?sectionId=:id&month=:month&year=:year`
- `POST /api/attendance`
- `PUT /api/attendance/:id`
- `GET /api/attendance/today-summary?date=YYYY-MM-DD`
- `GET|POST /api/holidays`
- `PUT|DELETE /api/holidays/:id`

Holiday listing also supports `month`/`year`, `date`, and `upcoming=true&limit=3` filters. Attendance is stored once per teacher, section, and date. Student attendance entries retain a name and roll-number snapshot, while holidays remain global date-level records as established in the attendance step. The calendar only marks explicitly configured holidays; weekends are not inserted automatically. The daily page only lists active students and leaves historical entries intact when students are later deactivated or moved.

Additional protected APIs include `GET|POST /api/academic-years`, `PUT /api/academic-years/:id`, `POST /api/academic-years/:id/activate`, `GET /api/attendance/monthly`, attendance draft, lock and audit-history routes under `/api/attendance`, and `GET|PUT /api/settings` plus `POST /api/settings/change-password`. Holidays are date-level records owned by the authenticated teacher. Monthly reports can be exported from the Reports page as `.xlsx` and `.pdf` files. The calendar only marks explicitly configured holidays; weekends are not inserted automatically. Daily attendance lists active students while finalized records retain historical student snapshots.
