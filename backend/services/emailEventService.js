const EmailEvent = require("../models/EmailEvent");

async function queueEmailEvent(type, { user = null, email = "", payload = {}, scheduledFor = new Date() } = {}) {
  try {
    return await EmailEvent.create({
      user,
      email,
      type,
      payload,
      scheduledFor,
      status: "queued",
    });
  } catch {
    return null;
  }
}

module.exports = {
  queueEmailEvent,
};
