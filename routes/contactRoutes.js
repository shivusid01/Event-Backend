// backend/routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { submitContactForm } = require('../controllers/contactController');

// Contact form submission
router.post('/submit', submitContactForm);

module.exports = router;