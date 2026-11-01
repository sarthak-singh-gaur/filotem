const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  let token = req.header('x-auth-token');

  // Also support standard Authorization: Bearer <token>
  if (!token && req.header('authorization')) {
    const authHeader = req.header('authorization');
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (e) {
    return res.status(401).json({ msg: 'Token is not valid or has expired' });
  }
};
