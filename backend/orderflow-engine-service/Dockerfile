FROM python:3.9-slim

# Force Python to print logs immediately
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Keep container running (for now, just to test)
CMD ["python", "test.py"]