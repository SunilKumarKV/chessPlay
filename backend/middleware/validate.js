function validateBody(rules = {}) {
  return (req, res, next) => {
    const body = req.body || {};
    const output = {};
    for (const [field, rule] of Object.entries(rules)) {
      const value = body[field];
      if (rule.required && (typeof value === "undefined" || value === "" || value === null)) {
        return res.status(400).json({ message: `${field} is required.` });
      }
      if (typeof value === "undefined" || value === null || value === "") continue;
      const stringValue = String(value);
      if (rule.max && stringValue.length > rule.max) return res.status(400).json({ message: `${field} is too long.` });
      if (rule.pattern && !rule.pattern.test(stringValue)) return res.status(400).json({ message: `${field} is invalid.` });
      if (rule.enum && !rule.enum.includes(value)) return res.status(400).json({ message: `${field} is invalid.` });
      output[field] = rule.transform ? rule.transform(value) : value;
    }
    req.validatedBody = output;
    return next();
  };
}

module.exports = { validateBody };
