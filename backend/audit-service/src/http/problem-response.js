function sendProblem(res, status, error) {
  return res.status(status).json({ error });
}

function handleUnexpectedError(req, res, err, message = 'request error') {
  if (req.log) {
    req.log.error({ err }, message);
  }
  return sendProblem(res, 500, 'internal error');
}

module.exports = {
  sendProblem,
  handleUnexpectedError,
};
