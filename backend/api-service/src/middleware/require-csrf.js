const cookie = require('cookie');
const { sendProblem } = require('../http/problem-response');

function getCookie(req, name) {
  return cookie.parse(req.headers?.cookie || '')[name] || '';
}

function requireCsrf(req, res, next) {
  const csrfCookie = getCookie(req, 'XSRF-TOKEN');
  const csrfHeader = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'] || '';

  if (!csrfCookie || csrfCookie !== csrfHeader) {
    return sendProblem(res, 403, 'csrf token mismatch');
  }

  return next();
}

module.exports = { requireCsrf };
