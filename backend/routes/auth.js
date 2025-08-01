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
    failureRedirect: '/login'
  }),
  (req, res) => {
    // Generate a simple token and store user in session
    const token = Buffer.from(JSON.stringify({
      id: req.user.id,
      email: req.user.emails[0].value,
      name: req.user.displayName,
      timestamp: Date.now()
    })).toString('base64');

    // Store user in session as backup
    req.session.user = req.user;
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      // Redirect with token in URL as fallback
      res.redirect(`${frontendUrl}?token=${token}`);
    });
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
});

// Validate token endpoint
router.post('/validate_token', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    const userData = JSON.parse(Buffer.from(token, 'base64').toString());

    // Check if token is not too old (24 hours)
    const tokenAge = Date.now() - userData.timestamp;
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Store user in session for future requests
    req.session.user = {
      id: userData.id,
      displayName: userData.name,
      emails: [{ value: userData.email }]
    };

    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      res.json({
        id: userData.id,
        displayName: userData.name,
        emails: [{ value: userData.email }]
      });
    });

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get current user
router.get('/current_user', (req, res) => {
  // Return session user if passport user is not available
  const user = req.user || req.session.user;
  res.json(user || {});
});

module.exports = router;