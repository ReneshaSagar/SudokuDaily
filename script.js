/*
 * SUDOKU DAILY Core Game Logic and UI Enhancements
 *
 * NOTE: This final version removes the Lifetime Solves feature entirely.
 */

// --- Game State Variables ---
let currentGrid = [];     
let fixedCells = [];      
let solutionGrid = [];    
let selectedCell = null;  
let isNotesMode = false;
let timerInterval;
let timeElapsed = 0; 
let isPaused = false;

// Read data from localStorage, defaulting to 0 or empty structures
let streak = parseInt(localStorage.getItem('sudokuStreak')) || 0;
let lastPlayedDate = localStorage.getItem('sudokuLastPlayed') || null;
// Removed: lifetimeSolves variable
let badgesEarned = JSON.parse(localStorage.getItem('sudokuBadges')) || [];


// --- DOM Elements ---
const gridEl = document.getElementById('sudoku-grid');
const pauseBtn = document.getElementById('pause-btn');
const restartTimerBtn = document.getElementById('restart-timer-btn');
const timerEl = document.getElementById('timer');
const padEl = document.getElementById('number-pad');
const newGameBtn = document.getElementById('new-game-btn');
const eraseBtn = document.getElementById('erase-btn');
const notesBtn = document.getElementById('notes-btn');
const checkBtn = document.getElementById('check-btn');
const difficultySelect = document.getElementById('difficulty-select');
const modeToggleBtn = document.getElementById('mode-toggle');
const streakDisplay = document.getElementById('streak-display');
const dailyFactText = document.getElementById('daily-fact-text');
// Removed: lifetimeSolvesDisplay DOM query
const badgesListEl = document.getElementById('badges-list');
const body = document.body;


// --- Daily Fact Data (Remains the same) ---
const dailyFacts = [
    "Your brain uses about 20% of the oxygen and calories you consume, even when you're resting.",
    "Learning new complex skills, like Sudoku, actively promotes the growth of new neural connections.",
    "The maximum number of givens (pre-filled cells) a Sudoku puzzle can have while still lacking a unique solution is 77.",
    "The human brain generates about 12 to 25 watts of power—enough to light a low-watt LED bulb!",
    "It is estimated that there are 6,670,903,752,021,072,936,960 possible completed 9*9 Sudoku grids.",
    "The term 'Latin Square' (the mathematical basis of Sudoku) was first used by Leonard Euler in 1783.",
    "A Sudoku puzzle must have at least 17 givens (pre-filled numbers) to guarantee a unique solution.",
    "Your brain processes information faster than a computer can handle: visual information is processed in only 13 milliseconds.",
];

// --- Puzzle Generation Blueprint (Remains the same) ---
function generateUniquePuzzle(difficulty) {
    const fullSolution1D = [5, 3, 4, 6, 7, 8, 9, 1, 2, 6, 7, 2, 1, 9, 5, 3, 4, 8, 1, 9, 8, 3, 4, 2, 5, 6, 7, 8, 5, 9, 7, 6, 1, 4, 2, 3, 4, 2, 6, 8, 5, 3, 7, 9, 1, 7, 1, 3, 9, 2, 4, 8, 5, 6, 9, 6, 1, 5, 3, 7, 2, 8, 4, 2, 8, 7, 4, 1, 9, 6, 3, 5, 3, 4, 5, 2, 8, 6, 1, 7, 9];
    let startPuzzle1D = [...fullSolution1D];
    
    let cellsToRemove;
    if (difficulty === 'easy') cellsToRemove = 25; 
    else if (difficulty === 'medium') cellsToRemove = 45; 
    else if (difficulty === 'hard') cellsToRemove = 55; 
    else cellsToRemove = 60;

    for (let i = 0; i < cellsToRemove; i++) {
        let index;
        do {
            index = Math.floor(Math.random() * 81);
        } while (startPuzzle1D[index] === 0);
        startPuzzle1D[index] = 0;
    }

    const grid2D = [];
    const solution2D = [];
    for (let i = 0; i < 9; i++) {
        grid2D.push(startPuzzle1D.slice(i * 9, (i + 1) * 9));
        solution2D.push(fullSolution1D.slice(i * 9, (i + 1) * 9));
    }
    
    return { 
        currentGrid: grid2D, 
        solutionGrid: solution2D,
        fixedCells: grid2D.map(row => row.map(cell => cell !== 0))
    };
}


// --- CORE STATS UPDATE FUNCTIONS ---

// Removed: function updateLifetimeSolves()

function updateStreak(solvedToday) {
    const today = getTodayDateString();
    
    if (solvedToday) {
        // CRITICAL FIX: Only update streak logic if the puzzle hasn't been solved TODAY.
        if (lastPlayedDate === today) {
             // Mark as solved, but DO NOT increment streak count.
             return; 
        }

        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];

        if (lastPlayedDate === yesterday) {
            streak = parseInt(streak) + 1;
        } else {
            streak = 1;
        }
        
        lastPlayedDate = today;
        localStorage.setItem('sudokuStreak', streak);
        localStorage.setItem('sudokuLastPlayed', lastPlayedDate);
    } 
    
    streakDisplay.textContent = `${streak} Day${streak !== 1 ? 's' : ''}`;
}

function grantBadge(badgeName, notificationText) {
    if (!badgesEarned.includes(badgeName)) {
        badgesEarned.push(badgeName);
        localStorage.setItem('sudokuBadges', JSON.stringify(badgesEarned));
        
        alert(`⭐ Badge Unlocked! ${notificationText}`);
        renderBadges();
    }
}

function renderBadges() {
    badgesListEl.innerHTML = '';
    if (badgesEarned.length === 0) {
        badgesListEl.innerHTML = '<li>No badges earned yet.</li>';
        return;
    }
    badgesEarned.forEach(badge => {
        const li = document.createElement('li');
        li.textContent = badge;
        badgesListEl.appendChild(li);
    });
}

// --- INITIALIZATION UTILITIES ---

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function displayDailyFact() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const factIndex = dayOfYear % dailyFacts.length;
    dailyFactText.textContent = dailyFacts[factIndex];
}

function formatTime(seconds) {
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
}

// --- TIMER CONTROLS LOGIC (Remains the same) ---

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isPaused = false;
    pauseBtn.textContent = '⏸️ Pause';

    timerInterval = setInterval(() => {
        if (!isPaused) {
            timeElapsed++;
            timerEl.textContent = formatTime(timeElapsed);
        }
    }, 1000);
}

function pauseTimer() {
    isPaused = true;
    pauseBtn.textContent = '▶️ Resume';
}

function resumeTimer() {
    isPaused = false;
    pauseBtn.textContent = '⏸️ Pause';
}

function togglePause() {
    if (isPaused) {
        resumeTimer();
    } else {
        pauseTimer();
    }
}

function resetTimer() {
    timeElapsed = 0;
    timerEl.textContent = formatTime(timeElapsed);
    startTimer();
}

// --- CELL HIGHLIGHTING LOGIC (Remains the same) ---

function removeHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('selected', 'highlight');
    });
}

function applyHighlights(r, c) {
    for (let i = 0; i < 9; i++) {
        const rowCell = gridEl.children[r * 9 + i];
        const colCell = gridEl.children[i * 9 + c];
        
        if (rowCell && rowCell !== selectedCell) rowCell.classList.add('highlight');
        if (colCell && colCell !== selectedCell) colCell.classList.add('highlight');
    }

    const startRow = Math.floor(r / 3) * 3;
    const startCol = Math.floor(c / 3) * 3;

    for (let row = startRow; row < startRow + 3; row++) {
        for (let col = startCol; col < startCol + 3; col++) {
            const blockCell = gridEl.children[row * 9 + col];
            if (blockCell && blockCell !== selectedCell) {
                blockCell.classList.add('highlight');
            }
        }
    }
}

// --- GAME CONTROLS AND UI LOGIC ---

function renderGrid() {
    gridEl.innerHTML = ''; 
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            const value = currentGrid[r][c];
            if (value !== 0) {
                cell.textContent = value;
                if (fixedCells[r][c]) {
                    cell.classList.add('fixed');
                }
            } else {
                // Initialize notes structure for empty cells
                cell.innerHTML = '<div class="notes-container"></div>';
            }
            
            cell.addEventListener('click', selectCell);
            gridEl.appendChild(cell);
        }
    }
    // Render number pad
    padEl.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const button = document.createElement('button');
        button.classList.add('pad-button');
        button.textContent = i;
        button.dataset.value = i;
        button.addEventListener('click', () => handleNumberInput(i));
        padEl.appendChild(button);
    }
}

function selectCell(event) {
    if (isPaused) return; 

    removeHighlights(); 

    selectedCell = event.target;
    selectedCell.classList.add('selected'); 

    const r = parseInt(selectedCell.dataset.row);
    const c = parseInt(selectedCell.dataset.col);
    
    applyHighlights(r, c); 
}

function handleNumberInput(value) {
    if (isPaused || !selectedCell) return; 

    const r = parseInt(selectedCell.dataset.row);
    const c = parseInt(selectedCell.dataset.col);

    if (fixedCells[r][c]) return;

    if (isNotesMode) {
        let notesContainer = selectedCell.querySelector('.notes-container');
        // If it was a number, revert it to notes state
        if (!notesContainer) {
            selectedCell.textContent = '';
            selectedCell.innerHTML = '<div class="notes-container"></div>';
            notesContainer = selectedCell.querySelector('.notes-container');
        }

        const noteElement = notesContainer.querySelector(`[data-note="${value}"]`);

        if (noteElement) {
            // Remove the note
            notesContainer.removeChild(noteElement);
        } else {
            // Add the note
            const newNote = document.createElement('span');
            newNote.dataset.note = value;
            newNote.textContent = value;
            notesContainer.appendChild(newNote);
        }
        currentGrid[r][c] = 0; // A cell with notes is considered empty for solving
    } else {
        // Value input mode
        selectedCell.textContent = value;
        selectedCell.innerHTML = value; // Replace notes with number
        currentGrid[r][c] = value;
        selectedCell.classList.remove('error');
    }
}

function startGame(difficulty) {
    // Reset timer state for new game
    timeElapsed = 0; 
    timerEl.textContent = formatTime(timeElapsed);

    clearInterval(timerInterval);
    removeHighlights(); 
    const puzzle = generateUniquePuzzle(difficulty);
    currentGrid = puzzle.currentGrid;
    solutionGrid = puzzle.solutionGrid;
    fixedCells = puzzle.fixedCells;
    selectedCell = null;
    isNotesMode = false;
    renderGrid();
    startTimer();
    updateStreak(false); // Update streak display only
    
    // CRITICAL FIX: Removed lifetimeSolvesDisplay.textContent = lifetimeSolves;
    renderBadges();
}

function handleErase() {
    if (isPaused || !selectedCell) return;
    const r = parseInt(selectedCell.dataset.row);
    const c = parseInt(selectedCell.dataset.col);

    if (fixedCells[r][c]) return;

    currentGrid[r][c] = 0;
    selectedCell.textContent = '';
    selectedCell.innerHTML = '<div class="notes-container"></div>'; // Revert to notes state
    selectedCell.classList.remove('error');
}

function handleNotesToggle() {
    if (isPaused) return; 
    isNotesMode = !isNotesMode;
    notesBtn.textContent = isNotesMode ? '✅ Notes ON' : '✏️ Notes Mode';
    notesBtn.classList.toggle('primary-btn', isNotesMode);
    notesBtn.classList.toggle('utility-btn', !isNotesMode);
}

// --- NEW INTELLIGENT HINT LOGIC (Remains the same) ---
function provideHint() {
    if (isPaused) return; 
    
    // Find the first empty cell
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (currentGrid[r][c] === 0) {
                const correctValue = solutionGrid[r][c];
                
                // 1. Fill the cell
                currentGrid[r][c] = correctValue;
                
                // 2. Update the visual cell
                const cellEl = gridEl.children[r * 9 + c];
                cellEl.textContent = correctValue;
                cellEl.classList.remove('error');
                
                // 3. Notify the user
                alert(`💡 Hint: The correct number for cell (${r + 1}, ${c + 1}) is ${correctValue}.`);
                return;
            }
        }
    }
    alert("The puzzle is already complete! You don't need a hint.");
}


function checkSolution() {
    if (isPaused) return; 
    let errors = 0;
    let complete = true;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cellEl = gridEl.children[r * 9 + c];
            const value = currentGrid[r][c];
            cellEl.classList.remove('error'); 

            if (value === 0) {
                complete = false;
            } else if (value !== solutionGrid[r][c]) {
                cellEl.classList.add('error');
                errors++;
            } 
        }
    }

    if (errors === 0 && complete) {
        clearInterval(timerInterval);
        isPaused = true; 
        
        // ⭐ SUCCESS ACTIONS! ⭐
        // CRITICAL FIX: The logic here is now sound to handle the daily streak correctly.
        updateStreak(true); 
        // Removed: updateLifetimeSolves();
        grantBadge("Solver Starter", "You've solved your very first puzzle!"); 
        
        alert('🏆 Grandmaster! Puzzle Solved Perfectly. Namaste!');
        
    } else if (errors > 0) {
        alert(`❌ Reviewing Progress: You have ${errors} error(s) on the board (marked in red). Fix them to proceed!`);
    } else if (!complete) {
        alert('Puzzle Incomplete. You need to fill all cells to check the solution.');
    }
}


// --- Mode Toggle Logic (Remains the same) ---
function toggleDarkMode() {
    body.classList.toggle('light-mode');
    if (body.classList.contains('light-mode')) {
        modeToggleBtn.textContent = '🌙 Dark Mode';
        localStorage.setItem('mode', 'light');
    } else {
        body.classList.remove('light-mode');
        modeToggleBtn.textContent = '☀️ Light Mode';
    }
}

function loadModePreference() {
    if (localStorage.getItem('mode') === 'light') {
        body.classList.add('light-mode');
        modeToggleBtn.textContent = '🌙 Dark Mode';
    } else {
        body.classList.remove('light-mode');
        body.classList.remove('light-mode'); // Double check removal
        modeToggleBtn.textContent = '☀️ Light Mode';
    }
}


// --- Event Listeners and Initial Load ---
modeToggleBtn.addEventListener('click', toggleDarkMode);
newGameBtn.addEventListener('click', () => {
    startGame(difficultySelect.value);
});

eraseBtn.addEventListener('click', handleErase);
notesBtn.addEventListener('click', handleNotesToggle);
checkBtn.addEventListener('click', checkSolution);
document.getElementById('hint-btn').addEventListener('click', provideHint);

pauseBtn.addEventListener('click', togglePause);
restartTimerBtn.addEventListener('click', resetTimer);


// Load the preferred mode and start the first game
loadModePreference();
displayDailyFact();
startGame(difficultySelect.value);

