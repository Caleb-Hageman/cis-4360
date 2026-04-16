FROM python:3.12-slim
WORKDIR /app

# Docker looks for this file inside the /backend folder now
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Launch the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]