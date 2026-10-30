FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 AI_PROVIDER=none
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY server/*.js ./server/
COPY shared/guidance.js shared/leave.js shared/admin-authority.js shared/syllabus-planning.js shared/teaching-plan.js ./shared/
USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
