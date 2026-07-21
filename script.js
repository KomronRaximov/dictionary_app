/* ==========================================================================
   DUOLINGO LUG'AT — JAVASCRIPT APPLICATION LOGIC
   ========================================================================== */

(function () {
    'use strict';

    // LocalStorage Keys
    const STORAGE_KEY_LESSONS = 'lugat_darslar';
    const STORAGE_KEY_STATS = 'lugat_stats';

    // Initial Seed Data (Used if localStorage is empty)
    const DEFAULT_LESSONS = {
        "dars_1": {
            id: "dars_1",
            nomi: "Meva va Sabzavotlar 🍎",
            sozlar: [
                { id: "w_101", uz: "olma", en: "apple" },
                { id: "w_102", uz: "nok", en: "pear" },
                { id: "w_103", uz: "uzum", en: "grape" },
                { id: "w_104", uz: "shaftoli", en: "peach" },
                { id: "w_105", uz: "banan", en: "banana" },
                { id: "w_106", uz: "limon", en: "lemon" },
                { id: "w_107", uz: "pomidor", en: "tomato" },
                { id: "w_108", uz: "bodring", en: "cucumber" }
            ]
        },
        "dars_2": {
            id: "dars_2",
            nomi: "Kundalik Iboralar 💬",
            sozlar: [
                { id: "w_201", uz: "xayrli tong", en: "good morning" },
                { id: "w_202", uz: "rahmat", en: "thank you" },
                { id: "w_203", uz: "xush kelibsiz", en: "welcome" },
                { id: "w_204", uz: "ko'rishguncha", en: "see you later" },
                { id: "w_205", uz: "iltimos", en: "please" },
                { id: "w_206", uz: "uzr", en: "sorry" },
                { id: "w_207", uz: "ha", en: "yes" },
                { id: "w_208", uz: "yo'q", en: "no" }
            ]
        },
        "dars_3": {
            id: "dars_3",
            nomi: "Oila a'zolari 👨‍👩‍👧",
            sozlar: [
                { id: "w_301", uz: "ota", en: "father" },
                { id: "w_302", uz: "ona", en: "mother" },
                { id: "w_303", uz: "aka / uka", en: "brother" },
                { id: "w_304", uz: "opa / singil", en: "sister" },
                { id: "w_305", uz: "o'g'il", en: "son" },
                { id: "w_306", uz: "qiz", en: "daughter" },
                { id: "w_307", uz: "bobo", en: "grandfather" },
                { id: "w_308", uz: "buvi", en: "grandmother" }
            ]
        }
    };

    // Application State
    const state = {
        lessons: {},
        stats: [],
        activeLessonId: null,
        editingWordId: null,
        editingLessonId: null,
        confirmCallback: null,
        
        // Flashcard tab state
        flashcard: {
            lessonId: null,
            words: [],
            currentIndex: 0,
            isFlipped: false
        },

        // Test tab state
        test: {
            lessonId: null,
            words: [],
            selectedUzTile: null,
            selectedEnTile: null,
            matchedCount: 0,
            totalPairs: 0
        }
    };

    /* ==========================================================================
       STORAGE CONTROLLER
       ========================================================================== */
    const Storage = {
        init() {
            const rawLessons = localStorage.getItem(STORAGE_KEY_LESSONS);
            if (rawLessons) {
                try {
                    state.lessons = JSON.parse(rawLessons);
                } catch (e) {
                    console.error("Failed to parse stored lessons:", e);
                    state.lessons = DEFAULT_LESSONS;
                    this.saveLessons();
                }
            } else {
                state.lessons = DEFAULT_LESSONS;
                this.saveLessons();
            }

            const rawStats = localStorage.getItem(STORAGE_KEY_STATS);
            if (rawStats) {
                try {
                    state.stats = JSON.parse(rawStats);
                } catch (e) {
                    console.error("Failed to parse stored stats:", e);
                    state.stats = [];
                }
            } else {
                state.stats = [];
            }
        },

        saveLessons() {
            localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(state.lessons));
            UI.updateQuickHeaderStats();
        },

        saveStats() {
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(state.stats));
        }
    };

    /* ==========================================================================
       AUDIO (TEXT-TO-SPEECH) HELPER
       ========================================================================== */
    function speakText(text) {
        if (!('speechSynthesis' in window)) {
            UI.showToast("Sizning brauzeringiz matnni o'qib berishni qo'llab-quvvatlamaydi.", "error");
            return;
        }
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }

    /* ==========================================================================
       UI UTILITIES & TOASTS
       ========================================================================== */
    const UI = {
        showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            let icon = 'ℹ️';
            if (type === 'success') icon = '✅';
            if (type === 'error') icon = '⚠️';
            
            toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(50px)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.remove('hidden');
        },

        closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.add('hidden');
        },

        showConfirm(title, message, onConfirm) {
            document.getElementById('modal-confirm-title').innerText = title;
            document.getElementById('modal-confirm-msg').innerText = message;
            state.confirmCallback = onConfirm;
            this.openModal('modal-confirm');
        },

        updateQuickHeaderStats() {
            let totalWords = 0;
            Object.values(state.lessons).forEach(l => {
                totalWords += (l.sozlar ? l.sozlar.length : 0);
            });
            document.getElementById('quick-total-words').innerText = `${totalWords} so'z`;
        }
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function generateId(prefix = 'id') {
        return prefix + '_' + Math.random().toString(36).substr(2, 9);
    }

    /* ==========================================================================
       TAB 1: LESSONS & WORDS CONTROLLER
       ========================================================================== */
    const LessonsTab = {
        init() {
            // Event Listeners
            document.getElementById('btn-add-lesson').addEventListener('click', () => {
                state.editingLessonId = null;
                document.getElementById('modal-lesson-title').innerText = "Yangi Dars Yaratish";
                document.getElementById('input-lesson-name').value = '';
                UI.openModal('modal-lesson');
            });

            document.getElementById('form-lesson').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveLesson();
            });

            document.getElementById('lesson-search-input').addEventListener('input', (e) => {
                this.renderLessonsList(e.target.value);
            });

            document.getElementById('btn-edit-lesson-name').addEventListener('click', () => {
                if (!state.activeLessonId) return;
                const lesson = state.lessons[state.activeLessonId];
                state.editingLessonId = lesson.id;
                document.getElementById('modal-lesson-title').innerText = "Dars Nomini O'zgartirish";
                document.getElementById('input-lesson-name').value = lesson.nomi;
                UI.openModal('modal-lesson');
            });

            document.getElementById('btn-delete-lesson').addEventListener('click', () => {
                if (!state.activeLessonId) return;
                const lesson = state.lessons[state.activeLessonId];
                UI.showConfirm(
                    "Darsni O'chirish",
                    `"${lesson.nomi}" darsi va uning barcha (${lesson.sozlar.length} ta) so'zlari o'chirilsinmi?`,
                    () => this.deleteActiveLesson()
                );
            });

            // Add Word Form
            document.getElementById('add-word-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddWord();
            });

            document.getElementById('word-search-input').addEventListener('input', (e) => {
                this.renderWordsTable(e.target.value);
            });

            // Edit Word Form
            document.getElementById('form-edit-word').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveEditWord();
            });

            // Initial Render
            const keys = Object.keys(state.lessons);
            if (keys.length > 0) {
                state.activeLessonId = keys[0];
            }
            this.render();
        },

        render() {
            this.renderLessonsList();
            this.renderActiveLesson();
            this.populateLessonSelectDropdowns();
        },

        renderLessonsList(filterText = '') {
            const listEl = document.getElementById('lessons-list');
            listEl.innerHTML = '';

            const term = filterText.toLowerCase().trim();
            const lessonKeys = Object.keys(state.lessons);

            if (lessonKeys.length === 0) {
                listEl.innerHTML = `<li class="empty-state-sm">Darslar yo'q</li>`;
                return;
            }

            lessonKeys.forEach(id => {
                const lesson = state.lessons[id];
                if (term && !lesson.nomi.toLowerCase().includes(term)) {
                    return;
                }

                const li = document.createElement('li');
                li.className = `lesson-item ${id === state.activeLessonId ? 'active' : ''}`;
                li.innerHTML = `
                    <span class="name">${escapeHtml(lesson.nomi)}</span>
                    <span class="count-pill">${lesson.sozlar ? lesson.sozlar.length : 0}</span>
                `;
                li.addEventListener('click', () => {
                    state.activeLessonId = id;
                    this.renderLessonsList(filterText);
                    this.renderActiveLesson();
                });
                listEl.appendChild(li);
            });
        },

        renderActiveLesson() {
            const noLessonEl = document.getElementById('no-lesson-selected');
            const activeContainer = document.getElementById('active-lesson-container');

            if (!state.activeLessonId || !state.lessons[state.activeLessonId]) {
                noLessonEl.classList.remove('hidden');
                activeContainer.classList.add('hidden');
                return;
            }

            noLessonEl.classList.add('hidden');
            activeContainer.classList.remove('hidden');

            const lesson = state.lessons[state.activeLessonId];
            document.getElementById('active-lesson-title').innerText = lesson.nomi;
            document.getElementById('active-lesson-count').innerText = `${lesson.sozlar.length} so'z`;

            this.renderWordsTable();
        },

        renderWordsTable(filterText = '') {
            const tbody = document.getElementById('words-table-body');
            const emptyMsg = document.getElementById('words-empty-msg');
            tbody.innerHTML = '';

            const lesson = state.lessons[state.activeLessonId];
            if (!lesson || !lesson.sozlar || lesson.sozlar.length === 0) {
                emptyMsg.classList.remove('hidden');
                return;
            }

            emptyMsg.classList.add('hidden');
            const term = filterText.toLowerCase().trim();

            let displayIndex = 1;
            lesson.sozlar.forEach((word) => {
                if (term && !word.uz.toLowerCase().includes(term) && !word.en.toLowerCase().includes(term)) {
                    return;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${displayIndex++}</td>
                    <td class="word-uz-text">${escapeHtml(word.uz)}</td>
                    <td class="word-en-text">${escapeHtml(word.en)}</td>
                    <td>
                        <button class="btn-icon btn-speak" title="Talaffuz qilish">🔊</button>
                    </td>
                    <td class="text-right">
                        <button class="btn-icon btn-edit" title="Tahrirlash">✏️</button>
                        <button class="btn-icon btn-delete" title="O'chirish">🗑️</button>
                    </td>
                `;

                // Audio button event
                tr.querySelector('.btn-speak').addEventListener('click', () => {
                    speakText(word.en);
                });

                // Edit button event
                tr.querySelector('.btn-edit').addEventListener('click', () => {
                    state.editingWordId = word.id;
                    document.getElementById('edit-word-uz').value = word.uz;
                    document.getElementById('edit-word-en').value = word.en;
                    UI.openModal('modal-edit-word');
                });

                // Delete button event
                tr.querySelector('.btn-delete').addEventListener('click', () => {
                    UI.showConfirm(
                        "So'zni O'chirish",
                        `"${word.uz} — ${word.en}" so'zi darsdan o'chirilsinmi?`,
                        () => this.deleteWord(word.id)
                    );
                });

                tbody.appendChild(tr);
            });
        },

        handleSaveLesson() {
            const nameInput = document.getElementById('input-lesson-name');
            const name = nameInput.value.trim();
            if (!name) return;

            if (state.editingLessonId) {
                // Edit existing lesson name
                state.lessons[state.editingLessonId].nomi = name;
                UI.showToast("Dars nomi saqlandi!", "success");
            } else {
                // Create new lesson
                const newId = generateId('dars');
                state.lessons[newId] = {
                    id: newId,
                    nomi: name,
                    sozlar: []
                };
                state.activeLessonId = newId;
                UI.showToast("Yangi dars yaratildi!", "success");
            }

            Storage.saveLessons();
            UI.closeModal('modal-lesson');
            this.render();
            FlashcardsTab.populateDropdown();
            TestTab.populateDropdown();
            ImportTab.populateDropdown();
            StatsTab.render();
        },

        deleteActiveLesson() {
            if (!state.activeLessonId) return;
            const deletedName = state.lessons[state.activeLessonId].nomi;
            delete state.lessons[state.activeLessonId];

            const keys = Object.keys(state.lessons);
            state.activeLessonId = keys.length > 0 ? keys[0] : null;

            Storage.saveLessons();
            UI.showToast(`"${deletedName}" darsi o'chirildi.`, "info");
            this.render();
            FlashcardsTab.populateDropdown();
            TestTab.populateDropdown();
            ImportTab.populateDropdown();
            StatsTab.render();
        },

        handleAddWord() {
            if (!state.activeLessonId) return;

            const inputUz = document.getElementById('input-word-uz');
            const inputEn = document.getElementById('input-word-en');

            const uz = inputUz.value.trim();
            const en = inputEn.value.trim();

            if (!uz || !en) return;

            const lesson = state.lessons[state.activeLessonId];
            
            // Check for duplicate word in active lesson
            const isDuplicate = lesson.sozlar.some(
                w => w.uz.toLowerCase() === uz.toLowerCase() && w.en.toLowerCase() === en.toLowerCase()
            );

            if (isDuplicate) {
                UI.showToast("Ushbu so'z darsda allaqachon mavjud!", "error");
                return;
            }

            lesson.sozlar.push({
                id: generateId('w'),
                uz: uz,
                en: en
            });

            Storage.saveLessons();
            UI.showToast("Yangi so'z qo'shildi!", "success");

            inputUz.value = '';
            inputEn.value = '';
            inputUz.focus();

            this.renderActiveLesson();
            this.renderLessonsList(document.getElementById('lesson-search-input').value);
            StatsTab.render();
        },

        handleSaveEditWord() {
            if (!state.activeLessonId || !state.editingWordId) return;

            const uz = document.getElementById('edit-word-uz').value.trim();
            const en = document.getElementById('edit-word-en').value.trim();

            if (!uz || !en) return;

            const lesson = state.lessons[state.activeLessonId];
            const wordObj = lesson.sozlar.find(w => w.id === state.editingWordId);

            if (wordObj) {
                wordObj.uz = uz;
                wordObj.en = en;
                Storage.saveLessons();
                UI.showToast("So'z muvaffaqiyatli tahrirlandi!", "success");
            }

            UI.closeModal('modal-edit-word');
            this.renderActiveLesson();
        },

        deleteWord(wordId) {
            if (!state.activeLessonId) return;
            const lesson = state.lessons[state.activeLessonId];
            lesson.sozlar = lesson.sozlar.filter(w => w.id !== wordId);

            Storage.saveLessons();
            UI.showToast("So'z o'chirildi", "info");
            this.renderActiveLesson();
            this.renderLessonsList(document.getElementById('lesson-search-input').value);
            StatsTab.render();
        },

        populateLessonSelectDropdowns() {
            FlashcardsTab.populateDropdown();
            TestTab.populateDropdown();
            ImportTab.populateDropdown();
        }
    };

    /* ==========================================================================
       TAB 2: FLASHCARDS CONTROLLER
       ========================================================================== */
    const FlashcardsTab = {
        init() {
            const selectEl = document.getElementById('flashcard-lesson-select');
            selectEl.addEventListener('change', (e) => {
                this.loadLesson(e.target.value);
            });

            document.getElementById('btn-flashcard-shuffle').addEventListener('click', () => {
                this.shuffleWords();
            });

            const card = document.getElementById('flashcard');
            card.addEventListener('click', (e) => {
                // Don't flip if speak button inside card was clicked
                if (e.target.closest('#fc-btn-speak')) return;
                this.flipCard();
            });

            document.getElementById('btn-fc-flip').addEventListener('click', () => {
                this.flipCard();
            });

            document.getElementById('btn-fc-prev').addEventListener('click', () => {
                this.prevCard();
            });

            document.getElementById('btn-fc-next').addEventListener('click', () => {
                this.nextCard();
            });

            document.getElementById('fc-btn-speak').addEventListener('click', () => {
                const word = state.flashcard.words[state.flashcard.currentIndex];
                if (word) speakText(word.en);
            });

            // Keyboard Arrow Navigation
            window.addEventListener('keydown', (e) => {
                const flashcardTab = document.getElementById('tab-flashcards');
                if (!flashcardTab.classList.contains('active')) return;

                if (e.key === 'ArrowRight') this.nextCard();
                if (e.key === 'ArrowLeft') this.prevCard();
                if (e.key === ' ') {
                    e.preventDefault();
                    this.flipCard();
                }
            });
        },

        populateDropdown() {
            const selectEl = document.getElementById('flashcard-lesson-select');
            const currentValue = selectEl.value;
            selectEl.innerHTML = '';

            const keys = Object.keys(state.lessons);
            if (keys.length === 0) {
                selectEl.innerHTML = `<option value="">-- Darslar yo'q --</option>`;
                this.renderEmpty();
                return;
            }

            keys.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${state.lessons[id].nomi} (${state.lessons[id].sozlar.length} so'z)`;
                selectEl.appendChild(option);
            });

            // Keep existing selection or select first
            if (currentValue && state.lessons[currentValue]) {
                selectEl.value = currentValue;
            } else if (state.activeLessonId && state.lessons[state.activeLessonId]) {
                selectEl.value = state.activeLessonId;
            }

            this.loadLesson(selectEl.value);
        },

        loadLesson(lessonId) {
            state.flashcard.lessonId = lessonId;
            const lesson = state.lessons[lessonId];

            if (!lesson || !lesson.sozlar || lesson.sozlar.length === 0) {
                this.renderEmpty();
                return;
            }

            state.flashcard.words = [...lesson.sozlar];
            state.flashcard.currentIndex = 0;
            state.flashcard.isFlipped = false;

            document.getElementById('flashcard-empty').classList.add('hidden');
            document.getElementById('flashcard-active-area').classList.remove('hidden');

            this.renderCard();
        },

        shuffleWords() {
            if (state.flashcard.words.length <= 1) return;
            // Fisher-Yates shuffle
            for (let i = state.flashcard.words.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [state.flashcard.words[i], state.flashcard.words[j]] = [state.flashcard.words[j], state.flashcard.words[i]];
            }
            state.flashcard.currentIndex = 0;
            state.flashcard.isFlipped = false;
            UI.showToast("So'zlar aralashtirildi!", "info");
            this.renderCard();
        },

        flipCard() {
            const card = document.getElementById('flashcard');
            state.flashcard.isFlipped = !state.flashcard.isFlipped;
            if (state.flashcard.isFlipped) {
                card.classList.add('is-flipped');
            } else {
                card.classList.remove('is-flipped');
            }
        },

        prevCard() {
            if (state.flashcard.words.length === 0) return;
            if (state.flashcard.currentIndex > 0) {
                state.flashcard.currentIndex--;
            } else {
                state.flashcard.currentIndex = state.flashcard.words.length - 1; // Wrap around
            }
            this.unflipAndRender();
        },

        nextCard() {
            if (state.flashcard.words.length === 0) return;
            if (state.flashcard.currentIndex < state.flashcard.words.length - 1) {
                state.flashcard.currentIndex++;
            } else {
                state.flashcard.currentIndex = 0; // Wrap around
            }
            this.unflipAndRender();
        },

        unflipAndRender() {
            const card = document.getElementById('flashcard');
            state.flashcard.isFlipped = false;
            card.classList.remove('is-flipped');
            setTimeout(() => {
                this.renderCard();
            }, 150);
        },

        renderCard() {
            const currentWord = state.flashcard.words[state.flashcard.currentIndex];
            if (!currentWord) return;

            document.getElementById('fc-front-text').innerText = currentWord.uz;
            document.getElementById('fc-back-text').innerText = currentWord.en;

            const total = state.flashcard.words.length;
            const currentNum = state.flashcard.currentIndex + 1;
            document.getElementById('flashcard-counter-text').innerText = `${currentNum} / ${total}`;

            const percent = (currentNum / total) * 100;
            document.getElementById('flashcard-progress-fill').style.width = `${percent}%`;
        },

        renderEmpty() {
            document.getElementById('flashcard-empty').classList.remove('hidden');
            document.getElementById('flashcard-active-area').classList.add('hidden');
        }
    };

    /* ==========================================================================
       TAB 3: TEST (MOSLASHTIRISH O'YINI) CONTROLLER
       ========================================================================== */
    const TestTab = {
        init() {
            const selectEl = document.getElementById('test-lesson-select');
            selectEl.addEventListener('change', (e) => {
                state.test.lessonId = e.target.value;
            });

            document.getElementById('btn-start-test').addEventListener('click', () => {
                this.startTest();
            });

            document.getElementById('btn-test-restart').addEventListener('click', () => {
                UI.closeModal('modal-test-result');
                this.startTest();
            });

            document.getElementById('btn-test-close').addEventListener('click', () => {
                UI.closeModal('modal-test-result');
            });
        },

        populateDropdown() {
            const selectEl = document.getElementById('test-lesson-select');
            const currentValue = selectEl.value;
            selectEl.innerHTML = '';

            const keys = Object.keys(state.lessons);
            if (keys.length === 0) {
                selectEl.innerHTML = `<option value="">-- Darslar yo'q --</option>`;
                return;
            }

            keys.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${state.lessons[id].nomi} (${state.lessons[id].sozlar.length} so'z)`;
                selectEl.appendChild(option);
            });

            if (currentValue && state.lessons[currentValue]) {
                selectEl.value = currentValue;
            } else if (state.activeLessonId && state.lessons[state.activeLessonId]) {
                selectEl.value = state.activeLessonId;
            }

            state.test.lessonId = selectEl.value;
        },

        startTest() {
            const lessonId = state.test.lessonId || document.getElementById('test-lesson-select').value;
            const lesson = state.lessons[lessonId];

            const emptyEl = document.getElementById('test-empty-msg');
            const boardEl = document.getElementById('test-board');

            if (!lesson || !lesson.sozlar || lesson.sozlar.length < 2) {
                emptyEl.classList.remove('hidden');
                boardEl.classList.add('hidden');
                document.getElementById('test-correct-counter').innerText = '0';
                document.getElementById('test-total-counter').innerText = '0';
                return;
            }

            emptyEl.classList.add('hidden');
            boardEl.classList.remove('hidden');

            // Pick up to 8 random words
            let pool = [...lesson.sozlar];
            // Shuffle pool
            pool.sort(() => Math.random() - 0.5);
            const selectedWords = pool.slice(0, Math.min(8, pool.length));

            state.test.words = selectedWords;
            state.test.selectedUzTile = null;
            state.test.selectedEnTile = null;
            state.test.matchedCount = 0;
            state.test.totalPairs = selectedWords.length;

            document.getElementById('test-correct-counter').innerText = '0';
            document.getElementById('test-total-counter').innerText = state.test.totalPairs;

            // Render columns
            const colUz = document.getElementById('test-col-uz');
            const colEn = document.getElementById('test-col-en');
            colUz.innerHTML = '';
            colEn.innerHTML = '';

            // Left list: Uzbek words (shuffled)
            const uzItems = [...selectedWords].sort(() => Math.random() - 0.5);
            uzItems.forEach(item => {
                const tile = document.createElement('div');
                tile.className = 'match-tile';
                tile.dataset.id = item.id;
                tile.dataset.lang = 'uz';
                tile.innerText = item.uz;
                tile.addEventListener('click', () => this.handleTileClick(tile));
                colUz.appendChild(tile);
            });

            // Right list: English words (shuffled)
            const enItems = [...selectedWords].sort(() => Math.random() - 0.5);
            enItems.forEach(item => {
                const tile = document.createElement('div');
                tile.className = 'match-tile';
                tile.dataset.id = item.id;
                tile.dataset.lang = 'en';
                tile.innerText = item.en;
                tile.addEventListener('click', () => this.handleTileClick(tile));
                colEn.appendChild(tile);
            });
        },

        handleTileClick(tile) {
            if (tile.classList.contains('locked')) return;

            const lang = tile.dataset.lang;

            if (lang === 'uz') {
                if (state.test.selectedUzTile) {
                    state.test.selectedUzTile.classList.remove('selected');
                }
                tile.classList.add('selected');
                state.test.selectedUzTile = tile;
            } else if (lang === 'en') {
                if (state.test.selectedEnTile) {
                    state.test.selectedEnTile.classList.remove('selected');
                }
                tile.classList.add('selected');
                state.test.selectedEnTile = tile;
            }

            // Check if both sides are selected
            if (state.test.selectedUzTile && state.test.selectedEnTile) {
                this.checkMatch();
            }
        },

        checkMatch() {
            const uzTile = state.test.selectedUzTile;
            const enTile = state.test.selectedEnTile;

            const isCorrect = uzTile.dataset.id === enTile.dataset.id;

            if (isCorrect) {
                // Correct match!
                uzTile.classList.remove('selected');
                enTile.classList.remove('selected');

                uzTile.classList.add('locked');
                enTile.classList.add('locked');

                uzTile.innerHTML = `✓ ${escapeHtml(uzTile.innerText)}`;
                enTile.innerHTML = `✓ ${escapeHtml(enTile.innerText)}`;

                state.test.matchedCount++;
                document.getElementById('test-correct-counter').innerText = state.test.matchedCount;

                // Play audio for matched English word
                const matchedWord = state.test.words.find(w => w.id === uzTile.dataset.id);
                if (matchedWord) speakText(matchedWord.en);

                state.test.selectedUzTile = null;
                state.test.selectedEnTile = null;

                // Check game finish
                if (state.test.matchedCount === state.test.totalPairs) {
                    setTimeout(() => this.finishTest(), 500);
                }
            } else {
                // Wrong match!
                uzTile.classList.add('wrong');
                enTile.classList.add('wrong');

                const tempUz = uzTile;
                const tempEn = enTile;

                state.test.selectedUzTile = null;
                state.test.selectedEnTile = null;

                setTimeout(() => {
                    tempUz.classList.remove('selected', 'wrong');
                    tempEn.classList.remove('selected', 'wrong');
                }, 450);
            }
        },

        finishTest() {
            const lesson = state.lessons[state.test.lessonId];
            const lessonName = lesson ? lesson.nomi : "Noma'lum Dars";
            const correct = state.test.matchedCount;
            const total = state.test.totalPairs;
            const percent = Math.round((correct / total) * 100);

            // Record stat
            const record = {
                id: generateId('stat'),
                date: new Date().toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                lessonName: lessonName,
                correct: correct,
                total: total,
                percent: percent
            };

            state.stats.unshift(record); // Add to beginning
            Storage.saveStats();
            StatsTab.render();

            // Populate Result Modal
            document.getElementById('test-result-score').innerText = `${correct} / ${total}`;
            document.getElementById('test-result-percent').innerText = `${percent}% aniqlik`;

            let icon = '🎉';
            let title = "Ajoyib natija!";
            let desc = "Barcha so'zlarni muvaffaqiyatli moslashtirdingiz!";

            if (percent < 100 && percent >= 70) {
                icon = '👏';
                title = "Yaxshi natija!";
                desc = "So'zlarni yana bir bor takrorlab ko'ring.";
            } else if (percent < 70) {
                icon = '💪';
                title = "Harakat qiling!";
                desc = "Flashcards bo'limida so'zlarni yaxshilab yodlab oling.";
            }

            document.getElementById('test-result-icon').innerText = icon;
            document.getElementById('test-result-title').innerText = title;
            document.getElementById('test-result-desc').innerText = desc;

            UI.openModal('modal-test-result');
        }
    };

    /* ==========================================================================
       TAB 4: STATISTIKA CONTROLLER
       ========================================================================== */
    const StatsTab = {
        init() {
            document.getElementById('btn-clear-stats').addEventListener('click', () => {
                if (state.stats.length === 0) return;
                UI.showConfirm(
                    "Tarixni Tozalash",
                    "Barcha o'tkazilgan testlar tarixi o'chirilsinmi?",
                    () => this.clearHistory()
                );
            });
        },

        render() {
            // Metrics Calculation
            const lessonKeys = Object.keys(state.lessons);
            let totalWords = 0;
            lessonKeys.forEach(k => {
                totalWords += state.lessons[k].sozlar ? state.lessons[k].sozlar.length : 0;
            });

            document.getElementById('stat-total-lessons').innerText = lessonKeys.length;
            document.getElementById('stat-total-words').innerText = totalWords;
            document.getElementById('stat-total-tests').innerText = state.stats.length;

            if (state.stats.length > 0) {
                const sumPercent = state.stats.reduce((acc, curr) => acc + curr.percent, 0);
                const avg = Math.round(sumPercent / state.stats.length);
                document.getElementById('stat-avg-score').innerText = `${avg}%`;
            } else {
                document.getElementById('stat-avg-score').innerText = '0%';
            }

            // Recent 5 Tests Table
            const tbody = document.getElementById('recent-tests-body');
            const emptyMsg = document.getElementById('stats-empty-msg');
            tbody.innerHTML = '';

            const recent5 = state.stats.slice(0, 5);

            if (recent5.length === 0) {
                emptyMsg.classList.remove('hidden');
                return;
            }

            emptyMsg.classList.add('hidden');

            recent5.forEach(st => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(st.date)}</td>
                    <td class="word-uz-text">${escapeHtml(st.lessonName)}</td>
                    <td>${st.correct} / ${st.total}</td>
                    <td><span class="badge">${st.percent}%</span></td>
                `;
                tbody.appendChild(tr);
            });
        },

        clearHistory() {
            state.stats = [];
            Storage.saveStats();
            this.render();
            UI.showToast("Testlar tarixi tozalandi", "info");
        }
    };

    /* ==========================================================================
       TAB 5: IMPORT CONTROLLER
       ========================================================================== */
    const ImportTab = {
        init() {
            document.getElementById('btn-execute-import').addEventListener('click', () => {
                this.executeImport();
            });

            document.getElementById('btn-clear-import').addEventListener('click', () => {
                document.getElementById('import-textarea').value = '';
                document.getElementById('import-report').classList.add('hidden');
            });
        },

        populateDropdown() {
            const selectEl = document.getElementById('import-lesson-select');
            const currentValue = selectEl.value;
            selectEl.innerHTML = '';

            const keys = Object.keys(state.lessons);
            if (keys.length === 0) {
                selectEl.innerHTML = `<option value="">-- Darslar yo'q --</option>`;
                return;
            }

            keys.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = state.lessons[id].nomi;
                selectEl.appendChild(option);
            });

            if (currentValue && state.lessons[currentValue]) {
                selectEl.value = currentValue;
            } else if (state.activeLessonId && state.lessons[state.activeLessonId]) {
                selectEl.value = state.activeLessonId;
            }
        },

        executeImport() {
            const selectEl = document.getElementById('import-lesson-select');
            const lessonId = selectEl.value;

            if (!lessonId || !state.lessons[lessonId]) {
                UI.showToast("Iltimos, so'zlar qo'shiladigan darsni tanlang!", "error");
                return;
            }

            const rawText = document.getElementById('import-textarea').value;
            if (!rawText.trim()) {
                UI.showToast("Import qilish uchun matn kiriting!", "warning");
                return;
            }

            const lines = rawText.split('\n');
            const lesson = state.lessons[lessonId];

            let addedCount = 0;
            let skippedCount = 0;
            let invalidCount = 0;

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return; // skip empty line

                // Flexible separators: '-', ':', ','
                const parts = trimmed.split(/[-:,]+/);
                if (parts.length < 2) {
                    invalidCount++;
                    return;
                }

                const uz = parts[0].trim();
                const en = parts.slice(1).join(' ').trim(); // rejoin if extra separators inside

                if (!uz || !en) {
                    invalidCount++;
                    return;
                }

                // Check duplicate in lesson
                const duplicate = lesson.sozlar.some(
                    w => w.uz.toLowerCase() === uz.toLowerCase() || w.en.toLowerCase() === en.toLowerCase()
                );

                if (duplicate) {
                    skippedCount++;
                } else {
                    lesson.sozlar.push({
                        id: generateId('w'),
                        uz: uz,
                        en: en
                    });
                    addedCount++;
                }
            });

            Storage.saveLessons();
            LessonsTab.render();
            StatsTab.render();

            // Report output
            const reportEl = document.getElementById('import-report');
            const detailsEl = document.getElementById('import-report-details');

            reportEl.classList.remove('hidden');
            detailsEl.innerHTML = `
                Muvaffaqiyatli qo'shildi: <strong>${addedCount} ta so'z</strong><br>
                Takrorlangani uchun o'tkazib yuborildi: <strong>${skippedCount} ta</strong><br>
                Noto'g me'yoriy format sababli o'tkazildi: <strong>${invalidCount} ta</strong>
            `;

            UI.showToast(`${addedCount} ta yangi so'z darsga qo'shildi!`, "success");
        }
    };

    /* ==========================================================================
       APP SETUP & TAB SWITCHER
       ========================================================================== */
    function setupTabs() {
        const navBtns = document.querySelectorAll('.nav-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.getAttribute('data-tab');

                navBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const targetPane = document.getElementById(targetTabId);
                if (targetPane) targetPane.classList.add('active');

                // Refresh tab states on view
                if (targetTabId === 'tab-flashcards') FlashcardsTab.populateDropdown();
                if (targetTabId === 'tab-test') TestTab.populateDropdown();
                if (targetTabId === 'tab-stats') StatsTab.render();
                if (targetTabId === 'tab-import') ImportTab.populateDropdown();
            });
        });
    }

    function setupModals() {
        // Close modal buttons (.modal-close & .modal-cancel)
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.add('hidden');
            });
        });

        // Close on background overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Confirm modal buttons
        document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
            UI.closeModal('modal-confirm');
        });

        document.getElementById('btn-confirm-yes').addEventListener('click', () => {
            UI.closeModal('modal-confirm');
            if (typeof state.confirmCallback === 'function') {
                state.confirmCallback();
            }
        });
    }

    // Initialize App
    document.addEventListener('DOMContentLoaded', () => {
        Storage.init();
        setupTabs();
        setupModals();

        LessonsTab.init();
        FlashcardsTab.init();
        TestTab.init();
        StatsTab.init();
        ImportTab.init();

        UI.updateQuickHeaderStats();
    });

})();
