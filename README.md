# Task Management App — TASKR

An interactive task management web app for creating, filtering and organizing tasks in real time, with task counts and a clean, responsive interface.

## Live Demo
https://taskkerproj.netlify.app/

## Screenshot
![task-management-app screenshot](https://image.thum.io/get/width/1200/https://taskkerproj.netlify.app/)

## Tech Stack
- HTML5
- CSS3
- JavaScript (ES6+)
- Bootstrap 5
- Google Fonts

## Features
- Add, edit (inline), complete and delete tasks, each with a Low / Medium / High priority label shown as a badge
- Filter and organize tasks in real time
- Filter by priority: All / Low / Medium / High buttons that work together with the status filters, search and sort
- Live task counter
- Completion progress bar above the stats: shows the percentage of tasks completed, updating on every render
- Responsive design
- Optional due date per task, shown on the task item and saved with it
- Sort tasks by newest or oldest, working with the existing filters
- Undo after delete: a small toast with an Undo button restores the deleted task for a few seconds
- Dark mode toggle (dark by default; switch to a light theme, choice saved in localStorage)
- Search tasks: a live text search that works together with the All/Pending/Completed filters
- Export tasks: an Export Tasks button downloads the current task list as a plain-text file

## Run Locally
Open `index.html` in a browser, or serve with any static server (e.g. VS Code Live Server).

