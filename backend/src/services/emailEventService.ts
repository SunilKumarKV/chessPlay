// @ts-nocheck
import EmailEvent from "../models/EmailEvent";

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

export { queueEmailEvent, };
