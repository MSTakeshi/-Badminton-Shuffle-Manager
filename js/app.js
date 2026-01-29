/**
 * Main Application Logic
 */

const store = new Store();
let currentClubId = null;

// DOM Elements
const app = document.getElementById('app');
const homeView = document.getElementById('home-view');
const clubDetailView = document.getElementById('club-detail-view');
const clubListEl = document.getElementById('club-list');

// Modals
const modalAddClub = document.getElementById('modal-add-club');
const modalAddPlayer = document.getElementById('modal-add-player');

// Buttons - Home
const btnAddClubCard = document.getElementById('btn-add-club');
const btnCancelAddClub = document.getElementById('btn-cancel-add-club');
const btnSaveClub = document.getElementById('btn-save-club');
const inputNewClubName = document.getElementById('new-club-name');

// Buttons - Detail
const btnBackHome = document.getElementById('btn-back-home');
const detailClubName = document.getElementById('detail-club-name');
const btnAddPlayerModal = document.getElementById('btn-add-player-modal');
const btnCancelAddPlayer = document.getElementById('btn-cancel-add-player');
const btnSavePlayer = document.getElementById('btn-save-player');
const inputNewPlayerName = document.getElementById('new-player-name');
const inputNewPlayerLevel = document.getElementById('new-player-level');
const inputPlayerSearch = document.getElementById('player-search');

// Session Elements
const inputSessionDate = document.getElementById('session-date');
const inputSessionCourts = document.getElementById('session-courts');
const selectSessionMode = document.getElementById('session-mode');
const btnShuffle = document.getElementById('btn-shuffle');
const courtsContainer = document.getElementById('courts-container');
const waitingListContainer = document.getElementById('waiting-list-container');
const waitingListEl = document.getElementById('waiting-list');
const elParticipatingCount = document.getElementById('participating-count');
const elWaitingCount = document.getElementById('waiting-count');

// Timer Elements
const elTimerMinutes = document.getElementById('timer-minutes');
const elTimerSeconds = document.getElementById('timer-seconds');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const btnTimerReset = document.getElementById('btn-timer-reset');
const inputTimerDuration = document.getElementById('timer-duration');

// Timer State
let timerInterval = null;
let timerTimeLeft = 15 * 60; // seconds
let isTimerRunning = false;

// Initialization
function init() {
    renderClubList();
    setupEventListeners();

    // Set default date to today
    inputSessionDate.valueAsDate = new Date();
}

// --- Home View Logic ---

function renderClubList() {
    // Clear existing club cards (except the "Add" button)
    const existingCards = document.querySelectorAll('.club-card:not(.add-club-card)');
    existingCards.forEach(card => card.remove());

    const clubs = store.getClubs();

    // Sort by last played (desc) or created (desc)
    clubs.sort((a, b) => {
        const dateA = a.lastPlayedAt || a.createdAt;
        const dateB = b.lastPlayedAt || b.createdAt;
        return new Date(dateB) - new Date(dateA);
    });

    clubs.forEach(club => {
        const card = createClubCard(club);
        // Insert before the "Add" button
        clubListEl.insertBefore(card, btnAddClubCard);
    });
}

function createClubCard(club) {
    const div = document.createElement('div');
    div.className = 'club-card';
    div.dataset.id = club.id;

    const lastPlayed = club.lastPlayedAt
        ? new Date(club.lastPlayedAt).toLocaleDateString()
        : '未プレイ';

    div.innerHTML = `
        <div>
            <h3>${escapeHtml(club.name)}</h3>
            <div class="club-info">
                登録メンバー: ${club.players.length}名
            </div>
        </div>
        <div class="club-stats">
            <span>最終プレイ: ${lastPlayed}</span>
            <span>→</span>
        </div>
    `;

    div.addEventListener('click', () => {
        openClubDetail(club.id);
    });

    return div;
}

function saveNewClub() {
    const name = inputNewClubName.value.trim();
    if (!name) {
        alert('クラブ名を入力してください');
        return;
    }

    const newClub = new Club(name);
    store.addClub(newClub);

    renderClubList();
    modalAddClub.classList.add('hidden');
}

// --- Club Detail Logic ---

function openClubDetail(clubId) {
    currentClubId = clubId;
    const club = store.getClub(clubId);
    if (!club) return;

    detailClubName.textContent = club.name;

    // Switch Views
    homeView.classList.add('hidden');
    clubDetailView.classList.remove('hidden');

    // Reset to Players tab
    switchTab('players');
    renderPlayerList();
    updateSessionStats();
}

function closeClubDetail() {
    currentClubId = null;
    homeView.classList.remove('hidden');
    clubDetailView.classList.add('hidden');
    renderClubList(); // Refresh list to update counts/dates
}

function switchTab(tabName) {
    // Update Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update Panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'session') {
        updateSessionStats();
    }
}

// --- Player Management ---

function renderPlayerList() {
    const club = store.getClub(currentClubId);
    if (!club) return;

    const listEl = document.getElementById('players-list');
    listEl.innerHTML = '';

    const searchTerm = inputPlayerSearch.value.toLowerCase();

    const filteredPlayers = club.players.filter(p =>
        p.name.toLowerCase().includes(searchTerm)
    );

    if (filteredPlayers.length === 0) {
        listEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">メンバーがいません</div>';
        return;
    }

    filteredPlayers.forEach(player => {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
            <div class="col-check">
                <input type="checkbox" ${player.isSelected ? 'checked' : ''} data-id="${player.id}">
            </div>
            <div class="col-name">${escapeHtml(player.name)}${player.waitingCount > 0 ? ` (${player.waitingCount})` : ''}</div>
            <div class="col-level">
                <span class="player-level-badge">Lv.${player.level}</span>
            </div>
            <div class="col-actions">
                <button class="btn-danger-icon" type="button" data-action="delete" data-id="${player.id}">🗑️</button>
            </div>
        `;

        // Checkbox Event
        const checkbox = row.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            togglePlayerSelection(player.id, e.target.checked);
        });

        // Delete Event
        const deleteBtn = row.querySelector('button[data-action="delete"]');
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            deletePlayer(player.id);
        });

        listEl.appendChild(row);
    });
}

function togglePlayerSelection(playerId, isSelected) {
    const club = store.getClub(currentClubId);
    const player = club.players.find(p => p.id === playerId);
    if (player) {
        player.isSelected = isSelected;
        store.updateClub(club);
        updateSessionStats();
    }
}

function saveNewPlayer() {
    const name = inputNewPlayerName.value.trim();
    const level = parseInt(inputNewPlayerLevel.value);

    if (!name) {
        alert('名前を入力してください');
        return;
    }

    const club = store.getClub(currentClubId);
    const newPlayer = new Player(name, level);

    // Default to selected when added
    newPlayer.isSelected = true;

    club.players.push(newPlayer);
    store.updateClub(club);

    renderPlayerList();
    modalAddPlayer.classList.add('hidden');
    updateSessionStats();
}

function deletePlayer(playerId) {
    // if (!confirm('このメンバーを削除しますか？')) return;

    const club = store.getClub(currentClubId);
    club.players = club.players.filter(p => p.id !== playerId);
    store.updateClub(club);
    renderPlayerList();
    updateSessionStats();
}

// --- Session Logic ---

function updateSessionStats() {
    const club = store.getClub(currentClubId);
    if (!club) return;

    const participating = club.players.filter(p => p.isSelected).length;
    elParticipatingCount.textContent = `Participating: ${participating}`;

    // Waiting count depends on last shuffle, but initially 0
    // We can update this after shuffle
}

function shuffleMatches() {
    const club = store.getClub(currentClubId);
    if (!club) return;

    const mode = selectSessionMode.value;
    const courtCount = parseInt(inputSessionCourts.value);
    const playersPerCourt = mode === 'doubles' ? 4 : 2;

    // Get participating players
    let availablePlayers = club.players.filter(p => p.isSelected);

    // 1. Shuffle players randomly first (to ensure random selection among ties)
    for (let i = availablePlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availablePlayers[i], availablePlayers[j]] = [availablePlayers[j], availablePlayers[i]];
    }

    // 2. Sort by waitingCount (Descending)
    // Players with MORE waiting counts should play (be at the start of array)
    // Players with FEWER waiting counts should wait (be at the end of array)
    availablePlayers.sort((a, b) => {
        return (b.waitingCount || 0) - (a.waitingCount || 0);
    });

    // Assign to courts
    const matches = [];
    const waiting = [];

    for (let i = 0; i < courtCount; i++) {
        if (availablePlayers.length >= playersPerCourt) {
            let courtPlayers = availablePlayers.splice(0, playersPerCourt);

            // Optimize pairing for Doubles
            if (mode === 'doubles') {
                courtPlayers = optimizePairing(courtPlayers);
            }

            matches.push({
                courtId: i + 1,
                players: courtPlayers
            });
        } else {
            // Not enough players for this court
            break;
        }
    }

    // Remaining players go to waiting list
    waiting.push(...availablePlayers);

    // Increment waiting count for waiting players
    waiting.forEach(p => {
        p.waitingCount = (p.waitingCount || 0) + 1;
    });

    // Save changes
    store.updateClub(club);

    renderCourts(matches, mode);
    renderWaitingList(waiting);

    elWaitingCount.textContent = `Waiting: ${waiting.length}`;
}

/**
 * Optimizes the pairing of 4 players to minimize level difference between teams.
 * @param {Array} players - Array of 4 Player objects
 * @returns {Array} - Reordered array [Team1A, Team1B, Team2A, Team2B]
 */
function optimizePairing(players) {
    // Combinations:
    // 1. (0,1) vs (2,3)
    // 2. (0,2) vs (1,3)
    // 3. (0,3) vs (1,2)

    const combinations = [
        { indices: [0, 1, 2, 3], diff: Math.abs((players[0].level + players[1].level) - (players[2].level + players[3].level)) },
        { indices: [0, 2, 1, 3], diff: Math.abs((players[0].level + players[2].level) - (players[1].level + players[3].level)) },
        { indices: [0, 3, 1, 2], diff: Math.abs((players[0].level + players[3].level) - (players[1].level + players[2].level)) }
    ];

    // Sort by diff (ascending)
    combinations.sort((a, b) => a.diff - b.diff);

    // Pick the best combination
    const best = combinations[0];

    return [
        players[best.indices[0]],
        players[best.indices[1]],
        players[best.indices[2]],
        players[best.indices[3]]
    ];
}

function renderCourts(matches, mode) {
    courtsContainer.innerHTML = '';

    if (matches.length === 0) {
        courtsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">マッチがありません。参加人数を確認してください。</div>';
        return;
    }

    matches.forEach(match => {
        const div = document.createElement('div');
        div.className = 'court-card';

        let teamAHtml = '';
        let teamBHtml = '';

        if (mode === 'doubles') {
            teamAHtml = `
                <div class="team-name">${escapeHtml(match.players[0].name)}${match.players[0].waitingCount > 0 ? ` (${match.players[0].waitingCount})` : ''}</div>
                <div class="team-name">${escapeHtml(match.players[1].name)}${match.players[1].waitingCount > 0 ? ` (${match.players[1].waitingCount})` : ''}</div>
            `;
            teamBHtml = `
                <div class="team-name">${escapeHtml(match.players[2].name)}${match.players[2].waitingCount > 0 ? ` (${match.players[2].waitingCount})` : ''}</div>
                <div class="team-name">${escapeHtml(match.players[3].name)}${match.players[3].waitingCount > 0 ? ` (${match.players[3].waitingCount})` : ''}</div>
            `;
        } else {
            teamAHtml = `<div class="team-name">${escapeHtml(match.players[0].name)}${match.players[0].waitingCount > 0 ? ` (${match.players[0].waitingCount})` : ''}</div>`;
            teamBHtml = `<div class="team-name">${escapeHtml(match.players[1].name)}${match.players[1].waitingCount > 0 ? ` (${match.players[1].waitingCount})` : ''}</div>`;
        }

        div.innerHTML = `
            <div class="court-header">
                <span>Court ${match.courtId}</span>
            </div>
            <div class="court-matchup">
                <div class="team team-a">
                    ${teamAHtml}
                </div>
                <div class="vs-divider">VS</div>
                <div class="team team-b">
                    ${teamBHtml}
                </div>
            </div>
        `;
        courtsContainer.appendChild(div);
    });
}

function renderWaitingList(players) {
    waitingListEl.innerHTML = '';

    if (players.length > 0) {
        waitingListContainer.classList.remove('hidden');
        players.forEach(p => {
            const span = document.createElement('span');
            span.className = 'waiting-player';
            span.textContent = `${p.name}${p.waitingCount > 0 ? ` (${p.waitingCount})` : ''}`;
            waitingListEl.appendChild(span);
        });
    } else {
        waitingListContainer.classList.add('hidden');
    }
}

// --- Timer Logic ---

function updateTimerDisplay() {
    const minutes = Math.floor(timerTimeLeft / 60);
    const seconds = timerTimeLeft % 60;

    elTimerMinutes.textContent = minutes.toString().padStart(2, '0');
    elTimerSeconds.textContent = seconds.toString().padStart(2, '0');
}

function toggleTimer() {
    if (isTimerRunning) {
        // Pause
        clearInterval(timerInterval);
        isTimerRunning = false;
        btnTimerToggle.textContent = 'スタート';
        btnTimerToggle.classList.remove('btn-danger');
        btnTimerToggle.classList.add('btn-secondary');
    } else {
        // Start
        if (timerTimeLeft <= 0) {
            resetTimer();
        }

        isTimerRunning = true;
        btnTimerToggle.textContent = '一時停止';
        btnTimerToggle.classList.remove('btn-secondary');
        btnTimerToggle.classList.add('btn-danger');

        timerInterval = setInterval(() => {
            timerTimeLeft--;
            updateTimerDisplay();

            if (timerTimeLeft <= 0) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                btnTimerToggle.textContent = 'スタート';
                btnTimerToggle.classList.remove('btn-danger');
                btnTimerToggle.classList.add('btn-secondary');
                playTimeUpVoice();
            }
        }, 1000);
    }
}

function playTimeUpVoice() {
    if (!('speechSynthesis' in window)) {
        alert('ラストサーブ');
        return;
    }

    const utter = new SpeechSynthesisUtterance('ラストサーブ。ラストサーブです。');
    utter.lang = 'ja-JP';
    utter.volume = 1.0; // Max volume
    utter.rate = 0.9;   // Slightly slower
    utter.pitch = 1.2;  // Slightly higher pitch

    // Try to find a Japanese female voice
    const voices = window.speechSynthesis.getVoices();
    const jpVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google') && v.name.includes('Female')) ||
        voices.find(v => v.lang === 'ja-JP');

    if (jpVoice) {
        utter.voice = jpVoice;
    }

    window.speechSynthesis.speak(utter);
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;

    const duration = parseInt(inputTimerDuration.value) || 15;
    timerTimeLeft = duration * 60;

    updateTimerDisplay();

    btnTimerToggle.textContent = 'スタート';
    btnTimerToggle.classList.remove('btn-danger');
    btnTimerToggle.classList.add('btn-secondary');
}

// --- Event Listeners ---

function setupEventListeners() {
    // Home: Add Club
    btnAddClubCard.addEventListener('click', () => {
        modalAddClub.classList.remove('hidden');
        inputNewClubName.value = '';
        inputNewClubName.focus();
    });
    btnCancelAddClub.addEventListener('click', () => modalAddClub.classList.add('hidden'));
    btnSaveClub.addEventListener('click', saveNewClub);
    inputNewClubName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveNewClub();
    });

    // Detail: Navigation
    btnBackHome.addEventListener('click', closeClubDetail);

    // Detail: Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Detail: Add Player
    btnAddPlayerModal.addEventListener('click', () => {
        modalAddPlayer.classList.remove('hidden');
        inputNewPlayerName.value = '';
        inputNewPlayerName.focus();
    });
    btnCancelAddPlayer.addEventListener('click', () => modalAddPlayer.classList.add('hidden'));
    btnSavePlayer.addEventListener('click', saveNewPlayer);
    inputNewPlayerName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveNewPlayer();
    });

    // Detail: Search
    inputPlayerSearch.addEventListener('input', renderPlayerList);

    // Session: Shuffle
    btnShuffle.addEventListener('click', shuffleMatches);

    // Session: Timer
    btnTimerToggle.addEventListener('click', toggleTimer);
    btnTimerReset.addEventListener('click', resetTimer);
    inputTimerDuration.addEventListener('change', () => {
        if (!isTimerRunning) resetTimer();
    });

    // Close Modals on Outside Click
    window.addEventListener('click', (e) => {
        if (e.target === modalAddClub) modalAddClub.classList.add('hidden');
        if (e.target === modalAddPlayer) modalAddPlayer.classList.add('hidden');
    });
}

// Utility
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
