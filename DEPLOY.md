# 华遗通商 · 部署上线指南

> 面向竞赛提交 + 现场答辩两种场景。按顺序照做即可。

---

## 一、先选方案

| 方案 | 公开链接 | 数据持久 | 成本 | 适用 |
|---|---|---|---|---|
| **A. 本地运行** | 无（局域网） | ✅ 天然持久 | ¥0 | **现场答辩首选**：断网也能演示 |
| **B. Render 免费版** | ✅ 自动 HTTPS | ❌ 重建/休眠后清零 | ¥0 | **当前采用**：线上提交，纯展示够用 |
| **C. Render + 持久磁盘** | ✅ 自动 HTTPS | ✅ | 约 $7/月 | 需要评委真实注册下单且数据不丢 |
| **D. VPS + Docker** | ✅ 需自己配域名 | ✅ | ¥30-60/月 | 想完全可控，国内节点需备案 |

**本次组合：B（线上提交）+ A（现场兜底）**。免费版的两个限制（休眠冷启动、数据不持久）都有应对办法，见第五节。

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

## 三、线上提交（方案 B，免费版）—— Render 完整步骤

### 步骤 1：把代码推到 GitHub

本仓库已完成 `node_modules` 出索引、运行期数据排除、`.gitignore` 与 `.gitattributes` 配置。
若在别的机器上重新初始化，按下面执行：

```bash
# 1) 若 node_modules 被误暂存，移出索引（保留本地文件）
git rm -r --cached -f node_modules

# 2) 确认用户/订单数据不会被提交
git rm --cached data/users.json data/orders.json

# 3) 提交
git add -A
git commit -m "feat: 华遗通商 — 非遗主题界面、体质测评与推荐、四语言、部署就绪"

# 4) 关联远程仓库并推送（把 URL 换成你自己的）
git remote add origin https://github.com/你的账号/huayi-tongshang.git
git push -u origin main
```

**国内网络提示**：若 `git push` 报 `Connection was reset`，说明直连 GitHub 被重置。
让 git 走本地代理（端口按你的代理软件实际端口改）：

```bash
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
# 用完后如需撤销：
# git config --global --unset http.proxy
# git config --global --unset https.proxy
```

### 步骤 2：在 Render 一键部署（用蓝图）

仓库里的 `render.yaml` 已按**免费版**配置好，无需手工填一堆参数：

1. 打开 <https://render.com> → **Get Started** → 用 **GitHub 账号登录**
2. 授权时选 **Only select repositories** → 勾选 `huayi-tongshang`
3. 控制台 **New +** → **Blueprint** → 选中该仓库
4. Render 会自动读取 `render.yaml`，确认页面显示：

| 配置项 | 应为 |
|---|---|
| Service name | `huayi-tongshang` |
| Runtime | **Docker** |
| Plan | **Free** |
| Region | Singapore |
| Health Check Path | `/healthz` |
| 环境变量 | `NODE_ENV`、`SESSION_SECRET`(自动生成)、`COOKIE_SECURE`、`PUBLIC_URL` |

> 免费版**没有磁盘**配置，这是预期的 —— 见第五节的数据持久化说明。
> **不需要绑卡**。

5. 点 **Apply** / **Create Resources**，等 3-5 分钟构建

构建日志最后应出现：

```
🏮 华遗通商 平台运行在 http://localhost:xxxx
⚙️  环境：production | 运行期数据目录：/app/data/runtime
📦 gzip 压缩：已启用
🛡️  安全响应头：已启用
```

6. 拿到地址形如 `https://huayi-tongshang.onrender.com`

> 若 Blueprint 读取失败（比如平台提示 `plan` 取值不支持），
> 改用手工方式：**New + → Web Service** → Runtime 选 Docker →
> Environment 里手动添加上表 4 个环境变量 → 不要加磁盘。

### 步骤 3：验证上线是否正常

浏览器打开（或 curl）：

```bash
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

## 五、免费版的两个限制与应对（重要）

免费实例很适合竞赛展示，但有两点必须提前知道并准备好。

### 限制 1：闲置休眠，首次访问冷启动 30-60 秒

Render 免费实例闲置约 15 分钟后会休眠。评委点开链接时若看到转圈，**可能以为网站坏了**。

**应对**：

- ★ **答辩/评审前 10 分钟，自己先访问一次**把实例唤醒
- 在作品说明里加一句提示，例如：
  > 本作品部署于免费云服务，若首次打开较慢，请稍候约 30 秒，服务正在唤醒。
- 把唤醒写进答辩流程：上台前先点一次首页

### 限制 2：数据不持久，重新部署/休眠唤醒后清零

免费版不能挂持久磁盘，用户注册与订单数据存在容器临时文件系统里。
**重新部署、休眠后重新唤醒、实例迁移都会清零。**

**应对**：

- 演示时**现场注册新账号**即可，注册后当次会话内一切正常（购物车、下单都可用）
- 不要让评委"先注册、过十分钟再回来看" —— 中间若休眠，账号可能已丢失
- 答辩前自己在本地把完整流程跑一遍，心里有数
- 如果确实需要"数据不丢"（比如要求评委事后回访），两个办法：
  1. **升级到付费实例**（约 $7/月）并挂 1GB 磁盘：把 `render.yaml` 中 `plan` 改为 `starter`，
     取消 `disk` 段落的注释，并加上 `DATA_DIR=/data` 环境变量
  2. **改用 VPS + Docker**（见第四节）：磁盘天然持久，不用改代码

> 我们的代码已经为两种情况都做好了准备：挂了持久磁盘就写磁盘，
> 没挂就写容器内临时目录，且磁盘不可写时会给出明确提示而不是整站崩溃。

---

## 六、环境变量清单（对照检查）

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `NODE_ENV` | 线上必填 | `development` | 设 `production` 启用 gzip、安全头、缓存 |
| `PORT` | 否 | `3001` | 云平台自动注入，**不要手工设置** |
| `SESSION_SECRET` | **线上必填** | 开发用默认值 | 会话签名密钥，泄露等于可被伪造登录 |
| `PUBLIC_URL` | 线上建议 | 按请求推断 | canonical / og:url / sitemap 绝对地址 |
| `COOKIE_SECURE` | 视协议 | `false` | HTTPS 设 `true`；http 本地演示必须 `false` |
| `DATA_DIR` | 仅挂磁盘时 | 项目内 `data/` | 持久化数据目录；免费版不要设 |

生成密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 或
npm run gen:secret
```

---

## 七、答辩前 10 分钟检查清单

- [ ] 本地已 `npm run start` 跑起来，浏览器能打开 <http://localhost:3001>
- [ ] ★ **云端链接先访问一次唤醒实例**（免费版休眠中，冷启动 30-60 秒）
- [ ] 云端链接 `/healthz` 返回 `"dataWritable":true`
- [ ] 云端链接手工跑一次完整流程：首页 → 测体质 → 看推荐 → 加购物车 → **现场注册** → 下单
- [ ] 手机浏览器打开云端链接一次，确认移动端布局正常
- [ ] 四个语言切换各点一次，确认无残留中文/报错
- [ ] 打开 `/features` 作品说明页过一遍（答辩主要讲这页）
- [ ] 准备一张首页截图作为图片兜底（万一现场网络完全不可用）
- [ ] 记住兜底命令：`cd /d D:\chinese-heritage-shop` + `npm run start`

---

## 八、常见问题排查

**Q: 打开是 502 / 一直转圈**
免费实例冷启动，等 30-60 秒。若持续 502，去平台 **Logs** 看启动报错。

**Q: 登录后一刷新就退出登录**
`COOKIE_SECURE=true` 但实际在用 http 访问。改 `false`，或给站点配上 HTTPS。

**Q: 注册成功，但过一会儿/重新部署后账号没了**
免费版没有持久磁盘，属于预期行为。见第五节。
若已付费挂盘仍丢失，检查 `DATA_DIR` 是否与磁盘挂载路径完全一致（如都为 `/data`）。

**Q: 构建失败，日志里是 npm 或 bcrypt 相关报错**
本项目用 Docker 部署，镜像内已包含 bcrypt 编译所需的工具链。
若改成了 Node runtime 部署，需要确保平台能编译原生模块（Render 默认可以）。

**Q: `git push` 报 Connection was reset**
国内直连 GitHub 被重置。让 git 走本地代理，见第三节步骤 1 的提示。

**Q: 商品图片显示不出来**
图片在 `public/images/`，确认部署时该目录已包含（Docker 构建里已 COPY）。

**Q: 启动日志出现 `MemoryStore is not designed for a production environment`**
这是 express-session 的提示：会话存在内存里，重启会丢失登录态。对竞赛演示无影响；若要正式运营，可换 SQLite 或 Redis 会话存储。

**Q: 端口被占用 `EADDRINUSE`**
换个端口：Windows `set PORT=3002 && npm run start`；macOS/Linux `PORT=3002 npm run start`。
