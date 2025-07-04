const jwt = require("jsonwebtoken");

const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      role: "admin",
      email: admin.email,
    },
    process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

module.exports = generateAdminToken;
