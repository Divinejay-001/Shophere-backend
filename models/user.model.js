import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema({
    personal_info: {        
        username: {
            type: String,
            minlength: [3, 'Username must be 3 letters long'],
            unique: true,
            required:true,
            lowercase:true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            unique: true
        },
        gender:{
            type: String,
            enum: ['male', 'female'],            
        },
        phone_number:{
            type: String,            
            unique: true,
        },
        password: String,       
        bio: {
            type: String,
            maxlength: [200, 'Bio should not be more than 200'],
            default: "",
        },
        profile_img: {
            type: String,
            default: ''            
        },
    },
    social_links: {
        youtube: {
            type: String,
            default: "",
        },
        instagram: {
            type: String,
            default: "",
        },
        facebook: {
            type: String,
            default: "",
        },
        twitter: {
            type: String,
            default: "",
        },
        github: {
            type: String,
            default: "",
        },
        website: {
            type: String,
            default: "",
        }
    },
    user_stats:{
        total_sessions: {
            type: Number,
            default: 0
        },
        amount_spent: {
            type: Number,
            default: 0
        },
    },
    isGoogleAuthenticated: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    role:{
        type: String,
        enum:['user', 'admin'],
        default: 'user'
    },
    lastLoggedin:{
        type: Date,
        default: Date.now()
    }
}, 
{ 
    timestamps: {
        createdAt: 'joinedAt'
    } 
});


const User = mongoose.model('User', userSchema);
export default User;