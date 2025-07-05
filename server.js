// server.js - Node.js后端服务器
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 提供静态文件服务

// Session 配置 (用于二维码登录)
app.use(session({
  secret: 'your-random-secret-key', // 请更换为随机密钥
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // 如果部署在 HTTPS 下可设为 true
}));

// B站API相关配置
const BILIBILI_API_BASE = 'https://api.bilibili.com';

// ==================== 登录相关接口 ====================

// 1. 获取登录 Key 并返回二维码链接
app.get('/auth/qrkey', async (req, res) => {
  try {
    console.log('申请二维码中...');
    
    const resp = await axios.get('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    });
    
    console.log('B站API响应:', resp.data);
    
    if (resp.data.code !== 0) {
      console.error('B站API返回错误:', resp.data);
      return res.status(400).json({ 
        error: '申请二维码失败', 
        message: resp.data.message 
      });
    }
    
    const { url, qrcode_key } = resp.data.data;
    
    if (!url || !qrcode_key) {
      console.error('响应数据缺少必要字段:', resp.data.data);
      return res.status(500).json({ error: '响应数据格式错误' });
    }
    
    req.session.qrKey = qrcode_key;
    console.log('二维码申请成功, qrcode_key:', qrcode_key);
    
    res.json({ 
      success: true,
      qrUrl: url,
      qrcode_key: qrcode_key 
    });
    
  } catch (err) {
    console.error('申请二维码失败:', err.response?.data || err.message);
    res.status(500).json({ 
      error: '申请二维码失败', 
      message: err.response?.data?.message || err.message 
    });
  }
});

// 2. 轮询扫码状态
app.get('/auth/qrstatus', async (req, res) => {
  const key = req.session.qrKey;
  
  if (!key) {
    console.error('Session中没有qrKey');
    return res.status(400).json({ error: '未初始化登录' });
  }
  
  try {
    console.log('轮询扫码状态, qrcode_key:', key);
    
    const resp = await axios.get('https://passport.bilibili.com/x/passport-login/web/qrcode/poll', {
      params: { qrcode_key: key },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    });
    
    console.log('轮询响应:', resp.data);
    
    const { code, message, data } = resp.data;
    
    // 根据B站API文档，状态码含义：
    // 86101: 未扫码
    // 86090: 已扫码未确认
    // 86038: 二维码已失效
    // 0: 扫码登录成功
    
    if (code === 0) {
      // 登录成功，提取Cookie
      const setCookieHeader = resp.headers['set-cookie'];
      if (setCookieHeader) {
        req.session.biliCookie = setCookieHeader.join('; ');
        console.log('登录成功，Cookie已保存');
      }
      
      // 清除qrKey
      delete req.session.qrKey;
    }
    
    res.json({ 
      success: true,
      code, 
      message, 
      data: data || {} 
    });
    
  } catch (err) {
    console.error('轮询二维码状态失败:', err.response?.data || err.message);
    res.status(500).json({ 
      error: '轮询二维码状态失败',
      message: err.response?.data?.message || err.message
    });
  }
});

// 3. 登出接口
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('登出失败:', err);
      return res.status(500).json({ error: '登出失败' });
    }
    res.json({ success: true, message: '登出成功' });
  });
});

// 4. 检查登录状态
app.get('/auth/status', (req, res) => {
  const isLoggedIn = !!req.session.biliCookie;
  res.json({ 
    success: true,
    isLoggedIn,
    message: isLoggedIn ? '已登录' : '未登录'
  });
});

// ==================== 用户信息接口 ====================

// 获取用户信息 (需要登录)
app.get('/api/user/:uid', async (req, res) => {
  const cookie = req.session.biliCookie;
  if (!cookie) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const resp = await axios.get(`${BILIBILI_API_BASE}/x/space/acc/info`, {
      params: { mid: req.params.uid },
      headers: { 
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    });
    
    if (resp.data.code !== 0) {
      return res.status(400).json({
        error: '获取用户信息失败',
        message: resp.data.message
      });
    }
    
    res.json({
      success: true,
      data: resp.data.data
    });
    
  } catch (err) {
    console.error('调用用户信息接口失败:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 搜索用户 (无需登录)
app.get('/api/search/user/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;

    const response = await axios.get(`${BILIBILI_API_BASE}/x/web-interface/search/type`, {
      params: {
        search_type: 'bili_user',
        keyword: keyword,
        page: 1
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    });

    if (response.data.code !== 0) {
      return res.status(400).json({
        error: 'Failed to search users',
        message: response.data.message
      });
    }

    const users = response.data.data.result || [];
    const processedUsers = users.map(user => ({
      uid: user.mid,
      name: user.uname,
      avatar: user.upic,
      follower: user.fans,
      verified: user.official_verify ? user.official_verify.desc : null
    }));

    res.json({
      success: true,
      data: processedUsers
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ==================== 收藏夹相关接口 ====================

// 获取用户收藏夹列表
app.get('/api/favorites/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    // 调用B站API获取收藏夹列表
    const response = await axios.get(`${BILIBILI_API_BASE}/x/v3/fav/folder/created/list-all`, {
      params: {
        up_mid: uid,
        jsonp: 'jsonp'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    });

    if (response.data.code !== 0) {
      return res.status(400).json({
        error: 'Failed to fetch favorites',
        message: response.data.message
      });
    }

    const favorites = response.data.data.list || [];
    res.json({
      success: true,
      data: favorites
    });

  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 获取收藏夹内的视频列表
app.get('/api/favorites/:uid/:fid/videos', async (req, res) => {
  try {
    const { uid, fid } = req.params;
    const { page = 1, ps = 20 } = req.query;

    const response = await axios.get(`${BILIBILI_API_BASE}/x/v3/fav/resource/list`, {
      params: {
        media_id: fid,
        pn: page,
        ps: ps,
        jsonp: 'jsonp'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    });

    if (response.data.code !== 0) {
      return res.status(400).json({
        error: 'Failed to fetch videos',
        message: response.data.message
      });
    }

    const videos = response.data.data.medias || [];
    const processedVideos = videos.map(video => ({
      id: video.bvid,
      title: video.title,
      author: video.upper.name,
      authorId: video.upper.mid,
      thumbnail: video.cover,
      duration: formatDuration(video.duration),
      publishTime: video.pubtime,
      description: video.intro
    }));

    res.json({
      success: true,
      data: processedVideos,
      total: response.data.data.info.media_count
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ==================== 视频相关接口 ====================

// 获取视频详细信息
app.get('/api/video/:bvid', async (req, res) => {
  try {
    const { bvid } = req.params;

    const response = await axios.get(`${BILIBILI_API_BASE}/x/web-interface/view`, {
      params: {
        bvid: bvid
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/'
      }
    });

    if (response.data.code !== 0) {
      return res.status(400).json({
        error: 'Failed to fetch video info',
        message: response.data.message
      });
    }

    const video = response.data.data;
    res.json({
      success: true,
      data: {
        id: video.bvid,
        title: video.title,
        author: video.owner.name,
        thumbnail: video.pic,
        duration: formatDuration(video.duration),
        description: video.desc,
        publishTime: video.pubdate,
        viewCount: video.stat.view,
        likeCount: video.stat.like
      }
    });

  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ==================== 工具函数 ====================

// 格式化时长
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// ==================== 路由 ====================

// 提供前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the application`);
});

// 导出app供测试使用
module.exports = app;