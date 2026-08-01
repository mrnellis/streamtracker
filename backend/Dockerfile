# StreamTrack backend
FROM docker.io/library/python:3.11-slim

WORKDIR /app

# System deps for bcrypt / cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a real non-root user. The pod spec sets runAsUser 1000 to match; a
# matching passwd entry keeps anything that calls getpwuid() from failing.
RUN useradd --create-home --uid 1000 --user-group app
USER app

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8001/api/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
