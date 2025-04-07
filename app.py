from flask import Flask, request
from flask_cors import CORS
from server import invoke

app = Flask(__name__)
CORS(app)

@app.route("/chat", methods = ['POST'])
def chat():
    if request.method == 'POST':
        print(invoke({"question": request.form['question']}))
        return invoke({"question": request.form['question']})
    else:
        return ""
