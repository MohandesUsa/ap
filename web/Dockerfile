# ساده‌ترین راه اجرای این پیش‌نمایش روی هر سروری که Docker دارد:
#   docker build -t truckaccounting-web .
#   docker run -d -p 80:80 --name truckaccounting-web truckaccounting-web
#
# بعد در مرورگر: http://<آی‌پی یا دامنهٔ سرور شما>

FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
