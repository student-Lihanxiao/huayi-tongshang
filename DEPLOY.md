# 华遗通商 · 部署上线指南

> 面向竞赛提交 + 现场答辩两种场景。按顺序照做即可。

---

## 一、先选方案

| 方案 | 公开链接 | 数据持久 | 成本 | 适用 |
|---|---|---|---|---|
| **A. 本地运行** | 无（局域网） | ✅ 天然持久 | ¥0 | **现场答辩首选**：断网也能演示 |
| **B. Render + 持久磁盘** | ✅ 自动 HTTPS | ✅ | 约 $7/月 | **线上提交首选**：评委点链接就能看 |
| **C. Render 免费版** | ✅ 自动 HTTPS | ❌ 重新部署清零 | ¥0 | 纯展示，不接受注册下单 |
| **D. VPS + Docker** | ✅ 需自己配域名 | ✅ | ¥30-60/月 | 想完全可控，国内节点需备案 |

**竞赛推荐组合：B（线上提交）+ A（现场兜底）**。两个都准备，任何一个出问题都能顶上。

---

## 二、现场演示（方案 A）—— 最稳，零依赖

```bash
npm install
npm run start
```

浏览器打开 <http://localhost:3001>

**连手机演示（同一 WiFi 下让评委用手机看）**：

```bash
# 查本机内网 IP
ipconfig | findstr IPv4        # Windows
```

然后手机浏览器访问 `http://你的内网IP:3001`。若打不开，是 Windows 防火墙拦了 —— 放行 Node.js 或临时关掉防火墙。

**注意**：现场务必保持 `COOKIE_SECURE` 为空/false，否则 http 下登录和购物车会失效。

---

## 三、线上提交（方案 B）—— Render 完整步骤

### 步骤 1：把代码推到 GitHub

本仓库存在两个问题，先修好：

```bash
# 1) 生成 .gitignore 后，把已误暂存的 node_modules 移出索引（保留本地文件）
git rm -r --cached node_modules

# 2) 确认 data/users.json 与 data/orders.json 不会被提交（含用户数据）
git rm --cached data/users.json data/orders.json 2>/dev/null

# 3) 提交
git add -A
git commit -m "feat: 华遗通商"

# 4) 关联远程仓库并推送（把 URL 换成你自己的）
git remote add origin https://github.com/你的账号/huayi-tongshang.git
git branch -M main
git push -u origin main
```

### 步骤 2：在 Render 创建服务

1. 打开 <https://render.com> → 注册（用 GitHub 账号登录最快）
2. **New** → **Web Service** → 选你的仓库
3. 按下表填写：

| 配置项 | 值 |
|---|---|
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm run start` |
| Health Check Path | `/healthz` |
| Instance Type | Starter（免费版不支持持久磁盘） |

4. **Advanced → Environment Variables** 添加：

| 变量 | 值 | 说明 |
|---|---|---|
| `NODE_ENV` | `production` | 启用 gzip、安全头、缓存 |
| `SESSION_SECRET` | 点 Generate 生成随机值 | **必填**，否则可被伪造登录 |
| `PUBLIC_URL` | `https://你的服务名.onrender.com` | 先随便填，部署完再改准确值 |
| `COOKIE_SECURE` | `true` | Render 自带 HTTPS |
| `DATA_DIR` | `/data` | 必须与磁盘挂载路径一致 |

5. **Advanced → Disks** → Add Disk：

| 配置项 | 值 |
|---|---|
| Name | `huayi-data` |
| Mount Path | `/data` |
| Size | 1 GB（最小即可） |

> 挂载磁盘需要付费实例。若用免费版，请跳过磁盘、并接受"每次重新部署后注册与订单清零"。

6. 点 **Create Web Service**，等 2-3 分钟构建完成

7. 拿到地址形如 `https://huayi-tongshang.onrender.com`，把 `PUBLIC_URL` 改成它并重新部署

### 步骤 3：验证上线是否正常

```bash
# 用你自己的域名替换
curl https://你的地址/healthz
```

应返回：

```json
{"ok":true,"env":"production","dataWritable":true,"products":32,"articles":28,...}
```

**关键看 `dataWritable` 必须是 `true`**。若是 `false`，说明磁盘没挂对，注册和下单会失败。

再检查：

- 打开首页 → 四语言切换是否正常
- 完成一次体质测评 → 结果页是否出推荐商品
- 注册一个账号 → **重启服务后再登录一次**，确认账号还在（验证持久化生效）

---

## 四、VPS 部署（方案 D）

```bash
# 1) 装 Docker
curl -fsSL https://get.docker.com | sh

# 2) 上传代码到服务器后，进目录创建 .env
cp .env.example .env
# 编辑 .env：填 SESSION_SECRET、PUBLIC_URL、COOKIE_SECURE

# 3) 起服务
docker compose up -d --build

# 4) 确认健康
curl http://127.0.0.1:3001/healthz
```

再配 Nginx 反向代理 + HTTPS：

```nginx
server {
    listen 80;
    server_name 你的域名;

    # certbot 会自动改写这里加 443
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;   # 关键：让 secure cookie 判定正确
    }
}
```

```bash
# 申请免费证书（certbot 会自动配置 443 与续期）
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d 你的域名
```

**国内 VPS 提醒**：绑定域名对外提供网站服务需要 ICP 备案（约 1-3 周）。竞赛赶时间建议先用海外节点或 Render。

---

## 五、环境变量清单（对照检查）

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `NODE_ENV` | 线上必填 | `development` | 设 `production` 启用优化 |
| `PORT` | 否 | `3001` | 云平台会自动注入 |
| `SESSION_SECRET` | **线上必填** | 开发用默认值 | 会话签名密钥 |
| `PUBLIC_URL` | 线上建议 | 按请求推断 | canonical / og:url / sitemap 用 |
| `COOKIE_SECURE` | 视协议 | `false` | HTTPS 设 `true`；http 演示必须 `false` |
| `DATA_DIR` | 挂磁盘时必填 | 项目内 `data/` | 持久化数据目录 |

生成密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 六、答辩前 10 分钟检查清单

- [ ] 本地已 `npm run start` 跑起来，浏览器能打开 <http://localhost:3001>
- [ ] 若用云端链接：**先访问一次唤醒实例**（免费版会休眠，首次访问冷启动 30-60 秒）
- [ ] 云端链接 `/healthz` 返回 `"dataWritable":true`
- [ ] 试跑一次完整流程：首页 → 测体质 → 看推荐 → 加购物车 → 注册 → 下单
- [ ] 手机浏览器打开一次，确认移动端布局正常
- [ ] 四个语言切换各点一次，确认无残留中文/报错
- [ ] 准备一张首页截图作为图片兜底（万一现场网络完全不可用）

---

## 七、常见问题排查

**Q: 打开是 502 / 一直转圈**
云端免费实例冷启动，等 30-60 秒。若持续 502，去平台 Logs 看启动报错。

**Q: 登录后一刷新就退出登录**
`COOKIE_SECURE=true` 但实际在用 http 访问。改 `false`，或给站点配上 HTTPS。

**Q: 注册成功，但重新部署后账号没了**
没挂持久化磁盘，或 `DATA_DIR` 与磁盘挂载路径不一致。两者必须相同（如都为 `/data`）。

**Q: 商品图片显示不出来**
图片在 `public/images/`，确认部署时该目录已包含（Docker 构建里已 COPY）。

**Q: 启动日志出现 `MemoryStore is not designed for a production environment`**
这是 express-session 的提示：会话存在内存里，重启会丢失登录态。对竞赛演示无影响；若要正式运营，可换 SQLite 或 Redis 会话存储。

**Q: 端口被占用 `EADDRINUSE`**
换个端口：Windows `set PORT=3002 && npm run start`；macOS/Linux `PORT=3002 npm run start`。
