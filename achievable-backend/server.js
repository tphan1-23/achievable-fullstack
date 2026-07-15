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
    
    // UPDATED: Now sending back the response.data.id as eventId!
    res.status(200).json({ 
      success: true, 
      link: response.data.htmlLink, 
      eventId: response.data.id 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'Could not add event to calendar.' });
  }
});

// ROUTE 4: Mark the Event as Done
// Updates the existing event to turn it green and add a checkmark
app.post('/complete-event', async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { eventId, title } = req.body;

    // 1. Get the existing event details first using the ID
    const existingEvent = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId
    });

    // 2. Overwrite the title and color, but keep everything else the same
    await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: {
        ...existingEvent.data,
        summary: `✅ [DONE] ${title}`,
        colorId: '2' // '2' is the Google Calendar code for Sage Green!
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, error: 'Could not update event.' });
  }
});

// ROUTE 5: Revert the Event to Uncompleted (Undo)
// Strips the checkmark/status and restores original calendar color
app.post('/undo-complete-event', async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { eventId } = req.body;

    // 1. Fetch the event's current state from Google Calendar
    const existingEvent = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId
    });

    // 2. Strip "✅ [DONE] " out of the title if it exists
    let originalTitle = existingEvent.data.summary || '';
    if (originalTitle.startsWith('✅ [DONE] ')) {
      originalTitle = originalTitle.replace('✅ [DONE] ', '');
    }

    // 3. Create updated resource and remove the custom colorId property so it defaults back
    const updatedEvent = {
      ...existingEvent.data,
      summary: originalTitle
    };
    delete updatedEvent.colorId; // Deleting colorId forces the default calendar color to return

    // 4. Update the event
    await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: updatedEvent
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error reverting event:', error);
    res.status(500).json({ success: false, error: 'Could not revert uncompleted event.' });
  }
});

// ROUTE 6: Delete the Event from Google Calendar
app.post('/delete-event', async (req, res) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { eventId } = req.body;

    // If there is no event ID, we can't delete it!
    if (!eventId) {
      return res.status(400).json({ success: false, error: 'No event ID provided' });
    }

    // Tell Google Calendar to permanently delete this event
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });

    res.status(200).json({ success: true, message: 'Event permanently deleted from calendar' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: 'Could not delete event from Google Calendar.' });
  }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

// A simple route for the homepage so the Render link doesn't show an error
app.get('/', (req, res) => {
  res.send('Achievable Backend API is running successfully!');
});