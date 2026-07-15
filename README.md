# Achievable

[![Netlify Status](https://img.shields.io/badge/Deployed_on-Netlify-00C7B7?style=flat&logo=netlify)](https://achievable.netlify.app/achievable/index.html)
[![Render Status](https://img.shields.io/badge/Hosted_on-Render-46E3B7?style=flat&logo=render)](https://achievable-fullstack.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](#)

> **Achievable** is a lightweight, full-stack productivity app that turns your daily goals into actual events on your Google Calendar. 

Instead of juggling a separate to-do list app and a calendar app, Achievable bridges the gap. It allows you to create tasks that immediately sync to your primary Google Calendar, complete with color-coding and progress tracking.

---

## What can it do?

- [x] **Secure Google Login:** Connects directly to your Google account using standard OAuth2.
- [x] **Instant Syncing:** Add a deadline and a goal, and it instantly appears on your Google Calendar.
- [x] **Satisfying Completions:** Clicking "Done" updates the calendar event title with a `✅ [DONE]` prefix and shifts the calendar event color to a calming Sage Green.
- [x] **Undo Mistakes:** Accidentally completed a goal? One click reverts the title and color back to normal on your calendar.
- [x] **Total Control:** Delete a goal in the app, and it vanishes from your calendar completely.

---

**Frontend**
* HTML5 & CSS3
* Vanilla JavaScript
* Hosted on [Netlify](https://www.netlify.com/)

**Backend**
* [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
* [Googleapis](https://www.npmjs.com/package/googleapis) (Official Google Calendar v3 API)
* Hosted on [Render](https://render.com/)
