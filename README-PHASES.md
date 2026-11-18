# Student Productivity Dashboard – Enhanced Edition

## Included features
- Persistent light/dark theme preference.
- Calendar month view with assignment deadlines and selected-day agenda.
- Kanban board with drag-and-drop status updates (To Do, In Progress, Completed).
- Pomodoro timer with 25-minute focus, 5-minute short break and 15-minute long break modes.
- Daily focus-session and focus-minute totals stored in browser local storage.
- Responsive layouts, subtle motion and reduced-motion accessibility support.

## Run locally
Requirements: Node.js 20 or newer.

```bash
npm install
npm start
```

Open http://localhost:8000.

## Existing data and deployment
The app continues to use the existing Express API and `data/tasks.json` storage. The Docker deployment should continue mounting the existing persistent volume at `/app/data`:

```bash
-v student-dashboard-data:/app/data
```

Do not replace the EC2 persistent volume with the ZIP's local `data/tasks.json`. Keep the existing Jenkins deployment configuration and its current EC2 host setting. If the EC2 public IPv4 changes after a stop/start, update `EC2_HOST` in the Jenkinsfile and push that change before running the pipeline.

## Notes
- Calendar dates come from each task's existing `deadline` field.
- Kanban status values are `Pending`, `In Progress`, and `Completed`; the Express API validates and persists all three.
- Focus statistics are browser-local and are not shared across devices. Notifications are optional and require browser permission.
- No additional npm dependencies were added.
