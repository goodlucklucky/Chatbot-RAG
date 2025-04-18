from flask import Flask, request, Response
from flask_cors import CORS
from server import invoke_stream
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
    file_path = os.path.join(UPLOAD_FOLDER, "sample.pdf")
    if (file):
        _, ext = os.path.splitext(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, "sample" + ext)
        file.save(file_path)

    return Response(invoke_stream(question=question, user_id=user_id, file_path=file_path), mimetype="text/event-stream")
