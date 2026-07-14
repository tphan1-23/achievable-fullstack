// --- Typewriter Effect ---
document.addEventListener("DOMContentLoaded", () => {
    // Find every element with the class 'typewriter'
    const typewriterElements = document.querySelectorAll('.typewriter');
    
    typewriterElements.forEach(el => {
        const text = el.textContent; // Remember the original text
        el.textContent = '';         // Erase it from the screen initially
        el.classList.add('typing-cursor'); // Add the blinking cursor
        
        let i = 0;
        
        // Wait 600ms for the "flow-up" animation to finish before typing
        setTimeout(() => {
            const typingInterval = setInterval(() => {
                if (i < text.length) {
                    el.textContent += text.charAt(i);
                    i++;
                } else {
                    clearInterval(typingInterval); // Stop when finished!
                }
            }, 75); // 75ms per letter (adjust this number to type faster or slower)
        }, 600); 
    });
});

// Grab elements (Only declared once!)
const goalsGrid = document.getElementById('goals-grid');
const titleInput = document.getElementById('goal-title');
const descInput = document.getElementById('goal-desc');
const addBtn = document.getElementById('add-goal-btn');

// Load existing goals from LocalStorage 
let savedGoals = JSON.parse(localStorage.getItem('userGoals')) || [];

function displayGoals() {
    if (!goalsGrid) return; 
    goalsGrid.innerHTML = ''; 
    
    if (savedGoals.length === 0) {
        // Temporarily turn off the grid so the text can span the full width and center
        goalsGrid.style.display = 'block'; 
        goalsGrid.innerHTML = `<p style="color: #b5b3b3; font-family: 'Exo 2'; text-align: center; margin: 0;">No goals yet. Type one above to get started!</p>`;
        return;
    }

    // Turn the grid back on when there are goals to display!
    goalsGrid.style.display = 'grid';

    savedGoals.forEach((goal, index) => {
        const card = document.createElement('div');
        
        // Add a 'completed' class to the card if it's finished, and animate it!
        card.className = `goal-card flow-up ${goal.completed ? 'completed' : ''}`;
        
        // Only show the deadline text if the user actually set one
        const deadlineHTML = goal.deadline ? `<p class="deadline-text">🗓️ Deadline: ${goal.deadline}</p>` : '';

        // NEW: Check if the goal is syncing. If it failed to sync, stop showing it as syncing!
        const isSyncing = goal.deadline && !goal.eventId && !goal.syncFailed;
        const syncHTML = isSyncing ? `<p style="color: #ffa500; font-size: 0.85rem; margin: 5px 0; font-style: italic;">Syncing with Google...</p>` : '';

        card.innerHTML = `
            <h3>${goal.title}</h3>
            <p>${goal.desc}</p>
            ${deadlineHTML}
            ${syncHTML}
            <div class="card-footer">
                <button class="status-btn" onclick="goalfinished(${index})" ${isSyncing ? 'disabled' : ''}>
                    ${goal.completed ? '✓ Achieved!' : 'Mark Done'}
                </button>
                <button class="delete-btn" onclick="deleteGoal(${index})" ${isSyncing ? 'disabled' : ''}>✕</button>
            </div>
        `;
        goalsGrid.appendChild(card);
    });
}

// Adding a Goal includes deadlines
if (addBtn) {
    addBtn.addEventListener('click', () => {
        const titleText = titleInput.value.trim();
        const descText = descInput.value.trim();
        
        const deadlineInput = document.getElementById('goal-deadline');
        const deadlineText = deadlineInput ? deadlineInput.value : '';

        if (titleText === '' || descText === '') {
            alert('Please fill out both the title and the description!');
            return;
        }

        // Generate a unique identifier for this specific goal
        const tempId = Date.now().toString() + Math.random().toString(36).substring(2, 7);

        const newGoal = { 
            id: tempId,
            title: titleText, 
            desc: descText,
            completed: false,      
            deadline: deadlineText 
        };
        
        savedGoals.push(newGoal);
        localStorage.setItem('userGoals', JSON.stringify(savedGoals));
        displayGoals();

        if (deadlineText) {
            console.log('Creating event on Google Calendar...');
            fetch('http://localhost:3000/create-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: titleText,
                    desc: descText,
                    deadline: deadlineText
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Successfully added to Google Calendar! Event ID:', data.eventId);
                    
                    // Find the EXACT goal using its unique ID and assign the eventId
                    const goalToUpdate = savedGoals.find(g => g.id === tempId);
                    if (goalToUpdate) {
                        goalToUpdate.eventId = data.eventId;
                        localStorage.setItem('userGoals', JSON.stringify(savedGoals));
                        displayGoals(); // Rerender to enable buttons and remove "syncing" state
                    }
                } else {
                    console.error('Failed to add to calendar. Did you connect your account first?');
                    
                    // NEW: Server responded but failed. Mark as offline task.
                    const goalToUpdate = savedGoals.find(g => g.id === tempId);
                    if (goalToUpdate) {
                        goalToUpdate.syncFailed = true;
                        localStorage.setItem('userGoals', JSON.stringify(savedGoals));
                        displayGoals(); 
                    }
                }
            })
            .catch(error => {
                console.error('Error connecting to backend server:', error);
                
                // NEW: Server is offline completely. Mark as offline task.
                const goalToUpdate = savedGoals.find(g => g.id === tempId);
                if (goalToUpdate) {
                    goalToUpdate.syncFailed = true;
                    localStorage.setItem('userGoals', JSON.stringify(savedGoals));
                    displayGoals(); 
                }
            });
        }

        // Clear inputs after adding
        titleInput.value = '';
        descInput.value = '';
        if (deadlineInput) deadlineInput.value = '';
    });
}

// Delete a goal
window.deleteGoal = function(index) {
    const goal = savedGoals[index];
    if (!goal) return;
    
    // If this goal has a Google Calendar event attached, tell the backend to delete it
    if (goal.eventId) {
        console.log('Telling Google Calendar to delete event ID:', goal.eventId);
        
        fetch('http://localhost:3000/delete-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventId: goal.eventId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Event successfully deleted from Google Calendar!');
            } else {
                console.error('Backend failed to delete event:', data.error);
            }
        })
        .catch(error => console.error('Error deleting calendar event:', error));
    } else {
        console.warn('No eventId found for this goal. Deleting locally only.');
    }

    // Remove the goal from your website's local array and refresh the screen
    savedGoals.splice(index, 1); 
    localStorage.setItem('userGoals', JSON.stringify(savedGoals)); 
    displayGoals(); 
};

// Mark a goal as finished or undo it!
window.goalfinished = function(index) {
    const goal = savedGoals[index];
    if (!goal) return;

    // Flips it from false to true, or true to false
    goal.completed = !goal.completed;
    localStorage.setItem('userGoals', JSON.stringify(savedGoals));
    displayGoals();
    
    if (goal.completed) {
        confetti({
            particleCount: 150, 
            spread: 90,        
            origin: { y: 0.5 }, 
            colors: ['#ffced9', '#dfc3ff', '#9ec7ff', '#fdffb4', '#ffffff'] 
        });
    }

    // Check if the goal actually has a calendar event attached to it
    if (goal.eventId) {
        if (goal.completed) {
            // If completed, mark it green in Google Calendar
            console.log('Telling Google Calendar to mark it green. ID:', goal.eventId);
            fetch('http://localhost:3000/complete-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventId: goal.eventId,
                    title: goal.title
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Google Calendar updated to green and checked!');
                }
            })
            .catch(error => console.error('Error updating calendar:', error));

        } else {
            // If unchecked, reset the Google Calendar event to default color
            console.log('Telling Google Calendar to undo completion. ID:', goal.eventId);
            
            fetch('http://localhost:3000/undo-complete-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventId: goal.eventId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Google Calendar event reset back to default!');
                }
            })
            .catch(error => console.error('Error reverting calendar event:', error));
        }
    }
};

// Run on startup
displayGoals();

// Clear All Goals Functionality
const clearAllBtn = document.getElementById('clear-all-btn');
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        const areYouSure = confirm('Are you sure you want to delete ALL goals? This cannot be undone.');
        if (areYouSure) {
            // Loop through all goals and tell Google Calendar to delete them
            savedGoals.forEach(goal => {
                if (goal.eventId) {
                    console.log('Telling Google Calendar to delete event ID:', goal.eventId);
                    fetch('http://localhost:3000/delete-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventId: goal.eventId })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            console.log(`Successfully cleared event ${goal.eventId} from Google Calendar!`);
                        }
                    })
                    .catch(error => console.error('Error deleting calendar event:', error));
                }
            });

            // Wipe the local array clean and refresh the display
            savedGoals = [];
            localStorage.setItem('userGoals', JSON.stringify(savedGoals));
            displayGoals();
        }
    });
}