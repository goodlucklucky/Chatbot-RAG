from flask import Flask, request, Response, send_from_directory, abort
from flask_cors import CORS
from api.server import invoke_stream
import os

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "data"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/api/chat", methods = ['POST'])
def chat():
    question = request.form.get("question")
    user_id = request.form.get("user_id")
    file = request.files.get("file")
    file_path = ""
    if (file):
        _, ext = os.path.splitext(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, "sample" + ext)
        file.save(file_path)

    return Response(invoke_stream(question=question, user_id=user_id, file_path=file_path), mimetype="text/event-stream")

@app.route("/downloads/<path:filename>")
def download_file(filename):
    downloads_dir = os.path.join(os.getcwd(), "downloads")
    file_path = os.path.join(downloads_dir, filename)

    if not os.path.exists(file_path):
        abort(404)

    return send_from_directory(downloads_dir, filename, as_attachment=True)
