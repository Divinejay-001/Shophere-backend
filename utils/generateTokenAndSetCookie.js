import jwt from 'jsonwebtoken'

const generateTokenAndSetCookie = (res, userId) => {
    const accessToken = jwt.sign({userId}, process.env.SECRET_ACCESS_KEY, {
        expiresIn: '3d'
    })
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false, // Set to false in dev        
        sameSite: 'lax',        
        maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days in milliseconds
    })

    console.log('Cookie set:', res.getHeaders()['set-cookie']);

    return accessToken;
}

export default generateTokenAndSetCookie;

// expires: new Date(Date.now() + 1000 * 3) // 30 seconds