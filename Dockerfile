FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CLYRIVA_ENV=production
WORKDIR /app
COPY Clyriva_Publicar_GitHub.zip /tmp/clyriva.zip
COPY clyriva_auth_patch.py /tmp/clyriva_auth_patch.py
COPY clyriva_password_patch.py /tmp/clyriva_password_patch.py
COPY clyriva_bootstrap_patch.py /tmp/clyriva_bootstrap_patch.py
COPY clyriva_reset_patch.py /tmp/clyriva_reset_patch.py
COPY admin-setup.html /app/admin-setup.html
RUN python -m zipfile -e /tmp/clyriva.zip /tmp/site \
    && cp -a /tmp/site/Clyriva/. /app/ \
    && python /tmp/clyriva_auth_patch.py \
    && python /tmp/clyriva_password_patch.py \
    && python /tmp/clyriva_bootstrap_patch.py \
    && python /tmp/clyriva_reset_patch.py \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && rm -rf /tmp/clyriva.zip /tmp/site
EXPOSE 8080
CMD ["sh","-c","exec gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 4 servidor:application"]
