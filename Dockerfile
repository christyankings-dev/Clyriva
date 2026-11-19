FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CLYRIVA_ENV=production
WORKDIR /app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY index.html admin.html config.js app.js core.js rotina.js panel.js panel.css rotina.css servidor.py ./
COPY vendor/supabase.js ./vendor/supabase.js
RUN python -m py_compile servidor.py
EXPOSE 8080
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 4 servidor:application"]
