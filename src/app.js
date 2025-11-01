import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import userRoutes from "./routes/user.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import helpRequestRoutes from "./routes/helpRequest.routes.js";



const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use("/api/users", userRoutes); // ✅ Add this line


//notificationRoutes
app.use("/api/notifications", notificationRoutes);

//help reues
app.use("/api/help-requests", helpRequestRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;