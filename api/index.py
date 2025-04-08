from flask import Flask, request
from flask_cors import CORS
from server import invoke
import os

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "data"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/api/chat", methods = ['POST'])
def chat():
    if request.method == 'POST':
        question = request.form.get("question")
        file = request.files.get("file")
        file_path = os.path.join(UPLOAD_FOLDER, "sample.pdf")
        if (file):
            file.save(file_path)

        answer = invoke({"question": question})
        print(answer)
        return answer
    else:
        return ""
