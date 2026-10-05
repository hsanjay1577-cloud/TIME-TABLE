# School Timetable Generator

A simple web app to create, edit, print and export a weekly school timetable.

## Features
- Class details: school, class/grade, section, academic year
- 5 or 6 working days (Saturday hides/shows automatically)
- 5 to 9 periods per day, start time, period length
- Automatic break row after a chosen period (with its own length)
- Click any box to enter subject, teacher and room (Save / Cancel / Clear)
- Subject dropdown with default subjects, plus custom subjects
- Subtle automatic colours: the same subject always has the same colour
- Quick Fill for empty periods, and a Load Sample Timetable button
- Save to / load from the browser (localStorage) with "Last saved" time
- Print on A4 landscape (setup form and buttons are hidden)
- Download as `School_Timetable.pdf` (html2pdf.js, client-side)
- Inline error messages and toast notifications, responsive layout

## Technologies
Python, Flask, HTML, CSS, JavaScript (no frameworks). Icons: Font Awesome. PDF: html2pdf.js (both loaded from a CDN, so an internet connection is needed for icons and PDF export).

## Installation
```
git clone <repository-url>
cd school-timetable-generator
python -m venv venv
```
Windows: `venv\Scripts\activate`
Linux/Mac: `source venv/bin/activate`
```
pip install -r requirements.txt
python app.py
```
Then open http://127.0.0.1:5000

## Deployment (Render)
1. Push the project to GitHub.
2. On Render choose **New > Web Service** and connect the repository.
3. Runtime: **Python 3**
4. Build command: `pip install -r requirements.txt`
5. Start command: `gunicorn app:app`
6. Deploy. (Railway and PythonAnywhere use the same `gunicorn app:app` / WSGI `app` object.)

## Programming concepts demonstrated
- **Variables**: `timetable`, `STORAGE_KEY`, `app`
- **Lists**: `DAYS`, `DEFAULT_SUBJECTS`, the rows of a timetable
- **Dictionaries (objects)**: `SAMPLE_INFO`, each entry `{subject, teacher, room}`
- **Functions**: small functions such as `buildRows()`, `quickFill()`, `saveTimetable()`
- **Loops**: `for` loops build every period and day; `forEach` fills the sample
- **Conditional statements**: `if` checks for validation and for the break row
- **User input**: form fields and the edit dialog
- **DOM manipulation**: `createElement`, `textContent`, `appendChild`
- **Local storage**: `localStorage.setItem` / `getItem` with `JSON`
- **Flask routing**: `@app.route("/")` serves the page
- **HTML/CSS**: semantic HTML, CSS variables, grid, `@media print`
- **JavaScript**: events, dialogs, promises (PDF export)

## Project structure
```
school-timetable-generator/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── templates/index.html
└── static/
    ├── css/style.css
    └── js/script.js
```
