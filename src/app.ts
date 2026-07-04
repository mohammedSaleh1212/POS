import express, { Request, Response } from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/v1/products', productRoutes);


export default app;