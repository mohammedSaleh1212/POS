import app from './app';
import { config } from './config/index';


const startServer = async () => {
  try {
    app.listen(config.port, () => {
      console.log(`🚀 Server executing on port ${config.port}`);
    });

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();