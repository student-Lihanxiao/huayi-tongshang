# ============================================================
#  华遗通商 · 生产镜像
#  多阶段构建：先装依赖，再只拷贝运行所需内容
#
#  关于持久化磁盘权限：云平台的磁盘在运行时挂载，会覆盖构建阶段
#  对 /data 的属主设置。因此不在构建期 chown /data，
#  而是由 docker-entrypoint.sh 在启动时以 root 修正属主再降权运行。
# ============================================================

FROM node:20-alpine AS deps
WORKDIR /app
# 只拷贝依赖清单，最大化利用构建缓存
COPY package.json package-lock.json ./
# bcrypt 是原生模块，alpine 需要编译工具链
RUN apk add --no-cache python3 make g++ \
 && npm ci --omit=dev \
 && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
# 数据目录：由 docker-compose / 云平台挂载卷到此路径
ENV DATA_DIR=/data

# tzdata：节气与日期按 Asia/Shanghai 计算
# su-exec：启动脚本降权运行应用所需（体积很小）
RUN apk add --no-cache tzdata su-exec \
 && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
 && echo "Asia/Shanghai" > /etc/timezone

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY docker-entrypoint.sh ./
COPY views ./views
COPY public ./public
COPY data ./data

# 预建 /data（运行时会被挂载覆盖，这里只是保证无卷时也能跑）
RUN mkdir -p /data && chmod +x /app/docker-entrypoint.sh

# 注意：这里不切换 USER。
# 入口脚本需要 root 权限去修正挂载卷属主，之后再用 su-exec 降权到 node 用户。
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
