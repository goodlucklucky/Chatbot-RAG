FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1

COPY ./requirements.txt /tmp/requirements.txt
COPY ./api /api

WORKDIR /api
EXPOSE 5000

RUN python -m venv /py && \
    /py/bin/pip install --upgrade pip && \apt-get update && \
    /py/bin/pip install -r /tmp/requirements.txt && \
    apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp

# Set environment variables if needed (e.g., to specify the Tesseract path)
ENV TESSDATA_PREFIX="/usr/share/tesseract-ocr/4.00/tessdata"
ENV PATH="/py/bin:$PATH"
ENV FLASK_APP=index.py
ENV FLASK_RUN_PORT=5000

# Command to run your application
# CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
CMD ["python", "-m", "flask", "--app", "api/index", "run", "-p", "5000"]
