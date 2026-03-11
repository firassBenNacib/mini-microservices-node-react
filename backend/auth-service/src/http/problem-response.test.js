const assert = require('node:assert/strict');
const test = require('node:test');

const { handleUnexpectedError, sendProblem } = require('./problem-response');

function createResponse() {
  return {
    body: null,
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

test('sendProblem writes the supplied status and error body', () => {
  const response = createResponse();

  sendProblem(response, 401, 'unauthorized');

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { error: 'unauthorized' });
});

test('handleUnexpectedError logs the failure and returns a generic 500 body', () => {
  const response = createResponse();
  let logged = null;

  handleUnexpectedError(
    {
      log: {
        error(payload, message) {
          logged = { payload, message };
        },
      },
    },
    response,
    new Error('boom'),
  );

  assert.equal(logged.message, 'request error');
  assert.equal(logged.payload.err.message, 'boom');
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: 'internal error' });
});
