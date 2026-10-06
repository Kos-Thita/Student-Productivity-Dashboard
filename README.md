# Student Productivity Dashboard

A student-focused productivity and assignment management dashboard built with Node.js and Express.js. Students can add assignments, set deadlines, track completion status, and monitor their overall academic progress.

## Features

- **Add Assignments** -- Create tasks with title, subject, description, deadline, and priority
- **View & Manage Tasks** -- Clean card-based dashboard displaying all assignments
- **Task Actions** -- Mark tasks as completed/pending, edit details, or delete
- **Search** -- Search assignments by title or subject
- **Filter** -- View all, pending, completed, or overdue tasks
- **Sort** -- Sort by deadline, priority, or recently added
- **Dashboard Statistics** -- Real-time counters for total, pending, completed, and overdue tasks
- **Progress Visualization** -- Completion rate progress bar
- **Overdue Detection** -- Automatically identifies and highlights overdue assignments
- **Responsive Design** -- Works on desktop, tablet, and mobile devices
- **Data Persistence** -- Tasks are stored in a local JSON file

## Technology Stack

| Layer      | Technology              |
|------------|-------------------------|
| Runtime    | Node.js                 |
| Framework  | Express.js              |
| Frontend   | HTML5, CSS3, Vanilla JS |
| Data Store | Local JSON file         |
| Container  | Docker                  |

## Project Structure

```
student-productivity-dashboard/
|
├── app.js                 # Express server (main entry point)
├── package.json           # Dependencies and scripts
├── Dockerfile             # Docker image configuration
├── .gitignore             # Git ignore rules
├── README.md              # Project documentation
|
├── data/
│   └── tasks.json         # Task data storage (JSON)
|
└── public/
    ├── index.html         # Dashboard UI
    ├── style.css          # Stylesheet
    └── script.js          # Frontend logic
```

## How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Steps

1. Clone the repository:

```bash
git clone <repository-url>
cd student-productivity-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Start the application:

```bash
npm start
```

4. Open your browser and navigate to:

```
http://localhost:8000
```

## Docker Deployment

### Build the Docker Image

```bash
docker build -t student-productivity-dashboard .
```

### Run the Docker Container

```bash
docker run -d --name student-productivity-dashboard -p 8000:8000 student-productivity-dashboard
```

### Access the Application

```
http://localhost:8000
```

### Stop and Remove the Container

```bash
docker stop student-productivity-dashboard
docker rm student-productivity-dashboard
```

## API Endpoints

| Method | Endpoint          | Description              |
|--------|-------------------|--------------------------|
| GET    | `/api/tasks`      | Retrieve all tasks       |
| POST   | `/api/tasks`      | Create a new task        |
| PUT    | `/api/tasks/:id`  | Update an existing task  |
| DELETE | `/api/tasks/:id`  | Delete a task            |
| GET    | `/api/stats`      | Get dashboard statistics |

### Task Data Structure

```json
{
  "id": 1,
  "title": "Cloud Computing Assignment",
  "subject": "Cloud Computing",
  "description": "Complete the Docker and Jenkins assignment.",
  "deadline": "2026-10-15",
  "priority": "High",
  "status": "Pending",
  "createdAt": "2026-10-06"
}
```

### Stats Response

```json
{
  "total": 5,
  "completed": 2,
  "pending": 3,
  "overdue": 1,
  "completionRate": 40
}
```

## CI/CD Deployment Architecture

This application is designed for deployment using the following pipeline:

```
GitHub --> Jenkins --> Docker --> AWS EC2
```

### Pipeline Steps

1. **Source** -- Push code to GitHub repository
2. **Build** -- Jenkins pulls the latest code
3. **Install** -- `npm install`
4. **Containerize** -- `docker build -t student-productivity-dashboard .`
5. **Deploy** -- Stop old container, remove it, run new container on EC2
6. **Serve** -- Application accessible on port 8000

### Key Deployment Notes

- Single Node.js application in a single Docker container
- No Docker Compose required
- No external database required
- No environment variables required for basic operation
- Application starts automatically with `npm start`
- Port 8000 is exposed by default
- Compatible with Ubuntu-based EC2 instances
