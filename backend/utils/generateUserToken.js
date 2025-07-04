const jwt = require("jsonwebtoken");

const generateUserToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

module.exports = generateUserToken;
