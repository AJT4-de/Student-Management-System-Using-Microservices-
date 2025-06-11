const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
const { ROLES } = require("../../../consts");
const Course = require("../../models/course");
const { courseServiceLogger } = require("../../../logging");

dotenv.config();

async function fetchJWKS(jku) {
  const response = await axios.get(jku);
  return response.data.keys;
}

function getPublicKeyFromJWKS(kid, keys) {
  const key = keys.find((k) => k.kid === kid && k.use === 'sig');
  if (!key) {
    throw new Error("Unable to find a signing key that matches the 'kid'");
  }
  return `-----BEGIN PUBLIC KEY-----\n${key.n}\n-----END PUBLIC KEY-----`;
}

async function verifyJWTWithJWKS(token) {
  const decodedHeader = jwt.decode(token, { complete: true }).header;
  const { kid, alg, jku } = decodedHeader;

  if (!kid || !jku) {
    throw new Error("JWT header is missing 'kid' or 'jku'");
  }

  if (alg !== "RS256") {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }

  const keys = await fetchJWKS(jku);
  const publicKey = getPublicKeyFromJWKS(kid, keys);

  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
}

function verifyRole(requiredRoles) {
  return async (req, res, next) => {
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authorization token is missing" });
    }

    try {
      const decoded = await verifyJWTWithJWKS(token);
      req.user = decoded;

      const userRoles = req.user.roles || [];
      const hasRequiredRole = userRoles.some((role) =>
        requiredRoles.includes(role)
      );
      if (hasRequiredRole) {
        return next();
      } else {
        return res
          .status(403)
          .json({ message: "Access forbidden: Insufficient role" });
      }
    } catch (error) {
      courseServiceLogger.error(error);
      return res
        .status(403)
        .json({ message: "Invalid or expired token", error: error.message });
    }
  };
}

async function restrictCourseModificationToCreatorOrAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (req.user.roles && req.user.roles.includes(ROLES.ADMIN)) {
      return next();
    }

    if (req.user.roles && req.user.roles.includes(ROLES.PROFESSOR)) {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (course.createdBy.toString() === req.user.id.toString()) {
        return next();
      } else {
        return res.status(403).json({ message: "Access Forbidden: You can only modify courses you created." });
      }
    } else {
      return res.status(403).json({ message: "Access Forbidden: Insufficient role for this action." });
    }
  } catch (error) {
    courseServiceLogger.error(
      "Error in restrictCourseModificationToCreatorOrAdmin:" + error.message
    );
    if (error.kind === "ObjectId") {
        return res.status(400).json({ message: "Invalid course ID format in restriction check" });
    }
    return res.status(500).json({ message: "Server error during course access restriction check" });
  }
}

module.exports = {
  verifyRole,
  restrictCourseModificationToCreatorOrAdmin,
  verifyJWTWithJWKS
};