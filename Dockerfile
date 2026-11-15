# 배포용 이미지: 1) 프론트 화면 빌드 → 2) 백엔드가 빌드된 화면과 API를 한 주소에서 제공

# ---------- 1) 프론트 빌드 ----------
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# ---------- 2) 백엔드 ----------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
# psycopg: Supabase(Postgres) 연결용. 내 PC에서는 필요 없어서 여기서만 설치
RUN pip install --no-cache-dir -r backend/requirements.txt "psycopg[binary]>=3.2"
COPY backend/ backend/
COPY --from=web /web/dist frontend/dist
WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
