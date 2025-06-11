import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import axios from 'axios';
import { ROLES } from '../../../consts.js';
import jwkToPem from 'jwk-to-pem';

dotenv.config();

async function fetchJWKS(jku) {
  try {
    const response = await axios.get(jku);
    return response.data;
  } catch (error) {
    throw new Error("Unable to fetch JWKS");
  }
}

function getPublicKeyFromJWKS(kid, keys) {
  const key = keys.find((k) => k.kid === kid && k.use === 'sig');

  if (!key) {
    throw new Error("Unable to find a signing key that matches the 'kid'");
  }
  return jwkToPem(key);
}

async function verifyJWTWithJWKS(token) {
  const decodedToken = jwt.decode(token, { complete: true });
  if (!decodedToken || !decodedToken.header) {
    throw new Error("Invalid token format");
  }
  const { kid, alg, jku } = decodedToken.header;

  if (!kid || !jku) {
    throw new Error("JWT header is missing 'kid' or 'jku'");
  }

  if (alg !== "RS256") {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }

  const jwks = await fetchJWKS(jku);
  if (!jwks || !jwks.keys) {
      throw new Error("Invalid JWKS format");
  }
  const publicKey = getPublicKeyFromJWKS(kid, jwks.keys);

  try {
    const decodedPayload = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    return decodedPayload;
  } catch (err) {
    throw new Error("Token verification failed: " + err.message);
  }
}

function verifyRole(requiredRoles) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ message: "Authorization token is missing or malformed" });
    }
    
    const token = authHeader.split(" ")[1];

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
      let statusCode = 403;
      if (error.message.includes("Authorization token is missing") || error.message.includes("Invalid token format")) {
          statusCode = 401;
      }
      return res
        .status(statusCode)
        .json({ message: error.message || "Invalid or expired token" });
    }
  };
}

function restrictStudentToOwnData(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated." });
  }

  const isStudent = req.user.roles && req.user.roles.includes(ROLES.STUDENT);
  const accessingOwnData = req.user.id === req.params.id; 
  const isAdmin = req.user.roles && req.user.roles.includes(ROLES.ADMIN);

  if (isAdmin || (isStudent && accessingOwnData)) {
    return next();
  } else {
    return res.status(403).json({
      message: "Access forbidden: You can only access your own data or you lack administrative privileges.",
    });
  }
}

export {
  verifyRole,
  restrictStudentToOwnData,
  verifyJWTWithJWKS,
  fetchJWKS,
  getPublicKeyFromJWKS
};