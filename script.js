class PuzzleGame {
    constructor() {
        this.puzzleBoard = document.getElementById('puzzleBoard');
        this.piecesContainer = document.getElementById('piecesContainer');
        this.startButton = document.getElementById('startGame');
        this.difficultySelect = document.getElementById('difficulty');
        this.timerDisplay = document.getElementById('timer');
        this.imageUpload = document.getElementById('imageUpload');
        this.newGameSound = document.getElementById('newGameSound');
        this.correctSound = document.getElementById('correctSound');
        
        this.pieces = [];
        this.gridSize = 3;
        this.pieceSize = 100;
        this.timer = 0;
        this.timerInterval = null;
        this.isPlaying = false;
        this.puzzleImage = null;
        this.slots = [];
        this.draggedPiece = null;
        this.touchOffset = { x: 0, y: 0 };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.difficultySelect.addEventListener('change', () => {
            this.gridSize = parseInt(this.difficultySelect.value);
            if (this.isPlaying) {
                this.startGame();
            }
        });
        
        this.imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.puzzleImage = new Image();
                    this.puzzleImage.onload = () => {
                        this.startGame();
                    };
                    this.puzzleImage.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    startGame() {
        if (!this.puzzleImage) {
            alert('Please upload an image first!');
            return;
        }
        // Play new game sound
        this.newGameSound.currentTime = 0;
        this.newGameSound.play();
        
        this.resetGame();
        this.createPuzzle();
        this.startTimer();
        this.isPlaying = true;
    }
    
    resetGame() {
        this.pieces = [];
        this.slots = [];
        this.piecesContainer.innerHTML = '';
        this.puzzleBoard.innerHTML = '';
        this.stopTimer();
        this.timer = 0;
        this.updateTimerDisplay();
    }
    
    createPuzzle() {
        // Calculate piece size based on board size
        const boardSize = Math.min(300, window.innerWidth - 40); // 40px for padding
        this.pieceSize = boardSize / this.gridSize;
        
        // Set board size
        this.puzzleBoard.style.width = boardSize + 'px';
        this.puzzleBoard.style.height = boardSize + 'px';
        
        // Update pieces container grid
        this.piecesContainer.style.width = boardSize + 'px';
        this.piecesContainer.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        
        // Create puzzle slots
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const slot = document.createElement('div');
                slot.className = 'puzzle-slot';
                slot.style.left = (j * 100 / this.gridSize) + '%';
                slot.style.top = (i * 100 / this.gridSize) + '%';
                slot.style.width = (100 / this.gridSize) + '%';
                slot.style.height = (100 / this.gridSize) + '%';
                slot.dataset.row = i;
                slot.dataset.col = j;
                
                this.setupSlotDropZone(slot);
                this.puzzleBoard.appendChild(slot);
                this.slots.push(slot);
            }
        }
        
        // Create puzzle pieces
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const piece = document.createElement('div');
                piece.className = 'puzzle-piece';
                piece.dataset.row = i;
                piece.dataset.col = j;
                
                // Set background image for the piece
                piece.style.backgroundImage = `url(${this.puzzleImage.src})`;
                piece.style.backgroundSize = `${this.gridSize * 100}%`;
                piece.style.backgroundPosition = `-${j * 100}% -${i * 100}%`;
                
                this.setupPieceDragAndDrop(piece);
                this.pieces.push(piece);
            }
        }
        
        // Shuffle pieces
        this.shufflePieces();
    }
    
    setupPieceDragAndDrop(piece) {
        // Desktop drag and drop
        piece.draggable = true;
        
        piece.addEventListener('dragstart', (e) => {
            piece.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                row: piece.dataset.row,
                col: piece.dataset.col
            }));
        });
        
        piece.addEventListener('dragend', () => {
            piece.classList.remove('dragging');
            document.querySelectorAll('.puzzle-slot.hover').forEach(slot => {
                slot.classList.remove('hover');
            });
        });

        // Mobile touch events
        piece.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.draggedPiece = piece;
            piece.classList.add('dragging');
            
            const touch = e.touches[0];
            const rect = piece.getBoundingClientRect();
            
            // Calculate offset between touch point and piece position
            this.touchOffset = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            // Create a clone for visual feedback
            const clone = piece.cloneNode(true);
            clone.id = 'dragging-clone';
            clone.style.width = this.pieceSize + 'px';
            clone.style.height = this.pieceSize + 'px';
            clone.style.padding = '0';
            clone.style.backgroundImage = piece.style.backgroundImage;
            clone.style.backgroundSize = piece.style.backgroundSize;
            clone.style.backgroundPosition = piece.style.backgroundPosition;
            clone.style.opacity = '0.8';
            clone.style.pointerEvents = 'none';
            document.body.appendChild(clone);
            
            this.updateDraggingPosition(touch.clientX, touch.clientY);
        });

        piece.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.draggedPiece) {
                const touch = e.touches[0];
                this.updateDraggingPosition(touch.clientX, touch.clientY);
                
                // Find slot under touch point
                const slot = this.findSlotAtPoint(touch.clientX, touch.clientY);
                document.querySelectorAll('.puzzle-slot.hover').forEach(s => s.classList.remove('hover'));
                if (slot) {
                    slot.classList.add('hover');
                }
            }
        });

        piece.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.draggedPiece) {
                const touch = e.changedTouches[0];
                const slot = this.findSlotAtPoint(touch.clientX, touch.clientY);
                
                if (slot) {
                    const pieceData = {
                        row: this.draggedPiece.dataset.row,
                        col: this.draggedPiece.dataset.col
                    };
                    
                    if (pieceData.row === slot.dataset.row && pieceData.col === slot.dataset.col) {
                        // Correct position
                        slot.appendChild(this.draggedPiece);
                        this.draggedPiece.classList.add('placed');
                        this.draggedPiece.style.position = '';
                        this.draggedPiece.style.left = '0';
                        this.draggedPiece.style.top = '0';
                        
                        // Play correct placement sound
                        this.correctSound.currentTime = 0;
                        this.correctSound.play();
                        
                        // Check if puzzle is complete
                        this.checkPuzzleComplete();
                    } else {
                        // Wrong position - return to pieces container
                        this.piecesContainer.appendChild(this.draggedPiece);
                        this.draggedPiece.classList.remove('placed');
                        this.draggedPiece.style.position = '';
                        this.draggedPiece.style.left = '';
                        this.draggedPiece.style.top = '';
                    }
                } else {
                    // No slot found - return to pieces container
                    this.piecesContainer.appendChild(this.draggedPiece);
                    this.draggedPiece.classList.remove('placed');
                    this.draggedPiece.style.position = '';
                    this.draggedPiece.style.left = '';
                    this.draggedPiece.style.top = '';
                }
                
                // Clean up
                this.draggedPiece.classList.remove('dragging');
                const clone = document.getElementById('dragging-clone');
                if (clone) {
                    clone.remove();
                }
                this.draggedPiece = null;
                document.querySelectorAll('.puzzle-slot.hover').forEach(s => s.classList.remove('hover'));
            }
        });
    }

    updateDraggingPosition(x, y) {
        const clone = document.getElementById('dragging-clone');
        if (clone) {
            // Adjust position by the touch/mouse offset and clone size
            const left = x - this.touchOffset.x;
            const top = y - this.touchOffset.y;
            clone.style.left = left + 'px';
            clone.style.top = top + 'px';
        }
    }

    findSlotAtPoint(x, y) {
        const slots = Array.from(document.querySelectorAll('.puzzle-slot'));
        return slots.find(slot => {
            const rect = slot.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && 
                   y >= rect.top && y <= rect.bottom;
        });
    }
    
    setupSlotDropZone(slot) {
        slot.addEventListener('dragenter', (e) => {
            e.preventDefault();
            slot.classList.add('hover');
        });

        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        slot.addEventListener('dragleave', () => {
            slot.classList.remove('hover');
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('hover');
            
            try {
                const pieceData = JSON.parse(e.dataTransfer.getData('text/plain'));
                const piece = document.querySelector('.puzzle-piece.dragging');
                
                if (piece) {
                    if (pieceData.row === slot.dataset.row && pieceData.col === slot.dataset.col) {
                        // Correct position
                        slot.appendChild(piece);
                        piece.classList.add('placed');
                        
                        // Play correct placement sound
                        this.correctSound.currentTime = 0;
                        this.correctSound.play();
                        
                        // Check if puzzle is complete
                        this.checkPuzzleComplete();
                    } else {
                        // Wrong position - return to pieces container
                        this.piecesContainer.appendChild(piece);
                        piece.classList.remove('placed');
                        piece.style.position = '';
                        piece.style.left = '';
                        piece.style.top = '';
                    }
                }
            } catch (error) {
                console.error('Error handling drop:', error);
            }
        });
    }
    
    checkPuzzleComplete() {
        const allPiecesPlaced = this.slots.every(slot => slot.children.length > 0);
        const allPiecesCorrect = this.slots.every(slot => {
            const piece = slot.children[0];
            return piece && 
                   piece.dataset.row === slot.dataset.row && 
                   piece.dataset.col === slot.dataset.col;
        });
        
        if (allPiecesPlaced && allPiecesCorrect) {
            this.stopTimer();
            setTimeout(() => {
                alert('Congratulations! You completed the puzzle!');
            }, 100);
        }
    }
    
    shufflePieces() {
        const piecesContainer = this.piecesContainer;
        piecesContainer.innerHTML = '';
        
        // Fisher-Yates shuffle
        for (let i = this.pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pieces[i], this.pieces[j]] = [this.pieces[j], this.pieces[i]];
        }
        
        this.pieces.forEach(piece => {
            piece.classList.remove('placed');
            piece.style.position = '';
            piece.style.left = '';
            piece.style.top = '';
            piecesContainer.appendChild(piece);
        });
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimerDisplay();
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        this.timerDisplay.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new PuzzleGame();
}); 