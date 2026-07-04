import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';
import categoriesRoutes from './routes/category.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/products', productRoutes);
app.use('/api/categories', categoriesRoutes);


export default app;