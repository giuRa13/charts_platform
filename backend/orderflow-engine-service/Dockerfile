FROM python:3.9-slim

# Force Python to print logs immediately
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Start FastAPI with Uvicorn
# --host 0.0.0.0 allows Docker mapping
# --reload allows you to edit code without restarting (dev mode)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]