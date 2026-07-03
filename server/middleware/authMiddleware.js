const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // 1. look for the token in the Authorization header
    // format expected: "Bearer <token>"
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. if there's no token, block the request
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // 3. verify the token is valid and not tampered with
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. find the user from the token's id, attach to request (without password)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // 5. all good — let the request continue
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };