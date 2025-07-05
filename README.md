# 哔哩哔哩沉浸式播放器

一个专注于收藏夹播放的沉浸式B站视频播放器，无推荐干扰，纯净播放体验。

## 功能特性

- 🎬 **沉浸式播放** - 使用B站官方嵌入式播放器，无推荐视频干扰
- 📚 **收藏夹支持** - 直接读取用户的B站收藏夹
- 🎨 **现代化界面** - 响应式设计，支持移动端
- ⌨️ **快捷键支持** - 左右箭头键快速切换视频
- 🔄 **自动播放** - 支持连续播放收藏夹中的视频

## 项目结构

```
bilibili-immersive-player/
├── server.js          # Node.js后端服务器
├── package.json       # 项目依赖配置
├── public/
│   └── index.html     # 前端页面
└── README.md          # 说明文档
```

## 快速开始

### 1. 环境要求

- Node.js 14.0.0 或更高版本
- npm 或 yarn

### 2. 安装依赖

```bash
# 克隆项目
git clone <your-repo-url>
cd bilibili-immersive-player

# 安装依赖
npm install

# 或使用yarn
yarn install
```

### 3. 启动开发服务器

```bash
# 开发模式启动
npm run dev

# 或生产模式启动
npm start
```

### 4. 访问应用

打开浏览器访问 `http://localhost:3000`

## 部署到生产环境

### 云服务器部署

1. **准备服务器**
   - 推荐使用阿里云、腾讯云等云服务器
   - 确保服务器已安装Node.js和npm

2. **上传代码**
   ```bash
   # 使用git上传
   git clone <your-repo-url>
   cd bilibili-immersive-player
   npm install --production
   ```

3. **配置环境变量**
   ```bash
   # 设置端口
   export PORT=3000
   
   # 或创建.env文件
   echo "PORT=3000" > .env
   ```

4. **启动服务**
   ```bash
   # 使用PM2管理进程（推荐）
   npm install -g pm2
   pm2 start server.js --name bilibili-player
   
   # 或直接启动
   npm start
   ```

### 使用Docker部署

1. **创建Dockerfile**
   ```dockerfile
   FROM node:16-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install --production
   
   COPY . .
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

2. **构建和运行**
   ```bash
   # 构建镜像
   docker build -t bilibili-player .
   
   # 运行容器
   docker run -p 3000:3000 bilibili-player
   ```

### 静态部署（仅前端）

如果你只想部署前端页面（使用演示数据），可以直接将`public/index.html`部署到静态网站托管服务：

- GitHub Pages
- Netlify
- Vercel
- 阿里云OSS
- 腾讯云COS

## API 接口说明

### 获取用户收藏夹

```http
GET /api/favorites/:uid
```

### 获取收藏夹视频列表

```http
GET /api/favorites/:uid/:fid/videos?page=1&ps=20
```

### 获取视频详情

```http
GET /api/video/:bvid
```

### 搜索用户

```http
GET /api/search/user/:keyword
```

## 注意事项

1. **API限制**
   - B站API有访问频率限制
   - 部分接口可能需要登录状态
   - 建议添加请求缓存机制

2. **跨域问题**
   - 后端已配置CORS支持
   - 生产环境建议配置具体的允许域名

3. **隐私保护**
   - 只能访问公开的收藏夹
   - 不存储用户个人信息
   - 遵循B站的使用条款

## 自定义配置

### 修改端口

```javascript
// server.js
const PORT = process.env.PORT || 3000;
```

### 添加缓存

```javascript
// 在server.js中添加缓存中间件
const cache = require('memory-cache');

app.use('/api', (req, res, next) => {
    const key = req.originalUrl;
    const cachedData = cache.get(key);
    
    if (cachedData) {
        return res.json(cachedData);
    }
    
    next();
});
```

### 添加日志

```javascript
// 使用morgan添加访问日志
const morgan = require('morgan');
app.use(morgan('combined'));
```

## 常见问题

### Q: 无法获取收藏夹数据？
A: 请检查：
- 用户ID是否正确
- 收藏夹是否设为公开
- 网络连接是否正常
- 服务器是否正常运行

### Q: 视频播放失败？
A: 可能原因：
- 视频已被删除或设为私有
- 网络连接问题
- B站服务器问题

### Q: 如何获取B站用户ID？
A: 访问用户主页，URL中的数字就是用户ID
例如：`https://space.bilibili.com/123456` 中的 `123456`

## 开发计划

- [ ] 支持多个收藏夹切换
- [ ] 添加播放历史记录
- [ ] 支持播放列表管理
- [ ] 添加视频下载功能
- [ ] 支持弹幕显示控制
- [ ] 添加夜间模式
- [ ] 支持快捷键自定义

## 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 免责声明

本项目仅用于学习和研究目的，请遵守相关法律法规和B站的使用条款。不得用于商业用途或侵犯他人权益。