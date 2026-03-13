# กำกับติดตามโครงการ | ศูนย์อนามัยที่ 10 อุบลราชธานี

โปรเจคนี้เป็น instance แยกสำหรับ **ศูนย์อนามัยที่ 10 อุบลราชธานี** (กำกับติดตามโดย นพ.นิติ) เท่านั้น — ไม่เกี่ยวข้องกับ repo [BudgetTrack.github.io](https://github.com/nrok47/BudgetTrack.github.io) เดิม ข้อมูลเชื่อมกับ Google Sheet เฉพาะของศูนย์อนามัยที่ 10

- **Google Sheet ID:** `17WdWPnU-LURpSlMv9vc37vZG0IgpKOfsNLS4cvCh_3k`
- **Web App Script:** ใช้ URL ใน `src/utils-googlesheets.ts` (และ deploy script จาก `code_forCopy.gs` ใน Google Apps Script ของ Sheet นี้)

### ที่เก็บข้อมูล (Data storage)

- เก็บข้อมูล**เฉพาะใน Google Sheet** เท่านั้น (ชีตชื่อ `plans` ใน Spreadsheet ข้างบน) ผ่าน Web App Script
- เมื่อกด "บันทึก" หรือมีการแก้ไข ระบบจะ sync ไปที่ Sheet อัตโนมัติ (debounce 1 วินาที)
- **ไม่ใช้ localStorage** — เปิดจากเครื่องหรือเบราว์เซอร์ใดก็ได้ข้อมูลจาก Sheet เหมือนกัน

### GitHub Pages (สำคัญ)

ถ้าเปิดแล้วเจอ **404 หรือ GET /src/main.tsx** แสดงว่า Pages ยังเสิร์ฟจาก branch แทน build:

1. ไปที่ repo → **Settings** → **Pages**
2. ที่ **Build and deployment** → **Source** เลือก **GitHub Actions**
3. รอ workflow ในแท็บ Actions ให้ deploy เสร็จ แล้วเปิด **https://nrok47.github.io/HosHpc10.github.io/**

---

A comprehensive web application for tracking and managing project budgets with Thai Fiscal Year timeline (October to September).

## Features

- **Gantt Chart Timeline**: Visual representation of projects across Thai fiscal year months
- **Drag & Drop**: Easily move projects between months by dragging the project bars
- **Budget Tracking**: Monthly and cumulative budget calculations with target vs actual comparison
- **CRUD Operations**: Add, edit, and delete projects with validation
- **Smart Date Handling**: Auto-lock start month based on meeting dates
- **Interactive Calendar**: Click month headers to view detailed calendar with meeting highlights
- **Data Persistence**: Auto-save to localStorage with CSV import/export capabilities
- **Dark Mode**: Toggle between light and dark themes
- **Filtering & Sorting**: Filter by department group and sort by various criteria
- **Thai Language**: Complete Thai language interface

## Tech Stack

- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Lucide React** for icons

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```text
src/
├── components/
│   ├── ProjectGanttChart.tsx   # Main Gantt chart component
│   ├── ProjectModal.tsx        # Add/Edit activity modal
│   └── CalendarModal.tsx       # Monthly calendar view
├── types.ts                    # TypeScript interfaces
├── constants.ts                # App constants and fiscal year logic
├── utils.ts                    # Utility functions (CSV, dates, storage)
├── utils-googlesheets.ts       # Google Sheets integration helpers
├── App.tsx                     # Main application component
├── main.tsx                    # Application entry point
└── index.css                   # Global styles

public/
└── projects.csv                # Initial project data
```

## Usage

### Adding an Activity

1. Click the "เพิ่ม" (Add) button in the header
2. Fill in details:
   - Name
   - Group
   - Budget
   - Meeting dates (optional; will lock start month)
   - Start month
   - Status
   - Color
   - Vehicle (optional)
   - Chairman (optional)
3. Click "เพิ่มกิจกรรม" to save

### Moving Activities

Drag a bar from one month column and drop it into another.

### Viewing Calendar

Click any month header to see:

- Full calendar grid
- Highlighted meeting days
- List of activities starting in that month

### Data Management

- **Auto-save**: Changes persist to localStorage
- **Export**: Download current data as CSV
- **Reset**: Clear localStorage and reload from `projects.csv`

## License

MIT

## Deployment

The project is deployed to GitHub Pages using a GitHub Actions workflow (`.github/workflows/deploy.yml`). The workflow builds the app from the `main` branch and publishes the `dist` output automatically.

### Prerequisites

- Pages set to use **GitHub Actions** (Repo Settings → Pages → Source: GitHub Actions)
- `dist/` is ignored (see `.gitignore`) so only source code is versioned

### Automatic Deployment Flow

1. Push commits to `main`
2. Workflow runs: checkout → install (`npm ci`) → build (`npm run build`) → upload artifact → deploy
3. Pages URL appears in the deployment job output

### Local Development → Deploy

```bash
git checkout main
npm install
npm run dev
# After changes
git commit -am "feat: update"
git push origin main
```

### Manual Fallback (Emergency)

If Actions are unavailable and you need a quick manual publish:

```bash
npm run build
git checkout -B gh-pages
rm -rf *
cp -r dist/* .
git add .
git commit -m "manual: publish"
git push -f origin gh-pages
```

Switch Pages source to `gh-pages` temporarily. Revert to Actions afterward.

### Cleaning Up Legacy Branch

If you previously used a `gh-pages` branch and no longer need it:

```bash
git branch -D gh-pages            # local
git push origin --delete gh-pages # remote
```

### Common Issues

- 404 assets: ensure `vite.config.ts` `base` is `/BudgetTrack.github.io/`
- Blank page: confirm workflow succeeded; check console for blocked scripts
- Large bundle: consider dynamic imports / code splitting

### Changing Node Version

Update `node-version` in `deploy.yml` if you adopt a newer runtime.

### Environment Variables

Add secrets via Repo Settings → Secrets and reference them in workflow steps (none required currently).
