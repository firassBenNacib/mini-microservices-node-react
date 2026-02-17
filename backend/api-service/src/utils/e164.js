const E164_REGEX = /^\+[1-9]\d{7,14}$/;

function isE164Phone(value) {
  return typeof value === 'string' && E164_REGEX.test(value.trim());
}

module.exports = { isE164Phone };
