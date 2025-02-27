import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.route.js'
import { errorHandler } from './middlewares/error.middleware.js';
import cors from 'cors';

const app = express();

// This enables us to read the content of the .env file
dotenv.config();


// Enable CORS for all routes
app.use(cors({
    origin: 'http://localhost:5173', // Replace with your frontend's URL
    credentials: true, // Allow credentials (cookies)
}));
// app.use(cors()); 

//this middleware helps the backend receive json data from the frontend
app.use(express.json());

// Use cookie-parser middleware to parse cookies
app.use(cookieParser());

// Import routes
app.use('/api/auth', authRoutes);

const PORT = 3000;
mongoose.connect(process.env.MONGO_DB_URL)
.then(() => {
    console.log('Connected to MongoDB Database!');
    //listen for requests after connections has been made to the database
    app.listen(PORT, () => {
        console.log(`server started listening on port ${PORT}`);
    })
}).catch((err) => console.log('error', err));


// Error handling middleware
app.use(errorHandler);