import express from 'express';
import http from 'http';
import cors from 'cors';
import multer from 'multer';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import cloudinary from 'cloudinary';
import fs from 'fs';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const upload = multer({ dest: '/tmp' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

cloudinary.v2.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: true } });

const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('identify-token', async (token) => {
    try {
      // Verify token with Privy
      const resp = await fetch('https://auth.privy.io/api/v1/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PRIVY_APP_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const email = data.user?.email?.address;
      if (email) {
        // find user id
        const r = await pool.query('SELECT id FROM users WHERE email=$1 LIMIT 1', [email]);
        if (r.rows[0]) userSockets.set(String(r.rows[0].id), socket.id);
      }
    } catch (e) {
      console.error('identify-token error', e);
    }
  });

  socket.on('send_message', async (msg) => {
    try {
      const res = await pool.query('INSERT INTO messages (sender_id, receiver_id, body) VALUES ($1,$2,$3) RETURNING *', [msg.from, msg.to, msg.body]);
      const saved = res.rows[0];
      const toSocketId = userSockets.get(String(msg.to));
      io.emit('new_message', saved);
      if (toSocketId) io.to(toSocketId).emit('new_message', saved);
    } catch (e) {
      console.error('send_message error', e);
    }
  });

  socket.on('disconnect', () => {
    for (const [uid, sid] of userSockets.entries()) if (sid === socket.id) userSockets.delete(uid);
    console.log('socket disconnected', socket.id);
  });
});

async function getUserFromEmail(email) {
  const r = await pool.query('SELECT * FROM users WHERE email=$1 LIMIT 1', [email]);
  return r.rows[0] || null;
}

function requireRole(roles) {
  return async (req, res, next) => {
    const email = req.header('x-user-email') || null;
    if (!email) return res.status(401).json({ error: 'Missing user email header' });
    const user = await getUserFromEmail(email);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  };
}

app.get('/', (req, res) => res.json({ status: 'ok', now: new Date().toISOString() }));

app.get('/posts', async (req, res) => {
  const r = await pool.query('SELECT p.*, u.name as author_name, u.username as author_username, u.badge as author_badge FROM posts p LEFT JOIN users u ON p.author_id=u.id ORDER BY p.created_at DESC');
  res.json(r.rows);
});

app.post('/posts', async (req, res) => {
  // require authentication via header or token middleware in production
  const { author, body, channel_id, quote_of, image } = req.body;
  const r = await pool.query('INSERT INTO posts (author_id, body, channel_id, quote_of, image) VALUES ($1,$2,$3,$4,$5) RETURNING *', [author, body, channel_id || null, quote_of || null, image || null]);
  const saved = r.rows[0];
  io.emit('new_post', saved);
  res.json(saved);
});

app.post('/posts/:id/replies', async (req, res) => {
  const postId = req.params.id;
  const { author, body } = req.body;
  const r = await pool.query('INSERT INTO replies (post_id, author_id, body) VALUES ($1,$2,$3) RETURNING *', [postId, author, body]);
  const saved = r.rows[0];
  io.emit('new_notification', { message: `New reply on post ${postId}` });
  res.json(saved);
});

app.get('/channels', async (req, res) => {
  const r = await pool.query('SELECT * FROM channels ORDER BY created_at DESC');
  res.json(r.rows);
});

app.post('/channels', requireRole(['admin','moderator']), async (req, res) => {
  const { label } = req.body;
  const r = await pool.query('INSERT INTO channels (label) VALUES ($1) RETURNING *', [label]);
  res.json(r.rows[0]);
});

app.get('/users', async (req, res) => {
  const r = await pool.query('SELECT id,email,name,username,bio,badge,role,avatar_url FROM users ORDER BY id ASC');
  res.json(r.rows);
});

app.get('/users/:id', async (req, res) => {
  const r = await pool.query('SELECT id,email,name,username,bio,badge,role,avatar_url FROM users WHERE id=$1 LIMIT 1', [req.params.id]);
  res.json(r.rows[0] || null);
});

app.patch('/users/:id', async (req, res) => {
  const { name, username, bio, badge, avatar_url } = req.body;
  const r = await pool.query('UPDATE users SET name=$1, username=$2, bio=$3, badge=$4, avatar_url=$5 WHERE id=$6 RETURNING id,email,name,username,bio,badge,role,avatar_url', [name, username, bio, badge || 0, avatar_url || null, req.params.id]);
  res.json(r.rows[0]);
});

app.post('/users/:id/ban', requireRole(['admin','moderator']), async (req, res) => {
  const { id } = req.params;
  await pool.query('UPDATE users SET banned=true WHERE id=$1', [id]);
  res.json({ status: 'ok' });
});

app.get('/conversations', async (req, res) => {
  const user = req.query.user;
  const r = await pool.query(`SELECT m.* FROM messages m WHERE m.sender_id=$1 OR m.receiver_id=$1 ORDER BY m.created_at ASC`, [user]);
  const rows = r.rows;
  const groups = {};
  for (const row of rows) {
    const other = String(row.sender_id) === String(user) ? row.receiver_id : row.sender_id;
    if (!groups[other]) groups[other] = [];
    groups[other].push(row);
  }
  const out = Object.keys(groups).map(k => ({ withUserId: k, messages: groups[k] }));
  res.json(out);
});

app.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });
    const result = await cloudinary.v2.uploader.upload(file.path, { folder: 'putry-agency/avatars' });
    fs.unlinkSync(file.path);
    res.json({ url: result.secure_url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/messages', async (req, res) => {
  const { user1, user2 } = req.query;
  const r = await pool.query('SELECT * FROM messages WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY created_at ASC', [user1, user2]);
  res.json(r.rows);
});

// SEARCH & TRENDING
app.get('/search/users', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const r = await pool.query(
      `SELECT id, email, name, username, bio, badge FROM users
       WHERE username ILIKE $1 OR name ILIKE $1
       ORDER BY id ASC LIMIT $2`,
      [`%${q}%`, Number(req.query.limit || 20)]
    );
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'search users failed' }); }
});

app.get('/search/posts', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const r = await pool.query(
      `SELECT p.*, u.username as author_username, u.name as author_name FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.body ILIKE $1
       ORDER BY p.created_at DESC LIMIT $2`,
      [`%${q}%`, Number(req.query.limit || 50)]
    );
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'search posts failed' }); }
});

app.get('/search/channels', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const r = await pool.query(
      `SELECT * FROM channels WHERE label ILIKE $1 ORDER BY created_at DESC LIMIT $2`,
      [`%${q}%`, Number(req.query.limit || 20)]
    );
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'search channels failed' }); }
});

app.get('/trending/posts', async (req, res) => {
  try {
    const hours = Number(req.query.hours || 24);
    const limit = Number(req.query.limit || 10);
    const r = await pool.query(
      `SELECT p.*, u.username as author_username, u.name as author_name,
              (COALESCE(p.likes,0) + COALESCE(p.reposts,0)) as score
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.created_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY score DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'trending posts failed' }); }
});

app.get('/trending/channels', async (req, res) => {
  try {
    const days = Number(req.query.days || 7);
    const limit = Number(req.query.limit || 10);
    const r = await pool.query(
      `SELECT c.id, c.label, COUNT(p.id) AS post_count
       FROM channels c
       LEFT JOIN posts p ON p.channel_id = c.id AND p.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY c.id, c.label
       ORDER BY post_count DESC
       LIMIT $1`,
      [limit]
    );
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'trending channels failed' }); }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


