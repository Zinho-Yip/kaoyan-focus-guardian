# 专注守门员

一个面向考研自习的本地优先 PWA。它用时间轴、具体任务、专注计时器和分心收集箱，帮助你在进入个人折腾心流前回到复习。

## 本地运行

直接双击 `index.html` 可以体验主要功能。若要启用完整 PWA 缓存，请在本目录启动静态服务器，例如：

```bash
python3 -m http.server 8080
```

然后打开 <http://localhost:8080>。部署到 VPS 时，需要让 `api/sync.php` 由 PHP 执行，并确保 `api/` 目录可写入 `data.json`。

## 当前功能

- 上午、下午、晚间学习区间与午饭/晚饭休息窗口
- 具体任务清单与完成状态
- 专注计时、暂停、结束和今日累计
- 切换标签页时记录中断并显示回归提示
- `N` 快捷键打开分心收集箱
- 明日第一件事复盘
- 学习表现签到与月历回溯
- 自定义 Zinho logo
- 本地 `localStorage` 存储和基础 PWA 离线缓存
- VPS 跨设备同步：任务、签到、复盘、统计和正在运行的计时器
- “手机锁屏/切后台时继续计时”选项

网页无法直接阻止操作系统程序，因此第一版通过可见的专注边界和中断反馈来约束行为。同步接口是个人单用户接口，建议在 Nginx/Caddy 层增加访问保护；也可以设置 `FOCUS_SYNC_TOKEN` 环境变量，并在部署版页面配置同名 token。

PHP-FPM 部署时，创建可写数据文件：

```bash
mkdir -p api
touch api/data.json
chown www-data:www-data api/data.json
```
