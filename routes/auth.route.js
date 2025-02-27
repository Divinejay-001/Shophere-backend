import { Router } from "express";
import { 
    adminRoute, 
    generateOTP, 
    googleAuth, 
    resendOTP, 
    resendVerificationEmail, 
    resetPassword, 
    signinUser, 
    signoutUser, 
    signupUser, 
    verifyOTP, 
    verifyUser } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import isAdmin from "../middlewares/admin.middleware.js";


// Initialize the router
const router = Router();

// Signup
router.post('/signup', signupUser);

// Signin
router.post('/signin', signinUser);

// Signout
router.get('/signout', signoutUser);

// generate OTP
router.post('/generateOTP', generateOTP);

// verify OTP
router.post('/verifyOTP', verifyOTP);

// resend verification Mail
router.get('/resendVerificationMail/:id', resendVerificationEmail);

// verify User
router.get('/:id/verify/:token', verifyUser);

// Create or Reset Session
router.get('/resendOTP', resendOTP);

// Google Auth
router.post('/google-auth', googleAuth);

// private routes
router.post('/resetPassword', protect, resetPassword);

// Admin routes
router.get('/admin', protect, isAdmin,  adminRoute);

export default router;