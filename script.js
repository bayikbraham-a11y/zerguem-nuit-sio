// Variables globales du jeu
let gameState = {
    players: [],
    currentPlayerIndex: 0,
    scores: {},
    isPaused: false,
    gamePhase: 1,
    gameTime: 45,
    timeLeft: 45,
    enemies: [],
    enemySpeed: 2,
    enemySpawnRate: 1000,
    lastSpawnTime: 0,
    shotsFired: 0,
    hits: 0,
    gameInterval: null,
    transitionInterval: null,
    canvas: null,
    ctx: null,
    mouseX: 0,
    mouseY: 0
};

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const playerCountInput = document.getElementById('player-count');
    const decreaseBtn = document.getElementById('decrease-count');
    const increaseBtn = document.getElementById('increase-count');
    const playerNamesContainer = document.getElementById('player-names-container');
    const startGameBtn = document.getElementById('start-game');
    const showHelpBtn = document.getElementById('show-help');
    const closeHelpBtn = document.getElementById('close-help');
    const helpModal = document.getElementById('help-modal');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const backHomeBtn = document.getElementById('back-home-btn');
    
    // Initialisation du canvas
    gameState.canvas = document.getElementById('game-canvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // Cacher le curseur par défaut dans la zone de jeu
    const gameArea = document.querySelector('.game-area');
    gameArea.style.cursor = 'none';
    
    // Redimensionner le canvas
    function resizeCanvas() {
        const container = document.getElementById('game-canvas-container');
        gameState.canvas.width = container.clientWidth;
        gameState.canvas.height = container.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Gestion du nombre de joueurs
    decreaseBtn.addEventListener('click', () => {
        let value = parseInt(playerCountInput.value);
        if (value > 1) {
            playerCountInput.value = value - 1;
            updatePlayerNameInputs();
        }
    });
    
    increaseBtn.addEventListener('click', () => {
        let value = parseInt(playerCountInput.value);
        if (value < 10) {
            playerCountInput.value = value + 1;
            updatePlayerNameInputs();
        }
    });
    
    playerCountInput.addEventListener('change', function() {
        let value = parseInt(this.value);
        if (value < 1) this.value = 1;
        if (value > 10) this.value = 10;
        updatePlayerNameInputs();
    });
    
    // Mise à jour des champs de noms
    function updatePlayerNameInputs() {
        const count = parseInt(playerCountInput.value);
        playerNamesContainer.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'player-name-input';
            div.innerHTML = `
                <label for="player-name-${i}">Joueur ${i + 1}:</label>
                <input type="text" id="player-name-${i}" placeholder="Nom du joueur ${i + 1}" value="Joueur ${i + 1}">
            `;
            playerNamesContainer.appendChild(div);
        }
    }
    
    // Initialiser les champs de noms
    updatePlayerNameInputs();
    
    // Démarrer le jeu
    startGameBtn.addEventListener('click', function() {
        const playerCount = parseInt(playerCountInput.value);
        gameState.players = [];
        gameState.scores = {};
        
        // Récupérer les noms des joueurs
        for (let i = 0; i < playerCount; i++) {
            const input = document.getElementById(`player-name-${i}`);
            const name = input.value.trim() || `Joueur ${i + 1}`;
            gameState.players.push(name);
            gameState.scores[name] = {
                score: 0,
                hits: 0,
                shots: 0,
                accuracy: 0
            };
        }
        
        // Passer à l'écran de jeu
        switchScreen('game-screen');
        startPlayerTurn();
    });
    
    // Gestion des écrans
    function switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
        
        // Redimensionner le canvas quand on change d'écran
        if (screenId === 'game-screen') {
            setTimeout(resizeCanvas, 100);
            // Cacher le curseur dans la zone de jeu
            document.querySelector('.game-area').style.cursor = 'none';
        } else {
            // Réafficher le curseur normal
            document.querySelector('.game-area').style.cursor = 'default';
        }
    }
    
    // Démarrer le tour d'un joueur
    function startPlayerTurn() {
        const playerName = gameState.players[gameState.currentPlayerIndex];
        document.getElementById('current-player-name').textContent = playerName;
        document.getElementById('current-score').textContent = '0';
        
        // Réinitialiser les statistiques
        gameState.shotsFired = 0;
        gameState.hits = 0;
        gameState.timeLeft = gameState.gameTime;
        gameState.gamePhase = 1;
        gameState.enemies = [];
        gameState.enemySpeed = 2;
        gameState.enemySpawnRate = 1000;
        gameState.lastSpawnTime = Date.now();
        
        // Mettre à jour l'interface
        updateTimerDisplay();
        updatePhaseIndicator();
        
        // Démarrer le jeu
        gameState.isPaused = false;
        pauseBtn.classList.remove('hidden');
        resumeBtn.classList.add('hidden');
        
        // Démarrer la boucle de jeu
        if (gameState.gameInterval) clearInterval(gameState.gameInterval);
        gameState.gameInterval = setInterval(gameLoop, 1000 / 60);
        
        // Démarrer le minuteur
        startGameTimer();
        
        // Forcer un premier rendu
        gameLoop();
    }
    
    // Boucle de jeu principale
    function gameLoop() {
        if (gameState.isPaused) return;
        
        // Effacer le canvas
        gameState.ctx.fillStyle = 'rgba(0, 10, 30, 0.2)';
        gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
        
        // Mettre à jour et dessiner les ennemis
        updateEnemies();
        drawEnemies();
        
        // Faire apparaître de nouveaux ennemis
        spawnEnemies();
        
        // Gérer les phases de jeu
        handleGamePhases();
        
        // Dessiner le viseur laser (dans le canvas)
        drawLaserSight();
    }
    
    // Dessiner le viseur laser dans le canvas
    function drawLaserSight() {
        const ctx = gameState.ctx;
        
        // Dessiner le réticule (crosshair)
        const crosshairSize = 20;
        const lineWidth = 3;
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = lineWidth;
        
        // Ligne horizontale
        ctx.beginPath();
        ctx.moveTo(gameState.mouseX - crosshairSize, gameState.mouseY);
        ctx.lineTo(gameState.mouseX + crosshairSize, gameState.mouseY);
        ctx.stroke();
        
        // Ligne verticale
        ctx.beginPath();
        ctx.moveTo(gameState.mouseX, gameState.mouseY - crosshairSize);
        ctx.lineTo(gameState.mouseX, gameState.mouseY + crosshairSize);
        ctx.stroke();
        
        // Cercle intérieur
        ctx.beginPath();
        ctx.arc(gameState.mouseX, gameState.mouseY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000';
        ctx.fill();
        
        // Point central
        ctx.beginPath();
        ctx.arc(gameState.mouseX, gameState.mouseY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Effet de lueur
        ctx.beginPath();
        ctx.arc(gameState.mouseX, gameState.mouseY, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Gérer les phases de jeu
    function handleGamePhases() {
        const timeElapsed = gameState.gameTime - gameState.timeLeft;
        
        if (timeElapsed >= 15 && timeElapsed < 30 && gameState.gamePhase === 1) {
            // Phase 2: Augmenter la vitesse
            gameState.gamePhase = 2;
            gameState.enemySpeed = 3.5;
            showEvolutionMessage("Les ennemis accélèrent!");
            updatePhaseIndicator();
            playPhaseChangeSound();
        } else if (timeElapsed >= 30 && gameState.gamePhase === 2) {
            // Phase 3: Deux ennemis à la fois
            gameState.gamePhase = 3;
            gameState.enemySpawnRate = 500;
            showEvolutionMessage("Deux ennemis à la fois!");
            updatePhaseIndicator();
            playPhaseChangeSound();
        }
    }
    
    // Mettre à jour l'indicateur de phase
    function updatePhaseIndicator() {
        document.querySelectorAll('.phase').forEach(phase => {
            phase.classList.remove('active');
        });
        
        document.querySelector(`.phase${gameState.gamePhase}`).classList.add('active');
    }
    
    // Afficher un message d'évolution
    function showEvolutionMessage(text) {
        const evolutionDiv = document.getElementById('enemy-evolution');
        document.getElementById('evolution-text').textContent = text;
        evolutionDiv.classList.remove('hidden');
        
        setTimeout(() => {
            evolutionDiv.classList.add('hidden');
        }, 3000);
    }
    
    // Faire apparaître des ennemis
    function spawnEnemies() {
        const now = Date.now();
        if (now - gameState.lastSpawnTime > gameState.enemySpawnRate) {
            const enemyCount = gameState.gamePhase === 3 ? 2 : 1;
            
            for (let i = 0; i < enemyCount; i++) {
                const enemyType = Math.floor(Math.random() * 3);
                let type;
                switch(enemyType) {
                    case 0: type = 'circle'; break;
                    case 1: type = 'triangle'; break;
                    default: type = 'rectangle';
                }
                
                const enemy = {
                    x: Math.random() * (gameState.canvas.width - 60) + 30,
                    y: Math.random() * (gameState.canvas.height - 60) + 30,
                    size: 15 + Math.random() * 15,
                    vx: (Math.random() - 0.5) * gameState.enemySpeed * 2,
                    vy: (Math.random() - 0.5) * gameState.enemySpeed * 2,
                    color: gameState.gamePhase === 1 ? '#ff4444' : 
                          (gameState.gamePhase === 2 ? '#ff8844' : '#ff4444'),
                    type: type,
                    isSpecial: Math.random() > 0.7,
                    exploding: false,
                    explosionProgress: 0
                };
                
                if (enemy.isSpecial) {
                    enemy.color = '#ff00ff';
                    enemy.size *= 1.3;
                }
                
                gameState.enemies.push(enemy);
            }
            
            gameState.lastSpawnTime = now;
        }
    }
    
    // Mettre à jour les ennemis
    function updateEnemies() {
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            
            if (enemy.exploding) {
                // Mettre à jour l'animation d'explosion
                enemy.explosionProgress += 0.1;
                if (enemy.explosionProgress >= 1) {
                    gameState.enemies.splice(i, 1);
                }
                continue;
            }
            
            // Déplacer l'ennemi
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            
            // Rebondir sur les bords
            if (enemy.x <= enemy.size || enemy.x >= gameState.canvas.width - enemy.size) {
                enemy.vx *= -1;
                enemy.x = Math.max(enemy.size, Math.min(gameState.canvas.width - enemy.size, enemy.x));
            }
            if (enemy.y <= enemy.size || enemy.y >= gameState.canvas.height - enemy.size) {
                enemy.vy *= -1;
                enemy.y = Math.max(enemy.size, Math.min(gameState.canvas.height - enemy.size, enemy.y));
            }
        }
    }
    
    // Dessiner les ennemis
    function drawEnemies() {
        gameState.enemies.forEach(enemy => {
            if (enemy.exploding) {
                // Dessiner l'explosion
                const radius = enemy.size * (1 + enemy.explosionProgress * 2);
                const gradient = gameState.ctx.createRadialGradient(
                    enemy.x, enemy.y, 0,
                    enemy.x, enemy.y, radius
                );
                
                gradient.addColorStop(0, 'rgba(255, 255, 100, 0.8)');
                gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                
                gameState.ctx.fillStyle = gradient;
                gameState.ctx.beginPath();
                gameState.ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
                gameState.ctx.fill();
            } else {
                // Dessiner l'ennemi
                gameState.ctx.fillStyle = enemy.color;
                gameState.ctx.beginPath();
                
                if (enemy.type === 'circle') {
                    gameState.ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
                    gameState.ctx.fill();
                } else if (enemy.type === 'triangle') {
                    // Triangle pointant vers le bas
                    gameState.ctx.moveTo(enemy.x, enemy.y - enemy.size);
                    gameState.ctx.lineTo(enemy.x - enemy.size, enemy.y + enemy.size);
                    gameState.ctx.lineTo(enemy.x + enemy.size, enemy.y + enemy.size);
                    gameState.ctx.closePath();
                    gameState.ctx.fill();
                } else {
                    // Rectangle
                    gameState.ctx.rect(enemy.x - enemy.size/2, enemy.y - enemy.size/2, enemy.size, enemy.size);
                    gameState.ctx.fill();
                }
                
                // Dessiner un effet de brillance pour les ennemis spéciaux
                if (enemy.isSpecial) {
                    gameState.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                    gameState.ctx.lineWidth = 2;
                    
                    if (enemy.type === 'circle') {
                        gameState.ctx.beginPath();
                        gameState.ctx.arc(enemy.x, enemy.y, enemy.size + 2, 0, Math.PI * 2);
                        gameState.ctx.stroke();
                    } else if (enemy.type === 'triangle') {
                        gameState.ctx.beginPath();
                        gameState.ctx.moveTo(enemy.x, enemy.y - enemy.size - 2);
                        gameState.ctx.lineTo(enemy.x - enemy.size - 2, enemy.y + enemy.size + 2);
                        gameState.ctx.lineTo(enemy.x + enemy.size + 2, enemy.y + enemy.size + 2);
                        gameState.ctx.closePath();
                        gameState.ctx.stroke();
                    } else {
                        gameState.ctx.strokeRect(
                            enemy.x - enemy.size/2 - 2, 
                            enemy.y - enemy.size/2 - 2, 
                            enemy.size + 4, 
                            enemy.size + 4
                        );
                    }
                }
                
                // Dessiner un œil pour les ennemis
                gameState.ctx.fillStyle = 'white';
                gameState.ctx.beginPath();
                gameState.ctx.arc(enemy.x, enemy.y - enemy.size/3, enemy.size/4, 0, Math.PI * 2);
                gameState.ctx.fill();
                
                gameState.ctx.fillStyle = 'black';
                gameState.ctx.beginPath();
                gameState.ctx.arc(enemy.x, enemy.y - enemy.size/3, enemy.size/8, 0, Math.PI * 2);
                gameState.ctx.fill();
            }
        });
    }
    
    // Démarrer le minuteur de jeu
    function startGameTimer() {
        const timerElement = document.getElementById('game-timer');
        const timerInterval = setInterval(() => {
            if (!gameState.isPaused) {
                gameState.timeLeft--;
                updateTimerDisplay();
                
                if (gameState.timeLeft <= 0) {
                    clearInterval(timerInterval);
                    endPlayerTurn();
                }
            }
        }, 1000);
    }
    
    // Mettre à jour l'affichage du minuteur
    function updateTimerDisplay() {
        document.getElementById('game-timer').textContent = gameState.timeLeft;
    }
    
    // Terminer le tour d'un joueur
    function endPlayerTurn() {
        if (gameState.gameInterval) {
            clearInterval(gameState.gameInterval);
        }
        
        // Calculer la précision
        const playerName = gameState.players[gameState.currentPlayerIndex];
        const accuracy = gameState.shotsFired > 0 ? 
            Math.round((gameState.hits / gameState.shotsFired) * 100) : 0;
        
        // Mettre à jour les scores
        gameState.scores[playerName].score = parseInt(document.getElementById('current-score').textContent);
        gameState.scores[playerName].hits = gameState.hits;
        gameState.scores[playerName].shots = gameState.shotsFired;
        gameState.scores[playerName].accuracy = accuracy;
        
        // Passer au joueur suivant ou afficher les scores
        if (gameState.currentPlayerIndex < gameState.players.length - 1) {
            gameState.currentPlayerIndex++;
            showTransitionScreen();
        } else {
            showScoreScreen();
        }
    }
    
    // Afficher l'écran de transition
    function showTransitionScreen() {
        const nextPlayerName = gameState.players[gameState.currentPlayerIndex];
        document.getElementById('next-player-name').textContent = nextPlayerName;
        
        switchScreen('transition-screen');
        
        let countdown = 5;
        const countdownElement = document.querySelector('.countdown-number');
        countdownElement.textContent = countdown;
        
        if (gameState.transitionInterval) {
            clearInterval(gameState.transitionInterval);
        }
        
        gameState.transitionInterval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(gameState.transitionInterval);
                switchScreen('game-screen');
                startPlayerTurn();
            }
        }, 1000);
    }
    
    // Afficher l'écran des scores
    function showScoreScreen() {
        switchScreen('score-screen');
        
        // Trier les joueurs par score
        const sortedPlayers = Object.keys(gameState.scores).sort((a, b) => {
            return gameState.scores[b].score - gameState.scores[a].score;
        });
        
        // Afficher le tableau des scores
        const scoreTableBody = document.getElementById('score-table-body');
        scoreTableBody.innerHTML = '';
        
        sortedPlayers.forEach((playerName, index) => {
            const playerData = gameState.scores[playerName];
            const row = document.createElement('tr');
            
            let medal = '';
            if (index === 0) medal = '<i class="fas fa-medal" style="color: gold"></i>';
            else if (index === 1) medal = '<i class="fas fa-medal" style="color: silver"></i>';
            else if (index === 2) medal = '<i class="fas fa-medal" style="color: #cd7f32"></i>';
            else medal = `<span style="color: #aaa">${index + 1}</span>`;
            
            row.innerHTML = `
                <td>${medal}</td>
                <td>${playerName}</td>
                <td>${playerData.score} pts</td>
                <td>${playerData.accuracy}%</td>
            `;
            
            scoreTableBody.appendChild(row);
        });
        
        // Afficher le gagnant
        if (sortedPlayers.length > 0) {
            const winnerName = sortedPlayers[0];
            const winnerScore = gameState.scores[winnerName].score;
            
            document.getElementById('winner-name').textContent = winnerName;
            document.getElementById('winner-score').textContent = `${winnerScore} points`;
            document.getElementById('winner-container').classList.remove('hidden');
        }
    }
    
    // Suivre le mouvement de la souris
    gameState.canvas.addEventListener('mousemove', function(e) {
        const rect = gameState.canvas.getBoundingClientRect();
        gameState.mouseX = e.clientX - rect.left;
        gameState.mouseY = e.clientY - rect.top;
    });
    
    // Gestion des tirs
    gameState.canvas.addEventListener('click', function(e) {
        if (!gameState.isPaused) {
            const rect = gameState.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Mettre à jour la position de la souris
            gameState.mouseX = mouseX;
            gameState.mouseY = mouseY;
            
            // Compter le tir
            gameState.shotsFired++;
            
            // Jouer le son du laser
            playLaserSound();
            
            // Dessiner l'effet de tir
            drawShotEffect(mouseX, mouseY);
            
            // Vérifier si un ennemi est touché
            checkHit(mouseX, mouseY);
        }
    });
    
    // Dessiner l'effet de tir
    function drawShotEffect(x, y) {
        // Effet de flash
        gameState.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        gameState.ctx.beginPath();
        gameState.ctx.arc(x, y, 15, 0, Math.PI * 2);
        gameState.ctx.fill();
        
        // Effet de rayon
        gameState.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        gameState.ctx.lineWidth = 3;
        gameState.ctx.beginPath();
        gameState.ctx.arc(x, y, 25, 0, Math.PI * 2);
        gameState.ctx.stroke();
        
        // Effet disparaît rapidement (sera effacé au prochain frame)
    }
    
    // Vérifier si un ennemi est touché
    function checkHit(x, y) {
        let hitDetected = false;
        
        for (let i = 0; i < gameState.enemies.length; i++) {
            const enemy = gameState.enemies[i];
            
            if (!enemy.exploding) {
                let distance;
                let hit = false;
                
                if (enemy.type === 'circle') {
                    distance = Math.sqrt((x - enemy.x) ** 2 + (y - enemy.y) ** 2);
                    hit = distance <= enemy.size;
                } else if (enemy.type === 'triangle') {
                    // Vérifier la collision avec le triangle
                    const points = [
                        {x: enemy.x, y: enemy.y - enemy.size}, // Sommet haut
                        {x: enemy.x - enemy.size, y: enemy.y + enemy.size}, // Bas gauche
                        {x: enemy.x + enemy.size, y: enemy.y + enemy.size}  // Bas droit
                    ];
                    
                    // Algorithme du point dans un triangle
                    const area = 0.5 * (-points[1].y * points[2].x + points[0].y * (-points[1].x + points[2].x) + points[0].x * (points[1].y - points[2].y) + points[1].x * points[2].y - points[2].x * points[1].y);
                    const s = 1 / (2 * area) * (points[0].y * points[2].x - points[0].x * points[2].y + (points[2].y - points[0].y) * x + (points[0].x - points[2].x) * y);
                    const t = 1 / (2 * area) * (points[0].x * points[1].y - points[0].y * points[1].x + (points[0].y - points[1].y) * x + (points[1].x - points[0].x) * y);
                    
                    hit = (s > 0 && t > 0 && (1 - s - t) > 0);
                } else {
                    // Pour le rectangle
                    hit = (x >= enemy.x - enemy.size/2 && x <= enemy.x + enemy.size/2 &&
                           y >= enemy.y - enemy.size/2 && y <= enemy.y + enemy.size/2);
                }
                
                if (hit) {
                    // Ennemi touché !
                    enemy.exploding = true;
                    hitDetected = true;
                    gameState.hits++;
                    
                    // Jouer le son d'explosion
                    playExplosionSound();
                    
                    // Ajouter des points
                    let points = 10;
                    if (gameState.gamePhase === 2) points = 15;
                    if (gameState.gamePhase === 3) points = 20;
                    if (enemy.isSpecial) points *= 2;
                    
                    const currentScore = parseInt(document.getElementById('current-score').textContent);
                    document.getElementById('current-score').textContent = currentScore + points;
                    
                    // Afficher les points gagnés
                    showPointsGained(enemy.x, enemy.y, points);
                    
                    break;
                }
            }
        }
        
        // Si aucun ennemi n'est touché, jouer le son de tir manqué
        if (!hitDetected) {
            // Son de tir manqué (on réutilise le son de laser mais plus court)
            const laserSound = document.getElementById('laser-sound');
            laserSound.currentTime = 0;
            laserSound.playbackRate = 1.5;
            laserSound.play().catch(e => console.log("Son non joué:", e));
            setTimeout(() => {
                laserSound.playbackRate = 1.0;
            }, 100);
        }
    }
    
    // Afficher les points gagnés
    function showPointsGained(x, y, points) {
        // Dessiner les points dans le canvas
        gameState.ctx.fillStyle = points >= 20 ? '#ffcc00' : '#00ff00';
        gameState.ctx.font = 'bold 24px Orbitron';
        gameState.ctx.textAlign = 'center';
        gameState.ctx.textBaseline = 'middle';
        gameState.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        gameState.ctx.shadowBlur = 5;
        gameState.ctx.fillText(`+${points}`, x, y - 30);
        gameState.ctx.shadowBlur = 0;
        
        // Animation supplémentaire avec un élément DOM temporaire
        const pointsElement = document.createElement('div');
        pointsElement.textContent = `+${points}`;
        pointsElement.style.position = 'absolute';
        pointsElement.style.left = `${x}px`;
        pointsElement.style.top = `${y}px`;
        pointsElement.style.color = points >= 20 ? '#ffcc00' : '#00ff00';
        pointsElement.style.fontWeight = 'bold';
        pointsElement.style.fontSize = '20px';
        pointsElement.style.pointerEvents = 'none';
        pointsElement.style.zIndex = '100';
        pointsElement.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
        pointsElement.style.transform = 'translate(-50%, -50%)';
        pointsElement.style.animation = 'pointsFloat 1s ease-out forwards';
        
        document.getElementById('game-canvas-container').appendChild(pointsElement);
        
        setTimeout(() => {
            pointsElement.remove();
        }, 1000);
    }
    
    // Gestion des boutons de contrôle
    pauseBtn.addEventListener('click', function() {
        gameState.isPaused = true;
        pauseBtn.classList.add('hidden');
        resumeBtn.classList.remove('hidden');
        // Réafficher le curseur normal en pause
        document.querySelector('.game-area').style.cursor = 'default';
    });
    
    resumeBtn.addEventListener('click', function() {
        gameState.isPaused = false;
        resumeBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        // Cacher le curseur normal
        document.querySelector('.game-area').style.cursor = 'none';
    });
    
    restartBtn.addEventListener('click', function() {
        if (confirm('Voulez-vous vraiment recommencer la partie? Tous les scores seront perdus.')) {
            gameState.currentPlayerIndex = 0;
            if (gameState.gameInterval) clearInterval(gameState.gameInterval);
            if (gameState.transitionInterval) clearInterval(gameState.transitionInterval);
            startPlayerTurn();
        }
    });
    
    // Sons du jeu
    function playLaserSound() {
        const laserSound = document.getElementById('laser-sound');
        laserSound.currentTime = 0;
        laserSound.play().catch(e => console.log("Son non joué:", e));
    }
    
    function playExplosionSound() {
        const explosionSound = document.getElementById('explosion-sound');
        explosionSound.currentTime = 0;
        explosionSound.play().catch(e => console.log("Son non joué:", e));
    }
    
    function playPhaseChangeSound() {
        const phaseSound = document.getElementById('phase-change-sound');
        phaseSound.currentTime = 0;
        phaseSound.play().catch(e => console.log("Son non joué:", e));
    }
    
    // Gestion du modal d'aide
    showHelpBtn.addEventListener('click', function() {
        helpModal.classList.remove('hidden');
    });
    
    closeHelpBtn.addEventListener('click', function() {
        helpModal.classList.add('hidden');
    });
    
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            helpModal.classList.add('hidden');
        }
    });
    
    // Boutons de l'écran des scores
    playAgainBtn.addEventListener('click', function() {
        gameState.currentPlayerIndex = 0;
        switchScreen('game-screen');
        startPlayerTurn();
    });
    
    backHomeBtn.addEventListener('click', function() {
        switchScreen('home-screen');
    });
    
    // Ajouter l'animation CSS pour les points
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pointsFloat {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -100px) scale(1.5); opacity: 0; }
        }
        
        @keyframes laserShot {
            0% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.5); }
        }
    `;
    document.head.appendChild(style);
    
    // Initialiser le jeu
    console.log("Jeu 'Zerguèm de la nuit' initialisé!");
    console.log("Instructions:");
    console.log("- Configurez le nombre de joueurs et leurs noms");
    console.log("- Cliquez sur 'Démarrer la partie' pour commencer");
    console.log("- Utilisez votre souris pour viser et cliquez pour tirer");
    console.log("- Le jeu dure 45 secondes par joueur");
    console.log("- Les ennemis évoluent toutes les 15 secondes");
});