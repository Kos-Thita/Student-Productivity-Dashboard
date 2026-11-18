# Student Productivity Dashboard — Phase 1 UI Refresh

## What's included
- Persistent light/dark theme toggle (saved in browser localStorage)
- Theme-aware surfaces, controls, panels, cards, and monitor styles
- Refined spacing, borders, typography, and button interactions
- Subtle entrance/hover animations
- Responsive header and navigation refinements
- Reduced-motion accessibility support

## Run locally
1. Open a terminal in this project folder.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:8000`.

## Notes
- Existing Express APIs and task management behavior are retained.
- No new npm dependencies are required.
- The uploaded `data/tasks.json` is included as-is for local development.
- When deploying to the existing EC2 instance, keep the Docker volume mount `student-dashboard-data:/app/data`. Do not replace the EC2 volume with this ZIP's local JSON file.
