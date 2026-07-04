import app from './app';
import { config } from './config/index';
import { db } from './db/index'; 
import { initializeDatabase } from './db/init';

const startServer = async () => {
  try {
    // console.log('🔄 Testing database connection...');
    // await db.query('SELECT NOW()');
    // console.log('🟢 Database connected successfully');

    // Run the initialization logic using the shared connection pool
    // await initializeDatabase();

    app.listen(config.port, () => {
      console.log(`🚀 Server executing on port ${config.port}`);
    });

  } catch (error) {
    // console.error('🔴 Database or Server initialization failed');
    console.error(error);
    process.exit(1);
  }
};

startServer();