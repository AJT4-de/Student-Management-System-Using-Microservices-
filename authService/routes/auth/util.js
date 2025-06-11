const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
const {
  STUDENT_SERVICE,
  PROFESSOR__SERVICE,
  ROLES,
} = require("../../../consts");
const { getCorrelationId } = require("../../../correlationId");
const { authServiceLogger } = require("../../../logging");

dotenv.config();

const privateKey = fs.readFileSync(
  path.join(__dirname, "../auth/keys/private.key"),
  "utf8"
);
const publicKey = fs.readFileSync(
  path.join(__dirname, "../auth/keys/public.key"),
  "utf8"
);

const kid = "1";
const jku = `http://localhost:${process.env.PORT || 5001}/.well-known/jwks.json`;

const customHeaders = {
  kid,
  jku,
};

function generateJWTWithPrivateKey(payload) {
  const token = jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    header: customHeaders,
    expiresIn: "6h",
  });
  return token;
}

function verifyJWTWithPublicKey(token) {
}

async function fetchStudents() {
  const serviceToken = generateJWTWithPrivateKey({
    id: "AuthServiceInternalStudentFetch",
    roles: [ROLES.AUTH_SERVICE],
  });
  try {
    const response = await axios.get(STUDENT_SERVICE, {
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "x-correlation-id": getCorrelationId()
      },
    });
    return response.data;
  } catch (error) {
    authServiceLogger.error(
      `Error fetching students: ${error.response ? error.response.data : error.message}`
    );
    throw new Error("Unable to fetch student data");
  }
}

async function fetchProfessors() {
  const serviceToken = generateJWTWithPrivateKey({
    id: "AuthServiceInternalProfessorFetch",
    roles: [ROLES.AUTH_SERVICE],
  });
  authServiceLogger.debug(`Service token: ${serviceToken}`);
  try {
    const response = await axios.get(PROFESSOR__SERVICE, {
      headers: {
        Authorization: `Bearer ${serviceToken}`,
      },
    });
    return response.data;
  } catch (error) {
    //console.error("Error fetching professors:", error.response ? error.response.data : error.message);
    throw new Error("Unable to fetch professor data");
  }
}

module.exports = {
  kid,
  jku,
  generateJWTWithPrivateKey,
  fetchStudents,
  fetchProfessors,
};