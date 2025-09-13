CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  badge INT DEFAULT 0,
  role TEXT DEFAULT 'member',
  banned BOOLEAN DEFAULT false,
  privy_id TEXT UNIQUE
);

CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INT REFERENCES users(id),
  body TEXT,
  channel_id INT REFERENCES channels(id),
  quote_of INT REFERENCES posts(id),
  reposts INT DEFAULT 0,
  likes INT DEFAULT 0,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE replies (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  author_id INT REFERENCES users(id),
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(id),
  receiver_id INT REFERENCES users(id),
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
