from flask import Flask, request, Response, send_from_directory, abort, jsonify
from flask_cors import CORS
from api.server import invoke_stream, get_pending_edits
import os
import json

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "data"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/api/chat", methods = ['POST'])
def chat():
    question = request.form.get("question")
    user_id = request.form.get("user_id")
    file = request.files.get("file")
    start = request.form.get("doc_start")
    end = request.form.get("doc_end")
    content_req = request.form.get("doc_content")
    content = None
    if isinstance(content_req, str):
        content = json.loads(content_req)
    file_path = ""
    if file:
        _, ext = os.path.splitext(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, "sample" + ext)
        file.save(file_path)

    return Response(invoke_stream(question=question, user_id=user_id, file_path=file_path, start=start, end=end, content=content), mimetype="text/event-stream")

@app.route("/downloads/<path:filename>")
def download_file(filename):
    downloads_dir = os.path.join(os.getcwd(), "downloads")
    file_path = os.path.join(downloads_dir, filename)

    if not os.path.exists(file_path):
        abort(404)

    return send_from_directory(downloads_dir, filename, as_attachment=True)

@app.route("/apply_change")
def apply_change():
    user_id = request.args.get("user_id")
    edit_info = get_pending_edits(user_id)
    if edit_info and "new_content" in edit_info:
        return jsonify({
            "content": edit_info["new_content"],
            "start": edit_info["start"],
            "end": edit_info["end"]
        })
    else:
        return jsonify({"content": ""}), 404

@app.route("/api/save", methods=["POST"])
def save_uploaded_docx():
    file = request.files.get("file")
    user_id = request.form.get("user_id")
    if not file or not user_id:
        return jsonify({"error": "Missing file or user_id"}), 400

    save_dir = "downloads"
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, f"{user_id}_current.docx")
    file.save(save_path)
    # Add this line:
    return jsonify({"status": "success", "filename": f"{user_id}_current.docx"})