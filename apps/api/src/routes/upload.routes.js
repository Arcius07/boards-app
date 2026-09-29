const express = require("express");
const cloudinary = require("cloudinary").v2;
const requireAuth = require("../middleware/auth");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/sign", requireAuth, (req, res) => {
  const { type } = req.body;

  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign = {
    timestamp,
    folder: type === "avatar" ? "boards/avatars" : "boards/attachments",
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: paramsToSign.folder,
  });
});

module.exports = router;