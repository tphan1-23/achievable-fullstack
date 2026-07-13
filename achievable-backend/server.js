require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(express.json());

// Enable CORS so frontend HTML file can talk to this backend
app.use(cors());

// Set up the Google OAuth2 client using the keys from your .env file
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ROUTE 1: Start the Login Flow
// When the user hits http://localhost:3000/auth, they get redirected to Google
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Gives us a refresh token so the login lasts longer
    scope: ['https://www.googleapis.com/auth/calendar.events'] // Permission to manage calendar events
  });
  res.redirect(url);
});

// ROUTE 2: The Google Callback Handshake
// Google sends the user back to this route with a security code in the URL
app.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code; // Grab the secret code from Google
    const { tokens } = await oauth2Client.getToken(code); // Trade it for real Access Tokens
    oauth2Client.setCredentials(tokens); // Save the tokens into our client session
    
    // Send a nice success message to the browser window
    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2>Successfully connected to Google Calendar!</h2>
        <p>You can close this tab now and go back to your Achievable App.</p>
      </div>
    `);
  } catch (error) {
    console.error('Error during handshake:', error);
    res.status(500).send('Authentication failed.');
  }
});

// ROUTE 3: Add a Goal to the Calendar
// frontend HTML will send a POST request here with the goal details
app.post('/create-event', async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Construct the event details based on what the user typed in the HTML inputs
    const event = {
      summary: req.body.title,
      description: req.body.desc,
      start: {
        date: req.body.deadline, // Expected format: YYYY-MM-DD
      },
      end: {
        date: req.body.deadline,
      },
    };

    // Push the event to the user's Primary Google Calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    
    res.status(200).json({ success: true, link: response.data.htmlLink });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'Could not add event to calendar.' });
  }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});