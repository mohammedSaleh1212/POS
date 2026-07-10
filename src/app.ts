import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';
import categoriesRoutes from './routes/category.routes';
import invoiceRoutes from './routes/invoice.routes';
import movementRoutes from './routes/movement.routes';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use('/api/products', productRoutes);
app.use('/api/categories', categoriesRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/movements", movementRoutes);
app.use("/api/auth", authRoutes);
app.use(errorHandler);


export default app;