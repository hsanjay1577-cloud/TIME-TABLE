"""School Timetable Generator - Flask backend.

Flask only serves the page. All timetable logic runs in the browser
(static/js/script.js), and data is saved in the browser's localStorage.
"""
import os

from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    """Serve the main (and only) page."""
    return render_template("index.html")


@app.route("/health")
def health():
    """Simple check used by hosting platforms."""
    return {"status": "ok"}


if __name__ == "__main__":
    # Local development only. In production use: gunicorn app:app
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
