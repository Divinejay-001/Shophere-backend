import handleError from "../utils/error.js";
import User from "../models/user.model.js";
// import bcrypt from 'bcrypt';
import bcryptjs  from 'bcryptjs'
import { generateVerificationToken } from "../utils/generateVerificationToken.js";
import generateTokenAndSetCookie from "../utils/generateTokenAndSetCookie.js";
import { generateAndSendPasswordResetOTP, sendVerificationEmail } from "../utils/mail.js";
import VerificationToken from "../models/VerificationToken.model.js";
import ResetOTP from "../models/resetOTP.model.js";
import crypto from 'crypto'
import jwt from 'jsonwebtoken';




let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

// @desc Register a new User
// @route POST: /api/auth/signup
// @access Public
const signupUser = async (req, res, next) => {
    console.log('request body: ' + req.body);
    const { username, email, password, phone_number, gender } = req.body;

    try{ 
        // validating the data from the frontend
        if(username.length < 3){
            return next(handleError(403, "Username must be at least three letters long" ));        
        }
        if(!email.length){
            return next(handleError(403, "Enter email" ));
        }
        if(!emailRegex.test(email)){
            return next(handleError(403, "Email is Invalid" ));       
        }
        if(!passwordRegex.test(password)){
            return next(handleError(403, "Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letters." ));         
        }

        //check if the user already exists in the database
        const emailExists = await User.findOne({"personal_info.email":email});
        const usernameExists = await User.findOne({"personal_info.username": username});
        const phoneNumberExists = await User.findOne({"personal_info.phone_number": phone_number});


        if(usernameExists){
            return next(handleError(403, "Username is already in use" ));         
        }
        if(emailExists){
            return next(handleError(403, "Email is already in use"));         
        }       
        if(phoneNumberExists){
            return next(handleError(403, "Phone number is already in use"));         
        }       

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcryptjs.hash(password, saltRounds);

        // send verification link to the user
        // const verificationToken = generateVerificationToken();
    
        // Create a new User
        const newUser = new User({
            personal_info:{            
                username,
                email,
                phone_number, 
                gender,                
                password: hashedPassword            
            }                 
        });

        // save the user
        await newUser.save();

        generateTokenAndSetCookie(res, newUser._id);
        
        
        await sendVerificationEmail(newUser);   

        return res.status(201).json({
            success: true,
            status: 'verification pending',            
            message: `verification link sent to your email'`,                     
        })         
    }catch(error){
        if(error.code === 11000){
            return next(handleError(500, "Username already Exists"));
        }
        return next(error);
    }    
}

// @desc Login a User
// @route POST /api/auth/signup
// @access Public
const signinUser = async (req, res, next) => {
    const { email, password } = req.body;

    try{
        // Check if User has already registered
        const user = await User.findOne({"personal_info.email":email});
        if(!user){
            return next(handleError(400, "User not found" ));            
        }
     
        
        //check if the user is not signed in with google
        if(!user.isGoogleAuthenticated){
            
            const { isVerified, _id:userId } = user

            if(!isVerified){
                // Check if user is verified
                await sendVerificationEmail(user); 
                return next(handleError(403, "User not Verified, verification link sent to your email" ));   
            }

            // comapare new password with encrypted password
            const validated = await bcryptjs.compare(password, user.personal_info.password);

            // If passwords dont match
            if(!validated){
                return next(handleError(403, "Wrong Credentials" ));                 
            }

            await User.updateOne({_id: userId}, {lastLoggedin: Date.now()});
    
            // generate Access Token 
            generateTokenAndSetCookie(res, user._id); 

           const { 
            personal_info: { username, fullname, profile_img, phone_number}, 
            social_links,
            role 
        } = user
            // const expiryTime = new Date(Date.now() + 360000) //1 hour
            return res.status(200).json({
                success: true,
                status: 'Success', 
                message: `Successfully signed in`,                
                user:{
                    username, 
                    fullname,               
                    profile_img,
                    role,
                    phone_number,
                }                
            })            
        }else{
            return next(handleError(403, "Already registered using Google" )); 
        } 
    }catch(error){
        return next(error);
    }
}

// @desc Log a user out
// @route POST /api/auth/signout'
// @access Public
const signoutUser = async (req, res, next) => {
    try {        
        res.clearCookie('accessToken').status(200).json({message: 'Signed out successfully'})
    } catch (error) {
        return next(error);
    }   
}

// @desc Generate OTP
// @route GET /api/auth/admin'
// @access Public
const adminRoute = async (req, res, next) => {
    try {       
        res.status(200).json({message: 'Access Granted, because you are an admin', user: req.user})
    } catch (error) {
        return next(error)        
    }
}

// @desc a sample private route
// @route GET /api/auth/private'
// @access Private
const resetPassword = async (req, res, next) => {
    try {  
        const { _id } = req.user;
        const { newPassword } = req.body;
        const user = await User.findById(_id);

        if(!user){
           return next(handleError(403, 'User not found'))
        }

        if(!newPassword){
            return next(handleError(403, 'Provide your new Password'))
        }

        // Update user's password
        const hashedPassword = await bcryptjs.hash(newPassword, 10);
        user.personal_info.password = hashedPassword;
        await user.save();

        // Clear JWT cookie
        res.clearCookie('accessToken');

        res.status(200).json({ 
            success: true,
            statusCode: 200, 
            message: 'Password reset successfully.' 
        })
    } catch (error) {
        return next(error)        
    }
}


// @desc Generate OTP
// @route POST: /api/auth/generateOTP'
// @access Public
const generateOTP = async (req, res, next) => {
    const { email } = req.body
    try {
        if(!email){
            next(handleError(403, 'Please Provide your email'))
        }
        // Check if User has already registered
        const user = await User.findOne({"personal_info.email": email});

        if(!user){// user does not exist
          return  next(handleError(403, `Account doesn't exist`))
        }else{//user exists
            //generate and send new OTP to users email
            await generateAndSendPasswordResetOTP(user);
        }
        return res.status(200).json({
            success: true,
            status:'SUCCESS',
            message:'Password reset OTP sent to user',
        })        
    } catch (error) {
        return next(error);        
    }
} 


// @desc Verify OTP
// @route POST /api/auth/verifyOTP
// @access Public
const verifyOTP = async (req, res, next) => {    
    try {
        let { email, OTP } = req.body;        

        // Check if user provided details
        if(!email || !OTP){
            return next(handleError(403, 'Empty OTP details are not allowed'));
        }

       // Find the user based on the userId
        const user = await User.findOne({"personal_info.email": email});

        // User doesn't exist
        if(!user){
            return next(handleError(403, `Account record doesn't exist, Please create Account`));
        }

        // If User exists in database, check for the userId in the ResetOTP collections
        const userVerificationRecords = await ResetOTP.findOne({owner: user._id});

        console.log({userVerificationRecords})

        if(!userVerificationRecords){
            //no record found
            return next(handleError(403, `This OTP is already verified`));
        }else{
            // user OTP record exists                
            const { expiresAt, OTP:savedOTP } = userVerificationRecords;
            console.log({expired: expiresAt < Date.now()})
            if(expiresAt < Date.now()){
                // User OTP record has expired, delete ResetOTP
                await ResetOTP.deleteMany({owner:user._id});
                return next(handleError(403, 'OTP has expired. Please request again.'))
            }else{
                // compare generated OTP to the hashed OTP in th database
                const validOTP = await bcryptjs.compare(OTP.trim(), savedOTP);
                // const validated = await bcrypt.compare(password, user.personal_info.password);

                console.log({validOTP})
                if(!validOTP){
                    // Supplied OTP is wrong
                    return next(handleError(403, 'Invalid code passed, check your inbox.'))
                }else{
                    // success valid OTP
                    const verifiedUser = await User.findOneAndUpdate({_id: user._id}, { verified: true});

                    //  delete the VerificationOTP
                    await ResetOTP.deleteMany({owner:user._id});

                    // Upon successful OTP verification, generate and store the JWT token in cookies
                    generateTokenAndSetCookie(res, user._id);
                    // const {personal_info: {username,  profile_img}, role} = verifiedUser;
                    return res.status(200).json({
                        success: true, 
                        statusCode: 200,
                        message: `OTP was successfully VERIFIED`, 
                    })     
                }
            }
        }       
    } catch (error) {
        return next(error);        
    }
}


// @desc Successfully redirecting user when OTP is valid
// @route GET /api/auth/resendOTP
// @access Public
const resendOTP = async (req, res, next) => {
    const { email } = req.body
    try {
        if(!email){
            next(handleError(403, 'Please Provide your email'))
        }
        // Check if User has already registered
        const user = await User.findOne({"personal_info.email": email});
        
    } catch (error) {
        return next(error)
        
    }
}


// @desc Authenticate a User using Google
// @route POST /api/auth/google-auth'
// @access Public
const googleAuth = async (req, res, next) => {
    const { email, name, photo } = req.body;
    try {
        // Check if user already exists in the database
        let user = await User.findOne({"personal_info.email": email});

        if (user) {
            // Check if the existing user was not signed up with Google
            if (!user.isGoogleAuthenticated) {
                next(handleError(403, "This email was signed up without Google. Please log in with password to access the account"));
            }else{    
                const {_id:userId, personal_info: {username, profile_img, fullname}, role } = user            
                 // generate an access token
                generateToken(res, userId);
                
                 // Respond with the user information
                return res.status(200).json({
                    success: true,
                    
                    statusCode:200,
                    message: `Successfully Signed in'`,
                    user:{
                        username,                
                        profile_img, 
                        userId,
                        fullname,
                        role,                
                    },            
                }) 
            }            
        } else {
            // If user does not exist, create a new user with Google authentication            
            const username = name.split(" ").join("").toLowerCase() + Math.random().toString(36).slice(-8);

            user = new User({
                personal_info: { 
                    fullname: name,
                    username,
                    email,
                    profile_img: photo,
                    role: 'user',
                },
                isGoogleAuthenticated: true,
                isVerified: true
            });

            // Save the new user to the database
            await user.save();
            const {_id:userId, role } = user;

            // generate an access token
            generateTokenAndSetCookie(res, userId);
        
        // Respond with the user information
        return res.status(200).json({
            success: true,            
            statusCode:200,
            message: `Successfully Signed Up'`,
            user:{
                username,                
                profile_img:photo, 
                userId,
                role,                
            },            
        })         
        }        
    } catch (error) {
        next(error);        
    }
}

// @desc Authenticate a User using Google
// @route POST /api/auth/google-auth'
// @access Protected
const verifyUser = async (req, res, next) => {
    try {
        const { id: userId, token:userToken } = req.params;
        // const { token: userToken } = req.query;

        // check if user exists
        const user = await User.findById(userId);

        if(!user){
           return  next(handleError(403, 'Invalid link'))
        }

        const verificationToken = await VerificationToken.findOne({owner: userId });

        if(!verificationToken){
            return  next(handleError(403, 'Invalid Link'))
        }

        // user OTP record exists                
        const { expiresAt, token:savedToken } = verificationToken;

        if(expiresAt < Date.now()){
            return  next(handleError(403, 'verification link expired,  request for another link'))
        }

         // Compare the hashed token with the hash of the user-provided unhashed token
        const isValid = crypto.createHash('sha256').update(userToken).digest('hex') === savedToken;
        

        if(!isValid){
            return  next(handleError(403, 'Invalid verification token'))
        }

        await User.updateOne({_id: userId}, {isVerified:true});

        // Delete verification token from the database
        await VerificationToken.deleteOne({ owner: userId  });

        const { personal_info: { username:user_username, profile_img}, role, _id, isVerified} = user

        generateTokenAndSetCookie(res, _id);

        return res.status(200).json({ 
            success: true, 
            message: 'User successfully verified',
            userId,
            user:{
                username: user_username,                
                profile_img, 
                userId,
                role,                
            },        
         });
    } catch (error) {
        return next(error);
    }
}

// @desc Login a User
// @route GET /api/auth/resendVerificationMail/:id
// @access Public
const resendVerificationEmail = async (req, res, next) => {
    try {
        const { id: userId } = req.params; 
    
        // check if user exists
        const user = await User.findById(userId);
    
        if(!user){
           return  next(handleError(403, 'User dosent exist'))
        }
        generateTokenAndSetCookie(res, userId);
    
        await sendVerificationEmail(user); 
    
        const { personal_info: { username:user_username, email:user_email, profile_img}, role, _id, isVerified} = user
    
        return res.status(200).json({
            success: true,
            status: 'verification pending', 
            statusCode:200,
            message: `verification link sent to your email'`,
            user:{
                username: user_username,                
                profile_img, 
                userId:_id,
                role,
                isVerified
            },            
        })         
    
    }catch(error){
        return next(error);
    }
    }
// getUser  
const getUser = async (req, res) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - No token provided"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('-personal_info.password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error("JWT Verification Failed:", error.message);
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Invalid or expired token"
        });
    }
};

export { 
    signupUser, 
    signinUser,
    signoutUser,
    resetPassword,
    verifyUser,
    generateOTP,
    verifyOTP,
    resendOTP,
    googleAuth,
    adminRoute,
    resendVerificationEmail,
    getUser
}