const express = require('express');
const router = express.Router();
const passport = require('passport');

// Google OAuth login
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    successRedirect: process.env.FRONTEND_URL || 'http://localhost:3000'
  })
);

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
});

// Get current user
router.get('/current_user', (req, res) => {
  res.json(req.user || {});
});

module.exports = router;