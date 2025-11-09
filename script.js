/*
 * SUDOKU DAILY Core Game Logic and UI Enhancements
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
let lifetimeSolves = parseInt(localStorage.getItem('sudokuLifetimeSolves')) || 0;
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
const lifetimeSolvesDisplay = document.querySelector('.stat-box:nth-child(3) .large-text'); 
const badgesListEl = document.getElementById('badges-list');
const body = document.body;


// --- Daily Fact Data (Remains the same) ---
const dailyFacts = [
    "Your brain uses about 20% of the oxygen and calories you consume, even when you're resting.",
    "Learning new complex skills, like Sudoku, actively promotes the growth of new neural connections.",
    "The maximum number of givens (pre-filled cells) a Sudoku puzzle can have while still lacking a unique solution is 77.",
    "The human brain generates about 12 to 25 watts of power—enough to light a low-watt LED bulb!",
    "It is estimated that there are 6,670,903,752,021,072,936,960 possible completed $9 \times 9$ Sudoku grids.",
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

function updateLifetimeSolves() {
    lifetimeSolves += 1;
    localStorage.setItem('sudokuLifetimeSolves', lifetimeSolves);
    lifetimeSolvesDisplay.textContent = lifetimeSolves;
}

function updateStreak(solvedToday) {
    const today = getTodayDateString();
    
    if (solvedToday) {
        if (lastPlayedDate === today) return;

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
        
        // Show notification and update UI
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

// --- TIMER CONTROLS LOGIC ---

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

// --- CELL HIGHLIGHTING LOGIC ---

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
        const currentValue = selectedCell.textContent.trim();
        const newValue = value.toString();
        
        if (currentValue.includes(newValue)) {
            selectedCell.textContent = currentValue.replace(new RegExp('\\b' + newValue + '\\b', 'g'), '').trim();
        } else {
            selectedCell.textContent = (currentValue + ' ' + newValue).trim();
        }
        currentGrid[r][c] = 0; 

    } else {
        currentGrid[r][c] = value;
        selectedCell.textContent = value;
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
    
    // Update dashboard elements on game start
    lifetimeSolvesDisplay.textContent = lifetimeSolves;
    renderBadges();
}

function handleErase() {
    if (isPaused || !selectedCell) return;
    const r = parseInt(selectedCell.dataset.row);
    const c = parseInt(selectedCell.dataset.col);

    if (fixedCells[r][c]) return;

    currentGrid[r][c] = 0;
    selectedCell.textContent = '';
    selectedCell.classList.remove('error');
}

function handleNotesToggle() {
    // FIX: This function should only check for pause, not if the event listener is working.
    if (isPaused) return; 
    isNotesMode = !isNotesMode;
    notesBtn.textContent = isNotesMode ? '✅ Notes ON' : '✏️ Notes Mode';
    notesBtn.classList.toggle('primary-btn', isNotesMode);
    notesBtn.classList.toggle('utility-btn', !isNotesMode);
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
        updateStreak(true); 
        updateLifetimeSolves(); 
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
        modeToggleBtn.textContent = '☀️ Light Mode';
        localStorage.setItem('mode', 'dark');
    }
}

function loadModePreference() {
    if (localStorage.getItem('mode') === 'light') {
        body.classList.add('light-mode');
        modeToggleBtn.textContent = '🌙 Dark Mode';
    } else {
        body.classList.remove('light-mode');
        modeToggleBtn.textContent = '☀️ Light Mode';
    }
}


// --- Event Listeners and Initial Load ---
// FINAL CHECK: Ensure all elements are linked here!

// Standard Controls
modeToggleBtn.addEventListener('click', toggleDarkMode);
newGameBtn.addEventListener('click', () => {
    startGame(difficultySelect.value);
});

// Game Controls
eraseBtn.addEventListener('click', handleErase);
notesBtn.addEventListener('click', handleNotesToggle); // Notes mode should now work
checkBtn.addEventListener('click', checkSolution);      // Check button should now work
document.getElementById('hint-btn').addEventListener('click', () => {
    alert('Hint: Focus on a 3x3 box that is nearly full. This will give you the easiest number to place!');
});

// Timer Controls
pauseBtn.addEventListener('click', togglePause);
restartTimerBtn.addEventListener('click', resetTimer);


// Load the preferred mode and start the first game
loadModePreference();
displayDailyFact();
startGame(difficultySelect.value);
