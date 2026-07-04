import { Pool, QueryResult } from 'pg';
import { config } from '../config/index';

// 1. Verify the URL exists before passing it to the Pool
if (!config.databaseUrl) {
  throw new Error("FATAL: config.databaseUrl is undefined. Check your .env file.");
}

export const pool = new Pool({
  connectionString: config.databaseUrl,

  max: 10,
  
  // Increase timeout to 30 seconds to survive Neon cold starts
  connectionTimeoutMillis: 30000, 
});

pool.on('error', (err) => {
  console.error('Unexpected database error on idle client:', err);
});

export const db = {
  query: async (text: string, params?: any[]): Promise<QueryResult> => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      return res;
    } catch (error) {
      console.error(`Query Execution Error: ${text}`, error);
      throw error;
    }
  },

  getClient: async () => {
    const client = await pool.connect();

    const query = client.query.bind(client);
    const release = client.release.bind(client);

    const timeout = setTimeout(() => {
      console.error('Client held too long → possible leak');
    }, 5000);

    client.release = () => {
      clearTimeout(timeout);
      client.query = query;
      client.release = release;
      return release();
    };

    return client;
  },
};

export const testDbConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};