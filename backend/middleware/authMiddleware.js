



// =======================
// FILE: /middleware/authMiddleware.js
// =======================
import jwt from 'jsonwebtoken'

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' })
    }

    // Use the JWT_SECRET from environment variables
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // Attach user payload to the request
    next()
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' })
  }
}

export default auth




