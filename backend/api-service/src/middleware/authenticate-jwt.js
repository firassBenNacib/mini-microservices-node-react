const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { sendProblem } = require('../http/problem-response');

function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');
  if (!token) {
    return sendProblem(res, 401, 'missing token');
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    return next();
  } catch (err) {
    return sendProblem(res, 401, 'invalid token');
  }
}

module.exports = { authenticateJwt };
