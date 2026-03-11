const { config } = require('../config');
const { sendProblem } = require('../http/problem-response');
const { verifyAccessToken } = require('../services/jwt-service');

function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');
  if (!token) {
    return sendProblem(res, 401, 'missing token');
  }

  try {
    const decoded = verifyAccessToken(token, config.jwt);
    req.user = decoded;
    return next();
  } catch (err) {
    return sendProblem(res, 401, 'invalid token');
  }
}

module.exports = { authenticateJwt };
