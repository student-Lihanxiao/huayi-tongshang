#!/bin/sh
# ============================================================
#  容器启动脚本
#
#  为什么需要：
#  云平台（Render / Railway / K8s）的持久化磁盘是在「容器运行时」挂载的，
#  会覆盖镜像构建阶段对 /data 的权限设置，挂载后 /data 归 root 所有。
#  而容器以非 root 的 node 用户运行，直接写会被拒绝（EACCES），
#  表现为"网站能打开，但注册和下单全部失败"。
#
#  因此这里用 root 身份做三件事，然后用 su-exec 降权运行应用：
#    1. 建好数据目录
#    2. 把运行期数据目录交给 node 用户
#    3. 从 bootstrap 模板播种初始 users.json / orders.json（仅在文件不存在时）
# ============================================================
set -e

APP_DIR=/app
DATA_DIR="${DATA_DIR:-/data}"
BOOTSTRAP_DIR="$APP_DIR/data/bootstrap"

echo "▶ 准备数据目录：$DATA_DIR"

# 1) 建目录（首次部署 / 空磁盘）
mkdir -p "$DATA_DIR"

# 2) 播种初始数据：只在文件缺失时复制，绝不覆盖已有数据
if [ -d "$BOOTSTRAP_DIR" ]; then
  for f in users.json orders.json; do
    if [ -f "$BOOTSTRAP_DIR/$f" ] && [ ! -f "$DATA_DIR/$f" ]; then
      cp "$BOOTSTRAP_DIR/$f" "$DATA_DIR/$f"
      echo "  🌱 播种 $f"
    fi
  done
fi

# 3) 交给 node 用户（uid/gid 1000，node:alpine 镜像内置）
chown -R node:node "$DATA_DIR" 2>/dev/null || echo "  ⚠️  chown 失败，若后续写入报错请检查挂载权限"

echo "▶ 以 node 用户启动服务"
exec su-exec node:node "$@"
