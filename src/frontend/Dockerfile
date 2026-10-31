FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_ADS_ENABLED=true
ENV VITE_ADS_ENABLED=$VITE_ADS_ENABLED
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . ./
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
