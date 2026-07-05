import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';
import categoriesRoutes from './routes/category.routes';
import invoiceRoutes from './routes/invoice.routes';
import movementRoutes from './routes/movement.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/products', productRoutes);
app.use('/api/categories', categoriesRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/movements", movementRoutes);


export default app;