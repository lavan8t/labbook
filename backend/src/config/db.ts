import { Pool, type QueryResult, type QueryResultRow } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "campusbook",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = performance.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = (performance.now() - start).toFixed(2);
    if (process.env.NODE_ENV !== "test") {
      console.log(`[SQL] (${duration}ms) ${text.trim().replace(/\s+/g, " ").slice(0, 80)}...`);
    }
    return res;
  } catch (err) {
    console.error(`[SQL Error] in query: ${text}`, err);
    throw err;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query("SELECT current_database(), current_user, version();");
    console.log(`Connected to PostgreSQL: database="${res.rows[0].current_database}", user="${res.rows[0].current_user}"`);
    return true;
  } catch (err: any) {
    console.error("Failed to connect to PostgreSQL:", err.message);
    return false;
  }
}

export default pool;
