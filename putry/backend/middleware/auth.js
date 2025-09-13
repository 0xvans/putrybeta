import fetch from "node-fetch";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }
    const token = auth.split(" ")[1];

    const resp = await fetch("https://auth.privy.io/api/v1/verify", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PRIVY_APP_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!resp.ok) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const data = await resp.json();
    const privyUser = data.user;
    if (!privyUser) {
      return res.status(401).json({ error: "User not found in Privy" });
    }

    const email = privyUser.email?.address || null;
    const username = privyUser.google?.name || `user_${privyUser.id.slice(0,6)}`;
    const name = privyUser.google?.name || privyUser.twitter?.username || "New User";
    const avatar = privyUser.google?.picture || privyUser.twitter?.profilePictureUrl || null;

    const r = await pool.query(
      `INSERT INTO users (email, name, username, avatar, role, badge, privy_id)
       VALUES ($1, $2, $3, $4, 'member', 0, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [email, name, username, avatar, privyUser.id]
    );

    req.user = r.rows[0];
    next();
  } catch (e) {
    console.error("Auth error", e);
    res.status(500).json({ error: "Auth verification failed" });
  }
}
