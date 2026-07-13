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
        
        // Add a 'completed' class to the card if it's finished
        card.className = `goal-card ${goal.completed ? 'completed' : ''}`;
        
        // Only show the deadline text if the user actually set one
        const deadlineHTML = goal.deadline ? `<p class="deadline-text">🗓️ Deadline: ${goal.deadline}</p>` : '';

        card.innerHTML = `
            <h3>${goal.title}</h3>
            <p>${goal.desc}</p>
            ${deadlineHTML}
            <div class="card-footer">
                <button class="status-btn" onclick="goalfinished(${index})">
                    ${goal.completed ? '✓ Achieved!' : 'Mark Done'}
                </button>
                <button class="delete-btn" onclick="deleteGoal(${index})">✕</button>
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

        const newGoal = { 
            title: titleText, 
            desc: descText,
            completed: false,      
            deadline: deadlineText 
        };
        
        savedGoals.push(newGoal);
        localStorage.setItem('userGoals', JSON.stringify(savedGoals));
        displayGoals();

        if (deadlineText) {
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
                    console.log('🎉 Successfully added to Google Calendar!');
                } else {
                    console.error('Failed to add to calendar. Did you connect your account first?');
                }
            })
            .catch(error => {
                console.error('Error connecting to backend server:', error);
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
    savedGoals.splice(index, 1); 
    localStorage.setItem('userGoals', JSON.stringify(savedGoals)); 
    displayGoals(); 
};

// Mark a goal as finished!
window.goalfinished = function(index) {
    // Flips it from false to true, or true to false
    savedGoals[index].completed = !savedGoals[index].completed;
    localStorage.setItem('userGoals', JSON.stringify(savedGoals));
    displayGoals();
};

// Run on startup
displayGoals();