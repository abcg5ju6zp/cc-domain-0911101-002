# 居民关联服务处置门户

本地门户为账号处置集成提供可控页面和回执。它包含查询、确认、关闭与回执浏览页面，以及测试专用的本地会话。全部居民、账号和联系方式均为合成数据。项目当前提供门户本身，不包含自动操作客户端。

使用 Node.js 22 和 npm。首次准备浏览器需要下载运行组件：

    npm ci
    npx playwright install --with-deps --no-shell chromium
    npm run build
    npm test
    npm run test:browser
    npm start

服务输出随机 origin，在浏览器打开后使用“开始本地会话”进入。开发时使用 fixtures/cases.json 中的编号。门户默认在 var/portal-ledger.jsonl 保存自己的回执；PORTAL_LEDGER 可改动该路径。重新启动会保留回执，测试会话和控制开关不跨重启保留。

npm test 验证门户自身协议；npm run test:browser 通过真实 Chromium 查看页面并处理一个合成账号。文档 docs/portal.md 说明页面和故障控制，运行时无需访问外部业务系统。
