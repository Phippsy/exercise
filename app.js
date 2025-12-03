// ============================================
// Workout Tracker Application
// ============================================

class WorkoutTracker {
  constructor() {
    this.workouts = [];
    this.sessions = [];
    this.exerciseLibrary = []; // Master list of all available exercises
    this.quotes = [];
    this.currentWorkout = null;
    this.currentExercise = null;
    this.pairMode = false;
    this.selectedExercises = [];
    this.pairedExercises = null;
    this.onboardingStep = 0;
    this.onboardingSteps = [];
    this.onboardingFocusElement = null;
    this.dailyQuoteExpanded = false;
    this.exerciseLibraryFilters = { search: "", muscles: new Set() };
    this.quoteStartDate = new Date("2024-01-01T00:00:00");

    this.init();
  }

  async init() {
    await this.loadWorkouts();
    await this.loadQuotes();
    this.loadSessions();
    this.loadUserName();
    this.loadTheme();
    this.setupEventListeners();
    this.setupExerciseLibraryFilters();
    this.renderWorkoutList();
    this.renderActivityOverview();
    this.renderWorkoutOverview();
    this.setupOnboarding();
    this.updateCurrentDate();
    this.initializeDailyQuoteCard();
  }

  // ============================================
  // Data Loading
  // ============================================

  async loadWorkouts() {
    try {
      const response = await fetch("data/exercises.json");
      const data = await response.json();

      // Load from localStorage if available
      const storedWorkouts = localStorage.getItem("workouts");
      if (storedWorkouts) {
        this.workouts = JSON.parse(storedWorkouts);
      } else {
        this.workouts = data.workouts;
        this.saveWorkouts();
      }

      // Load or build exercise library
      const storedLibrary = localStorage.getItem("exerciseLibrary");
      if (storedLibrary) {
        this.exerciseLibrary = JSON.parse(storedLibrary);
      } else {
        this.buildExerciseLibrary();
      }
    } catch (error) {
      console.error("Error loading workouts:", error);
      this.workouts = [];
      this.exerciseLibrary = [];
    }
  }

  async loadQuotes() {
    try {
      const response = await fetch("data/quotes.json");
      const data = await response.json();
      this.quotes = data.quotes || [];
    } catch (error) {
      console.error("Error loading quotes:", error);
      this.quotes = [];
    }
  }

  buildExerciseLibrary() {
    const exerciseMap = new Map();

    // Collect all unique exercises from all workouts
    this.workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (!exerciseMap.has(exercise.name)) {
          exerciseMap.set(exercise.name, {
            name: exercise.name,
            muscle_group: exercise.muscle_group,
            sets: exercise.sets,
            reps: exercise.reps,
            weight_kg: exercise.weight_kg,
            notes: exercise.notes,
            form_notes: exercise.form_notes,
            form_video: exercise.form_video,
          });
        }
      });
    });

    this.exerciseLibrary = Array.from(exerciseMap.values());
    this.saveExerciseLibrary();
  }

  saveWorkouts() {
    localStorage.setItem("workouts", JSON.stringify(this.workouts));
  }

  saveExerciseLibrary() {
    localStorage.setItem(
      "exerciseLibrary",
      JSON.stringify(this.exerciseLibrary)
    );
  }

  loadSessions() {
    const stored = localStorage.getItem("workoutSessions");
    this.sessions = stored ? JSON.parse(stored) : [];
  }

  saveSessions() {
    localStorage.setItem("workoutSessions", JSON.stringify(this.sessions));
  }

  loadUserName() {
    const userName = localStorage.getItem("userName");
    const nameDisplay = document.getElementById("userNameDisplay");
    const possessive = document.getElementById("titlePossessive");
    if (userName) {
      nameDisplay.textContent = userName;
      nameDisplay.classList.remove("is-default");
      possessive.classList.remove("hidden");
    } else {
      nameDisplay.classList.add("is-default");
      possessive.classList.add("hidden");
    }
  }

  saveUserName(name) {
    localStorage.setItem("userName", name);
  }

  loadTheme() {
    const theme = localStorage.getItem("theme") || "dark";
    if (theme === "light") {
      document.body.classList.add("light-mode");
      this.updateThemeToggle(true);
    }
  }

  getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  isToday(dateString) {
    if (!dateString) return false;
    return this.getLocalDateKey(new Date(dateString)) === this.getLocalDateKey();
  }

  toggleTheme() {
    const isLight = document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    this.updateThemeToggle(isLight);
  }

  updateThemeToggle(isLight) {
    const darkIcon = document.getElementById("themeIconDark");
    const lightIcon = document.getElementById("themeIconLight");
    const toggleText = document.getElementById("themeToggleText");

    if (isLight) {
      darkIcon.classList.add("hidden");
      lightIcon.classList.remove("hidden");
      toggleText.textContent = "Dark";
    } else {
      darkIcon.classList.remove("hidden");
      lightIcon.classList.add("hidden");
      toggleText.textContent = "Light";
    }
  }

  // ============================================
  // Event Listeners
  // ============================================

  setupEventListeners() {
    // Theme toggle
    document.getElementById("themeToggleBtn").addEventListener("click", () => {
      this.toggleTheme();
    });

    // Daily quote
    const quoteToggle = document.getElementById("quoteToggle");
    const quoteCard = document.getElementById("dailyQuoteCard");
    if (quoteToggle) {
      quoteToggle.addEventListener("click", () => {
        this.toggleDailyQuote();
      });
    }
    if (quoteCard) {
      quoteCard.addEventListener("click", (event) => {
        if (
          event.target.closest("#quoteToggle") ||
          event.target.closest(".quote-body")
        ) {
          return;
        }
        this.toggleDailyQuote();
      });
    }

    // Navigation buttons
    document.getElementById("backToWorkouts").addEventListener("click", () => {
      this.showView("workoutListView");
    });

    document.getElementById("backToExercises").addEventListener("click", () => {
      this.pairedExercises = null;
      this.showExerciseList(this.currentWorkout);
    });

    // Session form
    document.getElementById("sessionForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveSession();
    });

    document.getElementById("addSetBtn").addEventListener("click", () => {
      this.addSetRow();
    });

    // Pair mode
    document.getElementById("pairModeToggle").addEventListener("click", () => {
      this.togglePairMode();
    });

    // Paired exercise controls
    document
      .getElementById("pairedAddSetBtn1")
      .addEventListener("click", () => {
        this.addPairedSetRow(1);
      });

    document
      .getElementById("pairedAddSetBtn2")
      .addEventListener("click", () => {
        this.addPairedSetRow(2);
      });

    document
      .getElementById("savePairedSessionBtn")
      .addEventListener("click", () => {
        this.savePairedSession();
      });

    // Export/Import functionality
    document.getElementById("exportDataBtn").addEventListener("click", () => {
      this.exportData();
    });

    document.getElementById("importDataBtn").addEventListener("click", () => {
      document.getElementById("fileInput").click();
    });

    document.getElementById("fileInput").addEventListener("change", (e) => {
      this.importData(e);
    });

    // Management view
    document.getElementById("manageBtn").addEventListener("click", () => {
      this.showManagementView();
    });

    document
      .getElementById("closeManagementBtn")
      .addEventListener("click", () => {
        this.hideManagementView();
      });

    document
      .querySelector(".management-overlay")
      .addEventListener("click", () => {
        this.hideManagementView();
      });

    // Management tabs
    document.querySelectorAll(".management-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.switchManagementTab(e.target.dataset.tab);
      });
    });

    // Exercise creation
    document
      .getElementById("createExerciseForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.createExercise();
      });

    // Workout creation
    document
      .getElementById("createWorkoutForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.createWorkout();
      });

    // Exercise filtering for create workout
    this.setupExerciseFiltering("exerciseSearchInput", "exerciseSelector");

    // Workout editing
    document
      .getElementById("closeEditWorkoutBtn")
      .addEventListener("click", () => {
        this.hideEditWorkoutModal();
      });

    document
      .getElementById("cancelEditWorkoutBtn")
      .addEventListener("click", () => {
        this.hideEditWorkoutModal();
      });

    document
      .querySelector("#editWorkoutModal .management-overlay")
      .addEventListener("click", () => {
        this.hideEditWorkoutModal();
      });

    document
      .getElementById("editWorkoutForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveWorkoutEdit();
      });

    // Exercise editing
    document
      .getElementById("closeEditExerciseBtn")
      .addEventListener("click", () => {
        this.hideEditExerciseModal();
      });

    document
      .getElementById("cancelEditExerciseBtn")
      .addEventListener("click", () => {
        this.hideEditExerciseModal();
      });

    document
      .querySelector("#editExerciseModal .management-overlay")
      .addEventListener("click", () => {
        this.hideEditExerciseModal();
      });

    document
      .getElementById("editExerciseForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveExerciseEdit();
      });

    // Exercise filtering for edit workout
    this.setupExerciseFiltering(
      "editExerciseSearchInput",
      "editExerciseSelector"
    );

    // User name editing
    const nameDisplay = document.getElementById("userNameDisplay");
    const possessive = document.getElementById("titlePossessive");
    nameDisplay.addEventListener("blur", () => {
      const name = nameDisplay.textContent.trim();
      if (name && name !== "My") {
        this.saveUserName(name);
        nameDisplay.classList.remove("is-default");
        possessive.classList.remove("hidden");
      } else {
        nameDisplay.textContent = "My";
        nameDisplay.classList.add("is-default");
        possessive.classList.add("hidden");
        localStorage.removeItem("userName");
      }
    });

    nameDisplay.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nameDisplay.blur();
      }
    });

    // Workout name editing
    const workoutNameElement = document.getElementById("currentWorkoutName");
    workoutNameElement.addEventListener("blur", () => {
      const newName = workoutNameElement.textContent.trim();
      const workoutId = parseInt(workoutNameElement.dataset.workoutId);
      if (newName && workoutId) {
        const workout = this.workouts.find((w) => w.id === workoutId);
        if (workout && workout.name !== newName) {
          workout.name = newName;
          this.saveWorkouts();
          this.renderWorkoutList();
        }
      } else if (!newName && this.currentWorkout) {
        // Restore original name if empty
        workoutNameElement.textContent = this.currentWorkout.name;
      }
    });

    workoutNameElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        workoutNameElement.blur();
      }
    });

    // Onboarding wizard controls
    document.getElementById("onboardingNext").addEventListener("click", () => {
      this.advanceOnboarding();
    });

    document.getElementById("onboardingBack").addEventListener("click", () => {
      this.rewindOnboarding();
    });

    document.getElementById("onboardingSkip").addEventListener("click", () => {
      this.dismissOnboarding();
    });
  }

  initializeDailyQuoteCard() {
    this.dailyQuoteExpanded = false;
    this.renderDailyQuote();
    this.updateDailyQuoteState();
  }

  setupExerciseFiltering(searchInputId, selectorId) {
    const searchInput = document.getElementById(searchInputId);
    const selector = document.getElementById(selectorId);

    // Search input filtering
    searchInput.addEventListener("input", () => {
      this.filterExercises(searchInputId, selectorId);
    });

    // Muscle group filter buttons
    const container = searchInput.closest(".form-group");
    const filterButtons = container.querySelectorAll(".muscle-filter-btn");

    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const muscle = btn.dataset.muscle;

        if (muscle === "all") {
          // Toggle all on/off
          const allActive = btn.classList.contains("active");
          filterButtons.forEach((b) => {
            if (allActive) {
              b.classList.remove("active");
            } else {
              b.classList.add("active");
            }
          });
        } else {
          // Toggle individual muscle group
          btn.classList.toggle("active");

          // Update "All" button state
          const allBtn = container.querySelector('[data-muscle="all"]');
          const otherBtns = Array.from(filterButtons).filter(
            (b) => b.dataset.muscle !== "all"
          );
          const allOthersActive = otherBtns.every((b) =>
            b.classList.contains("active")
          );

          if (allOthersActive) {
            allBtn.classList.add("active");
          } else {
            allBtn.classList.remove("active");
          }
        }

        this.filterExercises(searchInputId, selectorId);
      });
    });
  }

  setupExerciseLibraryFilters() {
    const searchInput = document.getElementById("exerciseLibrarySearch");
    const filterContainer = document.getElementById("exerciseLibraryFilters");

    if (!searchInput || !filterContainer) return;

    searchInput.addEventListener("input", (e) => {
      this.exerciseLibraryFilters.search = e.target.value
        .toLowerCase()
        .trim();
      this.renderExerciseLibrary();
    });

    const filterButtons = filterContainer.querySelectorAll(".muscle-filter-btn");

    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const muscle = btn.dataset.muscle;

        if (muscle === "all") {
          const allActive = btn.classList.contains("active");
          filterButtons.forEach((button) =>
            button.classList.toggle("active", !allActive)
          );
        } else {
          btn.classList.toggle("active");
          const allBtn = filterContainer.querySelector('[data-muscle="all"]');
          const otherBtns = Array.from(filterButtons).filter(
            (b) => b.dataset.muscle !== "all"
          );
          const allOthersActive = otherBtns.every((b) =>
            b.classList.contains("active")
          );

          if (allOthersActive) {
            allBtn.classList.add("active");
          } else {
            allBtn.classList.remove("active");
          }
        }

        this.updateExerciseLibraryFilters(filterContainer);
      });
    });
  }

  updateExerciseLibraryFilters(filterContainer) {
    const activeMuscles = Array.from(
      filterContainer.querySelectorAll(".muscle-filter-btn.active")
    )
      .filter((btn) => btn.dataset.muscle !== "all")
      .map((btn) => btn.dataset.muscle);

    this.exerciseLibraryFilters.muscles = new Set(activeMuscles);
    this.renderExerciseLibrary();
  }

  filterExercises(searchInputId, selectorId) {
    const searchInput = document.getElementById(searchInputId);
    const selector = document.getElementById(selectorId);
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Get active muscle groups
    const container = searchInput.closest(".form-group");
    const activeFilters = Array.from(
      container.querySelectorAll(".muscle-filter-btn.active")
    )
      .filter((btn) => btn.dataset.muscle !== "all")
      .map((btn) => btn.dataset.muscle);

    // Filter exercise items
    const items = selector.querySelectorAll(".exercise-selector-item");

    items.forEach((item) => {
      const label = item.querySelector("label").textContent.toLowerCase();
      const muscleGroup = item.dataset.muscleGroup;

      // Check search match
      const matchesSearch = label.includes(searchTerm);

      // Check muscle group match
      const matchesMuscle =
        activeFilters.length === 0 || activeFilters.includes(muscleGroup);

      // Show/hide item
      if (matchesSearch && matchesMuscle) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
      }
    });
  }

  // ============================================
  // View Management
  // ============================================

  showView(viewId) {
    const views = document.querySelectorAll(".view");
    views.forEach((view) => view.classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");
  }

  // ============================================
  // Workout List View
  // ============================================

  renderWorkoutList() {
    const container = document.getElementById("workoutList");
    container.innerHTML = "";

    this.workouts.forEach((workout) => {
      const card = this.createWorkoutCard(workout);
      container.appendChild(card);
    });
  }

  createWorkoutCard(workout) {
    const card = document.createElement("div");
    card.className = "workout-card";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");

    const title = document.createElement("h3");
    title.className = "workout-card-title";
    title.textContent = workout.name;

    const meta = document.createElement("div");
    meta.className = "workout-card-meta";
    const completion = this.getWorkoutCompletion(workout);
    meta.textContent = `${workout.exercises.length} exercises`;

    if (completion.allCompleted) {
      card.classList.add("workout-completed-today");
      const badge = document.createElement("span");
      badge.className = "pill pill-success workout-completion-badge";
      badge.textContent = "All done today";
      meta.appendChild(badge);
    }

    card.appendChild(title);
    card.appendChild(meta);

    card.addEventListener("click", () => this.showExerciseList(workout));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.showExerciseList(workout);
      }
    });

    return card;
  }

  // ============================================
  // Exercise List View
  // ============================================

  togglePairMode() {
    this.pairMode = !this.pairMode;
    this.selectedExercises = [];

    const toggleBtn = document.getElementById("pairModeToggle");
    const toggleText = document.getElementById("pairModeText");
    const notice = document.getElementById("pairModeNotice");

    if (this.pairMode) {
      toggleBtn.classList.add("btn-primary");
      toggleBtn.classList.remove("btn-secondary");
      toggleText.textContent = "Cancel Pairing";
      notice.classList.remove("hidden");
    } else {
      toggleBtn.classList.remove("btn-primary");
      toggleBtn.classList.add("btn-secondary");
      toggleText.textContent = "Pair Exercises";
      notice.classList.add("hidden");
    }

    this.renderExerciseList();
  }

  handleExerciseSelection(exercise, checkbox) {
    if (checkbox.checked) {
      this.selectedExercises.push(exercise);
    } else {
      this.selectedExercises = this.selectedExercises.filter(
        (e) => e.name !== exercise.name
      );
    }

    const noticeText = document.getElementById("pairModeNoticeText");

    if (this.selectedExercises.length === 0) {
      noticeText.textContent = "Select 2 exercises to pair";
    } else if (this.selectedExercises.length === 1) {
      noticeText.textContent = `Selected: ${this.selectedExercises[0].name} - Select 1 more`;
    } else if (this.selectedExercises.length === 2) {
      noticeText.textContent = "Opening paired view...";
      // Show paired view
      setTimeout(() => {
        this.showPairedExerciseDetail(
          this.selectedExercises[0],
          this.selectedExercises[1]
        );
      }, 300);
    }

    // Disable other checkboxes if 2 are selected
    if (this.selectedExercises.length === 2) {
      document.querySelectorAll(".exercise-item-checkbox").forEach((cb) => {
        if (!cb.checked) {
          cb.disabled = true;
        }
      });
    }
  }

  isExerciseCompletedToday(exercise, workoutId) {
    return this.sessions.some(
      (session) =>
        session.exerciseName === exercise.name &&
        session.workoutId === workoutId &&
        this.isToday(session.date)
    );
  }

  getWorkoutCompletion(workout) {
    const total = workout.exercises.length;
    const completed = workout.exercises.filter((exercise) =>
      this.isExerciseCompletedToday(exercise, workout.id)
    ).length;

    return {
      total,
      completed,
      allCompleted: total > 0 && completed === total,
    };
  }

  showExerciseList(workout) {
    this.currentWorkout = workout;
    this.pairMode = false;
    this.selectedExercises = [];

    // Reset pair mode UI
    const toggleBtn = document.getElementById("pairModeToggle");
    const toggleText = document.getElementById("pairModeText");
    const notice = document.getElementById("pairModeNotice");

    toggleBtn.classList.remove("btn-primary");
    toggleBtn.classList.add("btn-secondary");
    toggleText.textContent = "Pair Exercises";
    notice.classList.add("hidden");

    const workoutNameElement = document.getElementById("currentWorkoutName");
    workoutNameElement.textContent = workout.name;
    workoutNameElement.dataset.workoutId = workout.id;

    // Display workout notes if they exist
    const notesDisplay = document.getElementById("workoutNotesDisplay");
    const notesContent = document.getElementById("workoutNotesContent");
    if (workout.notes) {
      notesContent.textContent = workout.notes;
      notesDisplay.style.display = "block";
    } else {
      notesDisplay.style.display = "none";
    }

    this.renderWorkoutInsights(workout);
    this.renderActivityOverview();

    this.renderExerciseList();
    this.showView("exerciseListView");
  }

  renderExerciseList() {
    const container = document.getElementById("exerciseList");
    container.innerHTML = "";

    this.currentWorkout.exercises.forEach((exercise) => {
      const item = this.createExerciseItem(exercise);
      container.appendChild(item);
    });
  }

  createExerciseItem(exercise) {
    const item = document.createElement("div");
    item.className = "exercise-item";

    if (this.pairMode) {
      item.classList.add("pair-mode");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "exercise-item-checkbox";
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        this.handleExerciseSelection(exercise, checkbox);
        item.classList.toggle("selected", checkbox.checked);
      });
      item.appendChild(checkbox);
    } else {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
    }

    const content = document.createElement("div");
    content.className = "exercise-item-content";

    const details = document.createElement("div");
    details.className = "exercise-item-details";

    const name = document.createElement("div");
    name.className = "exercise-item-name";
    name.textContent = exercise.name;

    const meta = document.createElement("div");
    meta.className = "exercise-item-meta";

    const lastSession = this.getLastSession(exercise.name);
    if (lastSession) {
      const date = new Date(lastSession.date);
      meta.textContent = `Last: ${this.formatDate(date)} • ${
        lastSession.sets.length
      } sets`;
    } else {
      meta.textContent = exercise.muscle_group;
    }

    details.appendChild(name);
    details.appendChild(meta);
    content.appendChild(details);

    const status = document.createElement("div");
    status.className = "exercise-item-status";
    const completedToday = this.isExerciseCompletedToday(
      exercise,
      this.currentWorkout.id
    );

    if (completedToday) {
      item.classList.add("exercise-completed-today");
      const badge = document.createElement("span");
      badge.className = "pill pill-success";
      badge.textContent = "Completed today";
      status.appendChild(badge);
      content.appendChild(status);
    }

    const chevron = document.createElement("div");
    chevron.className = "exercise-item-chevron";
    chevron.innerHTML = `
            <svg class="icon icon-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
        `;

    item.appendChild(content);
    if (!this.pairMode) {
      item.appendChild(chevron);
    }

    if (!this.pairMode) {
      item.addEventListener("click", () => this.showExerciseDetail(exercise));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.showExerciseDetail(exercise);
        }
      });
    }

    return item;
  }

  // ============================================
  // Exercise Detail View
  // ============================================

  showExerciseDetail(exercise) {
    this.currentExercise = exercise;
    this.pairedExercises = null;

    document.getElementById("exerciseName").textContent = exercise.name;
    document.getElementById("muscleGroup").textContent = exercise.muscle_group;

    // Display form info if it exists
    const formInfoCard = document.getElementById("exerciseFormInfo");
    const formNotesDisplay = document.getElementById(
      "exerciseFormNotesDisplay"
    );
    const formVideoDisplay = document.getElementById(
      "exerciseFormVideoDisplay"
    );

    if (exercise.form_notes || exercise.form_video) {
      formInfoCard.style.display = "block";

      // Display form notes
      if (exercise.form_notes) {
        formNotesDisplay.innerHTML = `<p style="margin-bottom: var(--spacing-md); color: var(--dark-text-primary); line-height: 1.6;">${exercise.form_notes}</p>`;
      } else {
        formNotesDisplay.innerHTML = "";
      }

      // Display form video link
      if (exercise.form_video) {
        formVideoDisplay.innerHTML = `
          <a href="${exercise.form_video}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="display: inline-flex; align-items: center; gap: var(--spacing-xs);">
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Watch Form Video
          </a>
        `;
      } else {
        formVideoDisplay.innerHTML = "";
      }
    } else {
      formInfoCard.style.display = "none";
    }

    // Show single exercise view, hide paired view
    document.getElementById("singleExerciseView").classList.remove("hidden");
    document.getElementById("pairedExerciseView").classList.add("hidden");

    this.renderPreviousSession(exercise);
    this.renderSessionForm(exercise);
    this.renderSessionHistory(exercise);
    this.renderExerciseInsights(exercise);

    this.showView("exerciseDetailView");
  }

  showPairedExerciseDetail(exercise1, exercise2) {
    this.pairedExercises = [exercise1, exercise2];
    this.pairMode = false;
    this.selectedExercises = [];

    document.getElementById(
      "exerciseName"
    ).textContent = `${exercise1.name} + ${exercise2.name}`;
    document.getElementById("muscleGroup").textContent = "Paired Exercises";

    // Hide single exercise view, show paired view
    document.getElementById("singleExerciseView").classList.add("hidden");
    document.getElementById("pairedExerciseView").classList.remove("hidden");

    // Set up exercise 1
    document.getElementById("pairedExercise1Name").textContent = exercise1.name;
    document.getElementById("pairedExercise1MuscleGroup").textContent =
      exercise1.muscle_group;
    this.renderPairedPreviousSession(exercise1, "pairedPreviousSession1");
    this.renderPairedSessionForm(exercise1, "pairedSetsContainer1", 1);

    // Set up exercise 2
    document.getElementById("pairedExercise2Name").textContent = exercise2.name;
    document.getElementById("pairedExercise2MuscleGroup").textContent =
      exercise2.muscle_group;
    this.renderPairedPreviousSession(exercise2, "pairedPreviousSession2");
    this.renderPairedSessionForm(exercise2, "pairedSetsContainer2", 2);

    this.showView("exerciseDetailView");
  }

  renderPairedPreviousSession(exercise, containerId) {
    const container = document.getElementById(containerId);
    const lastSession = this.getLastSession(exercise.name);

    if (!lastSession) {
      container.innerHTML =
        '<p class="previous-session-empty">No previous session</p>';
      return;
    }

    const sessionDiv = document.createElement("div");

    lastSession.sets.forEach((set, index) => {
      const setDiv = document.createElement("div");
      setDiv.className = "previous-set";

      const label = document.createElement("span");
      label.className = "previous-set-label";
      label.textContent = `Set ${index + 1}`;

      const values = document.createElement("span");
      values.className = "previous-set-values";
      values.textContent = `${set.reps} reps × ${set.weight_kg} kg`;

      setDiv.appendChild(label);
      setDiv.appendChild(values);
      sessionDiv.appendChild(setDiv);
    });

    const meta = document.createElement("div");
    meta.className = "session-meta";
    const date = new Date(lastSession.date);
    meta.textContent = `${this.formatDate(date)}`;
    sessionDiv.appendChild(meta);

    container.innerHTML = "";
    container.appendChild(sessionDiv);
  }

  renderPairedSessionForm(exercise, containerId, exerciseNum) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const lastSession = this.getLastSession(exercise.name);
    const defaultSets = lastSession
      ? lastSession.sets.length
      : exercise.sets || 3;

    for (let i = 0; i < defaultSets; i++) {
      let defaultReps = exercise.reps;
      let defaultWeight = exercise.weight_kg;

      if (lastSession && lastSession.sets[i]) {
        defaultReps = lastSession.sets[i].reps;
        defaultWeight = lastSession.sets[i].weight_kg;
      }

      this.addPairedSetRow(exerciseNum, i + 1, defaultReps, defaultWeight);
    }
  }

  addPairedSetRow(
    exerciseNum,
    setNumber = null,
    defaultReps = "",
    defaultWeight = ""
  ) {
    const containerId = `pairedSetsContainer${exerciseNum}`;
    const container = document.getElementById(containerId);
    const currentSetCount = container.children.length;
    const setNum = setNumber || currentSetCount + 1;

    const row = document.createElement("div");
    row.className = "set-row";
    row.setAttribute("data-set-number", setNum);
    row.setAttribute("data-exercise", exerciseNum);

    row.innerHTML = `
            <div class="set-label">Set ${setNum}</div>
            <div class="input-group">
                <label for="paired${exerciseNum}-reps-${setNum}">Reps</label>
                <div class="input-with-controls">
                    <button type="button" class="btn-decrement" data-target="paired${exerciseNum}-reps-${setNum}" aria-label="Decrease reps">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14"/>
                        </svg>
                    </button>
                    <input type="number" id="paired${exerciseNum}-reps-${setNum}" value="${defaultReps}" min="0" step="1" required>
                    <button type="button" class="btn-increment" data-target="paired${exerciseNum}-reps-${setNum}" aria-label="Increase reps">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="input-group">
                <label for="paired${exerciseNum}-weight-${setNum}">Weight (kg)</label>
                <div class="input-with-controls">
                    <button type="button" class="btn-decrement" data-target="paired${exerciseNum}-weight-${setNum}" aria-label="Decrease weight">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14"/>
                        </svg>
                    </button>
                    <input type="number" id="paired${exerciseNum}-weight-${setNum}" value="${defaultWeight}" min="0" step="0.5" required>
                    <button type="button" class="btn-increment" data-target="paired${exerciseNum}-weight-${setNum}" aria-label="Increase weight">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
                        </svg>
                    </button>
                </div>
            </div>
            <button type="button" class="btn-remove" data-set="${setNum}" data-exercise="${exerciseNum}" aria-label="Remove set">
                <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

    container.appendChild(row);

    // Add event listeners
    row.querySelectorAll(".btn-increment, .btn-decrement").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetId = e.currentTarget.getAttribute("data-target");
        const input = document.getElementById(targetId);
        const step = parseFloat(input.step) || 1;
        const currentValue = parseFloat(input.value) || 0;

        if (e.currentTarget.classList.contains("btn-increment")) {
          input.value = currentValue + step;
        } else {
          input.value = Math.max(0, currentValue - step);
        }
      });
    });

    row.querySelector(".btn-remove").addEventListener("click", () => {
      row.remove();
      this.renumberPairedSets(exerciseNum);
    });
  }

  renumberPairedSets(exerciseNum) {
    const container = document.getElementById(
      `pairedSetsContainer${exerciseNum}`
    );
    Array.from(container.children).forEach((row, index) => {
      const setNum = index + 1;
      row.setAttribute("data-set-number", setNum);
      row.querySelector(".set-label").textContent = `Set ${setNum}`;
    });
  }

  savePairedSession() {
    if (!this.pairedExercises || this.pairedExercises.length !== 2) return;

    const sessions = [];

    // Save session for exercise 1
    const sets1 = this.getPairedSets(1);
    if (sets1.length > 0) {
      sessions.push({
        id: Date.now(),
        workoutId: this.currentWorkout.id,
        workoutName: this.currentWorkout.name,
        exerciseName: this.pairedExercises[0].name,
        muscleGroup: this.pairedExercises[0].muscle_group,
        date: new Date().toISOString(),
        sets: sets1,
      });
    }

    // Save session for exercise 2 (add 1ms to ensure unique ID)
    const sets2 = this.getPairedSets(2);
    if (sets2.length > 0) {
      sessions.push({
        id: Date.now() + 1,
        workoutId: this.currentWorkout.id,
        workoutName: this.currentWorkout.name,
        exerciseName: this.pairedExercises[1].name,
        muscleGroup: this.pairedExercises[1].muscle_group,
        date: new Date().toISOString(),
        sets: sets2,
      });
    }

    if (sessions.length === 0) {
      alert("Please add at least one set to each exercise");
      return;
    }

    this.sessions.push(...sessions);
    this.saveSessions();

    this.refreshInsights();

    this.showSuccessMessage("Both sessions saved successfully!");

    // Refresh the paired view
    this.showPairedExerciseDetail(
      this.pairedExercises[0],
      this.pairedExercises[1]
    );

    this.scrollToTop();
  }

  getPairedSets(exerciseNum) {
    const container = document.getElementById(
      `pairedSetsContainer${exerciseNum}`
    );
    const sets = [];

    Array.from(container.children).forEach((row) => {
      const setNum = row.getAttribute("data-set-number");
      const reps = parseInt(
        document.getElementById(`paired${exerciseNum}-reps-${setNum}`).value
      );
      const weight = parseFloat(
        document.getElementById(`paired${exerciseNum}-weight-${setNum}`).value
      );

      if (!isNaN(reps) && !isNaN(weight)) {
        sets.push({ reps, weight_kg: weight });
      }
    });

    return sets;
  }

  renderPreviousSession(exercise) {
    const container = document.getElementById("previousSession");
    const lastSession = this.getLastSession(exercise.name);

    if (!lastSession) {
      container.innerHTML =
        '<p class="previous-session-empty">No previous session recorded</p>';
      return;
    }

    const sessionDiv = document.createElement("div");

    lastSession.sets.forEach((set, index) => {
      const setDiv = document.createElement("div");
      setDiv.className = "previous-set";

      const label = document.createElement("span");
      label.className = "previous-set-label";
      label.textContent = `Set ${index + 1}`;

      const values = document.createElement("span");
      values.className = "previous-set-values";
      values.textContent = `${set.reps} reps × ${set.weight_kg} kg`;

      setDiv.appendChild(label);
      setDiv.appendChild(values);
      sessionDiv.appendChild(setDiv);
    });

    const meta = document.createElement("div");
    meta.className = "session-meta";
    const date = new Date(lastSession.date);
    meta.textContent = `Completed on ${this.formatDate(date)}`;
    sessionDiv.appendChild(meta);

    container.innerHTML = "";
    container.appendChild(sessionDiv);
  }

  renderSessionForm(exercise) {
    const container = document.getElementById("setsContainer");
    container.innerHTML = "";

    const lastSession = this.getLastSession(exercise.name);
    const defaultSets = lastSession
      ? lastSession.sets.length
      : exercise.sets || 3;

    // Create initial sets based on previous session or default
    for (let i = 0; i < defaultSets; i++) {
      let defaultReps = exercise.reps;
      let defaultWeight = exercise.weight_kg;

      // Inherit from last session if available
      if (lastSession && lastSession.sets[i]) {
        defaultReps = lastSession.sets[i].reps;
        defaultWeight = lastSession.sets[i].weight_kg;
      }

      this.addSetRow(i + 1, defaultReps, defaultWeight);
    }
  }

  addSetRow(setNumber = null, defaultReps = "", defaultWeight = "") {
    const container = document.getElementById("setsContainer");
    const currentSetCount = container.children.length;
    const setNum = setNumber || currentSetCount + 1;

    const row = document.createElement("div");
    row.className = "set-row";
    row.setAttribute("data-set-number", setNum);

    row.innerHTML = `
            <div class="set-label">Set ${setNum}</div>
            <div class="input-group">
                <label for="reps-${setNum}">Reps</label>
                <div class="input-with-controls">
                    <button type="button" class="btn-decrement" data-target="reps-${setNum}" aria-label="Decrease reps">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14"/>
                        </svg>
                    </button>
                    <input type="number" id="reps-${setNum}" name="reps-${setNum}" value="${defaultReps}" min="0" step="1" required>
                    <button type="button" class="btn-increment" data-target="reps-${setNum}" aria-label="Increase reps">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="input-group">
                <label for="weight-${setNum}">Weight (kg)</label>
                <div class="input-with-controls">
                    <button type="button" class="btn-decrement" data-target="weight-${setNum}" aria-label="Decrease weight">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14"/>
                        </svg>
                    </button>
                    <input type="number" id="weight-${setNum}" name="weight-${setNum}" value="${defaultWeight}" min="0" step="0.5" required>
                    <button type="button" class="btn-increment" data-target="weight-${setNum}" aria-label="Increase weight">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
                        </svg>
                    </button>
                </div>
            </div>
            <button type="button" class="btn-remove" data-set="${setNum}" aria-label="Remove set">
                <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

    container.appendChild(row);

    // Add event listeners for increment/decrement buttons
    row.querySelectorAll(".btn-increment, .btn-decrement").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetId = e.currentTarget.getAttribute("data-target");
        const input = document.getElementById(targetId);
        const step = parseFloat(input.step) || 1;
        const currentValue = parseFloat(input.value) || 0;

        if (e.currentTarget.classList.contains("btn-increment")) {
          input.value = currentValue + step;
        } else {
          input.value = Math.max(0, currentValue - step);
        }
      });
    });

    // Add event listener for remove button
    row.querySelector(".btn-remove").addEventListener("click", () => {
      row.remove();
      this.renumberSets();
    });
  }

  renumberSets() {
    const container = document.getElementById("setsContainer");
    Array.from(container.children).forEach((row, index) => {
      const setNum = index + 1;
      row.setAttribute("data-set-number", setNum);
      row.querySelector(".set-label").textContent = `Set ${setNum}`;
    });
  }

  saveSession() {
    const container = document.getElementById("setsContainer");
    const sets = [];

    Array.from(container.children).forEach((row) => {
      const setNum = row.getAttribute("data-set-number");
      const reps = parseInt(document.getElementById(`reps-${setNum}`).value);
      const weight = parseFloat(
        document.getElementById(`weight-${setNum}`).value
      );

      sets.push({ reps, weight_kg: weight });
    });

    if (sets.length === 0) {
      alert("Please add at least one set");
      return;
    }

    const session = {
      id: Date.now(),
      workoutId: this.currentWorkout.id,
      workoutName: this.currentWorkout.name,
      exerciseName: this.currentExercise.name,
      muscleGroup: this.currentExercise.muscle_group,
      date: new Date().toISOString(),
      sets: sets,
    };

    this.sessions.push(session);
    this.saveSessions();
    this.refreshInsights();

    // Refresh the view
    this.showExerciseDetail(this.currentExercise);

    this.scrollToTop();

    // Show success feedback
    this.showSuccessMessage("Session saved successfully!");
  }

  renderSessionHistory(exercise) {
    const container = document.getElementById("sessionHistory");
    const history = this.getSessionHistory(exercise.name);

    if (history.length === 0) {
      container.innerHTML =
        '<p class="session-history-empty">No session history yet</p>';
      return;
    }

    container.innerHTML = "";

    // Show last 5 sessions
    history.slice(0, 5).forEach((session) => {
      const item = document.createElement("div");
      item.className = "history-item";

      const date = document.createElement("div");
      date.className = "history-item-date";
      date.textContent = this.formatDate(new Date(session.date));

      const setsDiv = document.createElement("div");
      setsDiv.className = "history-item-sets";

      session.sets.forEach((set, index) => {
        const setDiv = document.createElement("div");
        setDiv.className = "history-set";

        const label = document.createElement("span");
        label.className = "history-set-label";
        label.textContent = `Set ${index + 1}`;

        const values = document.createElement("span");
        values.className = "history-set-values";
        values.textContent = `${set.reps} reps × ${set.weight_kg} kg`;

        setDiv.appendChild(label);
        setDiv.appendChild(values);
        setsDiv.appendChild(setDiv);
      });

      item.appendChild(date);
      item.appendChild(setsDiv);
      container.appendChild(item);
    });
  }

  // ============================================
  // Insights and Visualizations
  // ============================================

  refreshInsights() {
    this.renderWorkoutList();
    if (this.currentWorkout) {
      this.renderExerciseList();
    }
    this.renderActivityOverview();
    this.renderWorkoutOverview();
    if (this.currentWorkout) {
      this.renderWorkoutInsights(this.currentWorkout);
    }
    if (this.currentExercise) {
      this.renderExerciseInsights(this.currentExercise);
    }
  }

  renderActivityOverview() {
    const days = 14;
    const dailyCounts = this.getDailyExerciseCounts(days);
    const total = dailyCounts.reduce((sum, day) => sum + day.value, 0);

    const trendText = this.describeTrend(
      dailyCounts.slice(-7),
      dailyCounts.slice(0, dailyCounts.length - 7)
    );

    const totalEl = document.getElementById("activityTotal");
    const trendEl = document.getElementById("activityTrend");

    if (!totalEl || !trendEl) return;

    totalEl.textContent = `${total} entries`;
    trendEl.textContent = trendText;

    this.renderMiniBarChart(
      "activityChart",
      dailyCounts.map((day) => ({
        label: day.label,
        value: day.value,
      }))
    );
  }

  renderWorkoutOverview() {
    const days = 14;
    const dailyCounts = this.getOverallWorkoutCounts(days);
    const total = dailyCounts.reduce((sum, day) => sum + day.value, 0);
    const trendText = this.describeTrend(
      dailyCounts.slice(-7),
      dailyCounts.slice(0, dailyCounts.length - 7)
    );

    const frequency = document.getElementById("workoutFrequency");
    const trend = document.getElementById("workoutTrend");

    if (!frequency || !trend) return;

    frequency.textContent = `${total} workouts`;
    trend.textContent = trendText;

    this.renderMiniBarChart(
      "workoutChart",
      dailyCounts.map((day) => ({
        label: day.label,
        value: day.value,
      }))
    );
  }

  renderWorkoutInsights(workout) {
    const days = 14;
    const history = this.sessions.filter((s) => s.workoutId === workout.id);
    const lastSession = history.length > 0 ? history.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
    const recencyEl = document.getElementById("workoutRecency");
    const trendEl = document.getElementById("currentWorkoutTrend");

    if (!recencyEl || !trendEl) return;

    if (!lastSession) {
      recencyEl.textContent = "Not logged yet";
      trendEl.textContent = "Log a workout to see momentum";
      this.renderMiniBarChart("currentWorkoutChart", []);
      return;
    }

    const dailyCounts = this.getWorkoutDailyCounts(workout.id, days);
    const total = dailyCounts.reduce((sum, day) => sum + day.value, 0);
    recencyEl.textContent = `${total} in ${days} days`;

    trendEl.textContent = this.describeTrend(
      dailyCounts.slice(-7),
      dailyCounts.slice(0, dailyCounts.length - 7)
    );

    this.renderMiniBarChart(
      "currentWorkoutChart",
      dailyCounts.map((day) => ({
        label: day.label,
        value: day.value,
      }))
    );
  }

  renderExerciseInsights(exercise) {
    const history = this.getSessionHistory(exercise.name);
    const recencyEl = document.getElementById("exerciseRecency");
    const lastPerformedEl = document.getElementById("exerciseLastPerformed");
    const countEl = document.getElementById("exerciseSessionCount");
    const averageEl = document.getElementById("exerciseAverage");
    const trendEl = document.getElementById("exerciseTrend");

    if (!recencyEl) return;

    if (history.length === 0) {
      recencyEl.textContent = "Not logged yet";
      lastPerformedEl.textContent = "—";
      countEl.textContent = "0 sessions";
      averageEl.textContent = "—";
      trendEl.textContent = "Log your first sets to see trends";
      this.renderMiniBarChart("exerciseChart", []);
      return;
    }

    const last = history[0];
    const totalSessions = history.length;
    const volumes = history.map((session) =>
      session.sets.reduce(
        (sum, set) => sum + (set.weight_kg || 0) * (set.reps || 0),
        0
      )
    );

    const averageVolume =
      volumes.length > 0
        ? Math.round((volumes.reduce((a, b) => a + b, 0) / volumes.length) * 10) /
          10
        : 0;

    recencyEl.textContent = this.formatDate(new Date(last.date));
    lastPerformedEl.textContent = this.formatDate(new Date(last.date));
    countEl.textContent = `${totalSessions} session${totalSessions === 1 ? "" : "s"}`;
    averageEl.textContent = averageVolume
      ? `${averageVolume} kg-reps per session`
      : "—";

    const recentSessions = history.slice(0, 10).reverse();

    this.renderMiniBarChart(
      "exerciseChart",
      recentSessions.map((session) => ({
        label: this.formatShortDate(new Date(session.date)),
        value: session.sets.reduce(
          (sum, set) => sum + (set.weight_kg || 0) * (set.reps || 0),
          0
        ),
      }))
    );

    trendEl.textContent = this.describeTrend(
      recentSessions.slice(-5),
      recentSessions.slice(0, Math.max(0, recentSessions.length - 5))
    );
  }

  renderMiniBarChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (!data || data.length === 0) {
      const empty = document.createElement("p");
      empty.className = "chart-caption";
      empty.textContent = "No data yet";
      container.appendChild(empty);
      return;
    }

    const maxValue = Math.max(...data.map((d) => d.value), 1);

    data.forEach((entry) => {
      const bar = document.createElement("div");
      bar.className = "mini-bar";
      bar.style.height = `${(entry.value / maxValue) * 100}%`;
      bar.setAttribute("data-label", entry.label);
      bar.title = `${entry.label}: ${entry.value}`;
      container.appendChild(bar);
    });
  }

  getDailyExerciseCounts(days = 14) {
    const today = new Date();
    const counts = new Map();

    this.sessions.forEach((session) => {
      const key = session.date.split("T")[0];
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().split("T")[0];
      results.push({
        label: this.formatShortDate(date),
        value: counts.get(key) || 0,
      });
    }

    return results;
  }

  getWorkoutDailyCounts(workoutId, days = 14) {
    const today = new Date();
    const counts = new Map();

    this.sessions
      .filter((s) => s.workoutId === workoutId)
      .forEach((session) => {
        const key = session.date.split("T")[0];
        counts.set(key, (counts.get(key) || 0) + 1);
      });

    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().split("T")[0];
      results.push({
        label: this.formatShortDate(date),
        value: counts.get(key) || 0,
      });
    }
    return results;
  }

  getOverallWorkoutCounts(days = 14) {
    const today = new Date();
    const counts = new Map();

    this.sessions.forEach((session) => {
      const key = session.date.split("T")[0];
      if (!counts.has(key)) {
        counts.set(key, new Set());
      }
      counts.get(key).add(session.workoutId || session.workoutName);
    });

    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().split("T")[0];
      const set = counts.get(key);
      results.push({
        label: this.formatShortDate(date),
        value: set ? set.size : 0,
      });
    }
    return results;
  }

  describeTrend(recentSlice, previousSlice) {
    const recentTotal = recentSlice.reduce((sum, day) => sum + day.value, 0);
    const previousTotal = previousSlice.reduce((sum, day) => sum + day.value, 0);

    if (recentTotal === 0 && previousTotal === 0) {
      return "No activity yet";
    }

    if (previousTotal === 0) {
      return "Great start — keep going!";
    }

    const delta = recentTotal - previousTotal;
    const pct = Math.round((delta / previousTotal) * 100);

    if (delta > 0) {
      return `Up ${pct}% vs last period`;
    }

    if (delta < 0) {
      return `Down ${Math.abs(pct)}% vs last period`;
    }

    return "Holding steady";
  }

  // ============================================
  // Onboarding
  // ============================================

  setupOnboarding() {
    this.onboardingSteps = [
      {
        title: "Welcome to Workout Tracker",
        body:
          "Track workouts, log sets, and keep your routine consistent. Let's take a 30-second tour.",
        viewId: "workoutListView",
      },
      {
        title: "Pick a workout",
        body:
          "Start on the home screen, tap a workout, and you'll see the exercises inside. Add your own anytime via Manage.",
        viewId: "workoutListView",
        focusSelector: "#workoutList .workout-card",
        prepare: () => {
          this.showView("workoutListView");
        },
      },
      {
        title: "Log sets with ease",
        body:
          "Open an exercise to see your last session, add sets with reps and weight, and save to build history.",
        viewId: "exerciseDetailView",
        focusId: "sessionForm",
        prepare: () => {
          this.openFirstExerciseDetailForOnboarding();
        },
      },
      {
        title: "Click 'Manage' to add and edit exercises and workouts",
        body:
          "Use the Manage menu to create workouts, tweak exercises, and keep your library organized.",
        viewId: "workoutListView",
        focusId: "manageBtn",
        prepare: () => {
          this.showView("workoutListView");
        },
      },
    ];

    this.renderOnboardingDots();

    const seenTour = localStorage.getItem("onboardingSeen");
    if (!seenTour) {
      this.onboardingStep = 0;
      this.showOnboarding();
    } else {
      this.hideOnboarding();
    }
  }

  showOnboarding() {
    const overlay = document.getElementById("onboardingOverlay");
    overlay.classList.remove("hidden");
    this.syncOnboardingContent();
  }

  hideOnboarding() {
    const overlay = document.getElementById("onboardingOverlay");
    overlay.classList.add("hidden");
  }

  syncOnboardingContent() {
    const step = this.onboardingSteps[this.onboardingStep];
    const titleEl = document.getElementById("onboardingTitle");
    const bodyEl = document.getElementById("onboardingBody");
    const backBtn = document.getElementById("onboardingBack");
    const nextBtn = document.getElementById("onboardingNext");

    if (!step) return;

    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;

    backBtn.disabled = this.onboardingStep === 0;
    nextBtn.textContent =
      this.onboardingStep === this.onboardingSteps.length - 1
        ? "Finish"
        : "Next";

    document.querySelectorAll(".onboarding-dot").forEach((dot) => {
      dot.classList.toggle(
        "active",
        parseInt(dot.dataset.step) === this.onboardingStep
      );
    });

    this.applyOnboardingStepContext(step);
  }

  advanceOnboarding() {
    if (this.onboardingStep < this.onboardingSteps.length - 1) {
      this.onboardingStep += 1;
      this.syncOnboardingContent();
      return;
    }
    this.dismissOnboarding();
  }

  rewindOnboarding() {
    if (this.onboardingStep === 0) return;
    this.onboardingStep -= 1;
    this.syncOnboardingContent();
  }

  dismissOnboarding() {
    localStorage.setItem("onboardingSeen", "true");
    this.hideOnboarding();
    if (this.onboardingFocusElement) {
      this.onboardingFocusElement.classList.remove("tour-highlight");
      this.onboardingFocusElement = null;
    }
  }

  renderOnboardingDots() {
    const container = document.querySelector(".onboarding-progress");
    if (!container) return;

    container.innerHTML = "";
    this.onboardingSteps.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = "onboarding-dot";
      dot.dataset.step = index;
      container.appendChild(dot);
    });
  }

  openFirstWorkoutForOnboarding() {
    const workout = this.workouts[0];
    if (!workout) return null;

    this.currentWorkout = workout;
    this.showExerciseList(workout);
    return workout;
  }

  openFirstExerciseDetailForOnboarding() {
    const workout = this.openFirstWorkoutForOnboarding();
    if (!workout || !workout.exercises?.length) return null;

    const exercise = workout.exercises[0];
    this.showExerciseDetail(exercise);
    return exercise;
  }

  applyOnboardingStepContext(step) {
    if (!step) return;

    if (typeof step.prepare === "function") {
      step.prepare();
    } else if (step.viewId) {
      if (step.viewId === "exerciseListView") {
        const workout = this.currentWorkout || this.workouts[0];
        if (workout) {
          this.showExerciseList(workout);
        }
      } else {
        this.showView(step.viewId);
      }
    }

    if (this.onboardingFocusElement) {
      this.onboardingFocusElement.classList.remove("tour-highlight");
    }

    const target =
      (step.focusId && document.getElementById(step.focusId)) ||
      (step.focusSelector && document.querySelector(step.focusSelector));

    if (target) {
      target.classList.add("tour-highlight");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      this.onboardingFocusElement = target;
      return;
    }

    this.onboardingFocusElement = null;
  }

  // ============================================
  // Management View
  // ============================================

  showManagementView() {
    document.getElementById("managementView").classList.remove("hidden");
    this.renderExerciseLibrary();
    this.renderWorkoutManager();
    this.renderExerciseSelector();
  }

  hideManagementView() {
    document.getElementById("managementView").classList.add("hidden");
  }

  switchManagementTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".management-tab").forEach((tab) => {
      tab.classList.remove("active");
      if (tab.dataset.tab === tabName) {
        tab.classList.add("active");
      }
    });

    // Update tab content
    document.querySelectorAll(".management-tab-content").forEach((content) => {
      content.classList.remove("active");
    });

    if (tabName === "exercises") {
      document.getElementById("exercisesTab").classList.add("active");
    } else if (tabName === "workouts") {
      document.getElementById("workoutsTab").classList.add("active");
      this.renderExerciseSelector();
    }
  }

  createExercise() {
    const name = document.getElementById("exerciseName").value.trim();
    const muscleGroup = document.getElementById("muscleGroup").value;
    const sets = parseInt(document.getElementById("defaultSets").value) || null;
    const reps = parseInt(document.getElementById("defaultReps").value) || null;
    const weight =
      parseFloat(document.getElementById("defaultWeight").value) || null;
    const formNotes =
      document.getElementById("exerciseFormNotes").value.trim() || null;
    const formVideo =
      document.getElementById("exerciseFormVideo").value.trim() || null;

    if (!name || !muscleGroup) {
      alert("Please fill in required fields");
      return;
    }

    // Check if exercise already exists
    if (
      this.exerciseLibrary.find(
        (e) => e.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      alert("An exercise with this name already exists");
      return;
    }

    const exercise = {
      name,
      muscle_group: muscleGroup,
      sets,
      reps,
      weight_kg: weight,
      notes: null,
      form_notes: formNotes,
      form_video: formVideo,
    };

    this.exerciseLibrary.push(exercise);
    this.saveExerciseLibrary();

    // Reset form
    document.getElementById("createExerciseForm").reset();

    // Refresh library display
    this.renderExerciseLibrary();
    this.renderExerciseSelector();

    this.showSuccessMessage(`Exercise "${name}" created!`);
  }

  openEditExercise(exerciseName) {
    const exercise = this.exerciseLibrary.find((e) => e.name === exerciseName);
    if (!exercise) return;

    document.getElementById("editExerciseOriginalName").value = exercise.name;
    document.getElementById("editExerciseName").value = exercise.name;
    document.getElementById("editMuscleGroup").value = exercise.muscle_group;
    document.getElementById("editDefaultSets").value = exercise.sets || "";
    document.getElementById("editDefaultReps").value = exercise.reps || "";
    document.getElementById("editDefaultWeight").value =
      exercise.weight_kg || "";
    document.getElementById("editExerciseFormNotes").value =
      exercise.form_notes || "";
    document.getElementById("editExerciseFormVideo").value =
      exercise.form_video || "";

    document.getElementById("editExerciseModal").classList.remove("hidden");
  }

  hideEditExerciseModal() {
    document.getElementById("editExerciseModal").classList.add("hidden");
    document.getElementById("editExerciseForm").reset();
  }

  saveExerciseEdit() {
    const originalName =
      document.getElementById("editExerciseOriginalName").value;
    const newName = document.getElementById("editExerciseName").value.trim();
    const muscleGroup = document.getElementById("editMuscleGroup").value;
    const sets = parseInt(document.getElementById("editDefaultSets").value) || null;
    const reps = parseInt(document.getElementById("editDefaultReps").value) || null;
    const weight =
      parseFloat(document.getElementById("editDefaultWeight").value) || null;
    const formNotes =
      document.getElementById("editExerciseFormNotes").value.trim() || null;
    const formVideo =
      document.getElementById("editExerciseFormVideo").value.trim() || null;

    if (!newName || !muscleGroup) {
      alert("Please fill in required fields");
      return;
    }

    const duplicateName = this.exerciseLibrary.some(
      (exercise) =>
        exercise.name.toLowerCase() === newName.toLowerCase() &&
        exercise.name !== originalName
    );

    if (duplicateName) {
      alert("An exercise with this name already exists");
      return;
    }

    const exercise = this.exerciseLibrary.find((e) => e.name === originalName);
    if (!exercise) return;

    exercise.name = newName;
    exercise.muscle_group = muscleGroup;
    exercise.sets = sets;
    exercise.reps = reps;
    exercise.weight_kg = weight;
    exercise.form_notes = formNotes;
    exercise.form_video = formVideo;

    this.updateExerciseInWorkouts(originalName, exercise);
    this.updateSessionsForExercise(originalName, exercise);

    this.saveExerciseLibrary();
    this.saveWorkouts();
    this.saveSessions();

    if (this.currentExercise && this.currentExercise.name === originalName) {
      const updated = this.currentWorkout?.exercises.find(
        (ex) => ex.name === exercise.name
      );
      this.currentExercise = updated || exercise;
      this.showExerciseDetail(this.currentExercise);
    }

    this.renderExerciseLibrary();
    this.renderExerciseSelector();
    this.renderWorkoutManager();
    this.renderWorkoutList();
    if (this.currentWorkout) {
      this.renderExerciseList();
    }

    this.hideEditExerciseModal();
    this.refreshInsights();
    this.showSuccessMessage(`Exercise "${newName}" updated`);
  }

  updateExerciseInWorkouts(originalName, updatedExercise) {
    this.workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (exercise.name === originalName) {
          exercise.name = updatedExercise.name;
          exercise.muscle_group = updatedExercise.muscle_group;
          exercise.sets = updatedExercise.sets;
          exercise.reps = updatedExercise.reps;
          exercise.weight_kg = updatedExercise.weight_kg;
          exercise.form_notes = updatedExercise.form_notes;
          exercise.form_video = updatedExercise.form_video;
        }
      });
    });
  }

  updateSessionsForExercise(originalName, updatedExercise) {
    this.sessions.forEach((session) => {
      if (session.exerciseName === originalName) {
        session.exerciseName = updatedExercise.name;
        session.muscleGroup = updatedExercise.muscle_group;
      }
    });
  }

  deleteExercise(exerciseName) {
    if (
      !confirm(
        `Delete "${exerciseName}"? This will remove it from all workouts.`
      )
    ) {
      return;
    }

    // Remove from library
    this.exerciseLibrary = this.exerciseLibrary.filter(
      (e) => e.name !== exerciseName
    );
    this.saveExerciseLibrary();

    // Remove from all workouts
    this.workouts.forEach((workout) => {
      workout.exercises = workout.exercises.filter(
        (e) => e.name !== exerciseName
      );
    });
    this.saveWorkouts();

    // Refresh displays
    this.renderExerciseLibrary();
    this.renderWorkoutManager();
    this.renderWorkoutList();

    this.showSuccessMessage(`Exercise "${exerciseName}" deleted`);
  }

  renderExerciseLibrary() {
    const container = document.getElementById("exerciseLibrary");

    if (this.exerciseLibrary.length === 0) {
      container.innerHTML =
        '<p class="exercise-selector-empty">No exercises yet. Create one above!</p>';
      return;
    }

    container.innerHTML = "";

    // Sort alphabetically
    const sorted = [...this.exerciseLibrary].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const filtered = sorted.filter((exercise) =>
      this.matchesExerciseLibraryFilters(exercise)
    );

    if (filtered.length === 0) {
      container.innerHTML =
        '<p class="exercise-selector-empty">No exercises match your filters.</p>';
      return;
    }

    filtered.forEach((exercise) => {
      const item = document.createElement("div");
      item.className = "exercise-library-item";
      item.dataset.muscleGroup = exercise.muscle_group;

      const info = document.createElement("div");
      info.className = "exercise-library-info";

      const name = document.createElement("div");
      name.className = "exercise-library-name";
      name.textContent = exercise.name;

      const meta = document.createElement("div");
      meta.className = "exercise-library-meta";
      const parts = [exercise.muscle_group];
      if (exercise.sets) parts.push(`${exercise.sets} sets`);
      if (exercise.reps) parts.push(`${exercise.reps} reps`);
      if (exercise.weight_kg) parts.push(`${exercise.weight_kg} kg`);
      meta.textContent = parts.join(" • ");

      info.appendChild(name);
      info.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "exercise-library-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-secondary";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () =>
        this.openEditExercise(exercise.name)
      );

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () =>
        this.deleteExercise(exercise.name)
      );

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      item.appendChild(info);
      item.appendChild(actions);
      container.appendChild(item);
    });
  }

  matchesExerciseLibraryFilters(exercise) {
    const search = this.exerciseLibraryFilters.search;
    const muscles = this.exerciseLibraryFilters.muscles;

    const matchesSearch =
      !search || exercise.name.toLowerCase().includes(search);

    const matchesMuscle =
      muscles.size === 0 || muscles.has(exercise.muscle_group);

    return matchesSearch && matchesMuscle;
  }

  renderExerciseSelector() {
    const container = document.getElementById("exerciseSelector");

    if (this.exerciseLibrary.length === 0) {
      container.innerHTML =
        '<p class="exercise-selector-empty">No exercises available. Create some in the Exercises tab first.</p>';
      return;
    }

    container.innerHTML = "";

    // Sort alphabetically
    const sorted = [...this.exerciseLibrary].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    sorted.forEach((exercise) => {
      const item = document.createElement("div");
      item.className = "exercise-selector-item";
      item.dataset.muscleGroup = exercise.muscle_group;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `select-${exercise.name}`;
      checkbox.value = exercise.name;

      const label = document.createElement("label");
      label.htmlFor = `select-${exercise.name}`;
      label.textContent = `${exercise.name} (${exercise.muscle_group})`;

      item.appendChild(checkbox);
      item.appendChild(label);
      container.appendChild(item);
    });
  }

  createWorkout() {
    const name = document.getElementById("workoutName").value.trim();
    const notes = document.getElementById("workoutNotes").value.trim() || null;
    const selectedCheckboxes = document.querySelectorAll(
      '#exerciseSelector input[type="checkbox"]:checked'
    );

    if (!name) {
      alert("Please enter a workout name");
      return;
    }

    if (selectedCheckboxes.length === 0) {
      alert("Please select at least one exercise");
      return;
    }

    const exerciseNames = Array.from(selectedCheckboxes).map((cb) => cb.value);
    const exercises = exerciseNames.map((name) => {
      const exercise = this.exerciseLibrary.find((e) => e.name === name);
      return { ...exercise };
    });

    const workout = {
      id: Date.now(),
      name,
      notes,
      date: null,
      exercises,
    };

    this.workouts.push(workout);
    this.saveWorkouts();

    // Reset form
    document.getElementById("createWorkoutForm").reset();
    selectedCheckboxes.forEach((cb) => (cb.checked = false));

    // Refresh displays
    this.renderWorkoutManager();
    this.renderWorkoutList();

    this.showSuccessMessage(
      `Workout "${name}" created with ${exercises.length} exercises!`
    );
  }

  deleteWorkout(workoutId) {
    const workout = this.workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    if (!confirm(`Delete workout "${workout.name}"?`)) {
      return;
    }

    this.workouts = this.workouts.filter((w) => w.id !== workoutId);
    this.saveWorkouts();

    this.renderWorkoutManager();
    this.renderWorkoutList();

    this.showSuccessMessage(`Workout "${workout.name}" deleted`);
  }

  editWorkout(workoutId) {
    const workout = this.workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    // Populate the edit form
    document.getElementById("editWorkoutId").value = workout.id;
    document.getElementById("editWorkoutName").value = workout.name;
    document.getElementById("editWorkoutNotes").value = workout.notes || "";

    // Render exercise selector with current exercises checked
    this.renderEditExerciseSelector(workout.exercises);

    // Show the edit modal
    document.getElementById("editWorkoutModal").classList.remove("hidden");
  }

  hideEditWorkoutModal() {
    document.getElementById("editWorkoutModal").classList.add("hidden");
    document.getElementById("editWorkoutForm").reset();
  }

  renderEditExerciseSelector(currentExercises) {
    const container = document.getElementById("editExerciseSelector");

    if (this.exerciseLibrary.length === 0) {
      container.innerHTML =
        '<p class="exercise-selector-empty">No exercises available.</p>';
      return;
    }

    container.innerHTML = "";

    // Create a set of current exercise names for quick lookup
    const currentExerciseNames = new Set(currentExercises.map((e) => e.name));

    // Sort alphabetically
    const sorted = [...this.exerciseLibrary].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    sorted.forEach((exercise) => {
      const item = document.createElement("div");
      item.className = "exercise-selector-item";
      item.dataset.muscleGroup = exercise.muscle_group;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `edit-select-${exercise.name}`;
      checkbox.value = exercise.name;
      checkbox.checked = currentExerciseNames.has(exercise.name);

      // Add event listener to update selected list
      checkbox.addEventListener("change", () => {
        this.updateEditSelectedExercises();
      });

      const label = document.createElement("label");
      label.htmlFor = `edit-select-${exercise.name}`;
      label.textContent = `${exercise.name} (${exercise.muscle_group})`;

      item.appendChild(checkbox);
      item.appendChild(label);
      container.appendChild(item);
    });

    // Add selected exercises display with drag-and-drop reordering
    this.renderSelectedExercisesForEdit(currentExercises);
  }

  updateEditSelectedExercises() {
    // Get all checked exercises in their current order
    const checkboxes = document.querySelectorAll(
      '#editExerciseSelector input[type="checkbox"]:checked'
    );
    const selectedNames = Array.from(checkboxes).map((cb) => cb.value);
    const exercises = selectedNames
      .map((name) => {
        return this.exerciseLibrary.find((e) => e.name === name);
      })
      .filter((e) => e); // Remove any not found

    this.renderSelectedExercisesForEdit(exercises);
  }

  renderSelectedExercisesForEdit(exercises) {
    // Find or create the selected exercises container
    let selectedContainer = document.getElementById("editSelectedExercises");
    if (!selectedContainer) {
      const form = document
        .getElementById("editExerciseSelector")
        .closest(".form-group");
      selectedContainer = document.createElement("div");
      selectedContainer.id = "editSelectedExercises";
      selectedContainer.className = "selected-exercises-list";
      form.appendChild(selectedContainer);
    }

    if (exercises.length === 0) {
      selectedContainer.innerHTML = "";
      selectedContainer.style.display = "none";
      return;
    }

    selectedContainer.style.display = "block";
    selectedContainer.innerHTML =
      '<h4 class="selected-exercises-title">Selected Exercises (hold and drag to reorder)</h4>';

    exercises.forEach((exercise, index) => {
      const item = document.createElement("div");
      item.className = "selected-exercise-item";
      item.draggable = true;
      item.dataset.exerciseName = exercise.name;
      item.dataset.index = index;

      item.innerHTML = `
        <svg class="drag-handle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M3 12h18M3 17h18" />
        </svg>
        <span class="selected-exercise-name">${exercise.name}</span>
        <span class="selected-exercise-muscle">${exercise.muscle_group}</span>
      `;

      // Drag events
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index);
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggingItem = selectedContainer.querySelector(".dragging");
        if (draggingItem && draggingItem !== item) {
          const rect = item.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (e.clientY < midpoint) {
            item.parentNode.insertBefore(draggingItem, item);
          } else {
            item.parentNode.insertBefore(draggingItem, item.nextSibling);
          }
        }
      });

      selectedContainer.appendChild(item);
    });
  }

  saveWorkoutEdit() {
    const workoutId = parseInt(document.getElementById("editWorkoutId").value);
    const name = document.getElementById("editWorkoutName").value.trim();
    const notes =
      document.getElementById("editWorkoutNotes").value.trim() || null;

    // Get exercises in the order they appear in the selected list (if it exists)
    const selectedContainer = document.getElementById("editSelectedExercises");
    let exercises;

    if (selectedContainer && selectedContainer.style.display !== "none") {
      // Use the reordered list
      const selectedItems = selectedContainer.querySelectorAll(
        ".selected-exercise-item"
      );
      const exerciseNames = Array.from(selectedItems).map(
        (item) => item.dataset.exerciseName
      );
      exercises = exerciseNames.map((name) => {
        const exercise = this.exerciseLibrary.find((e) => e.name === name);
        return { ...exercise };
      });
    } else {
      // Fallback to checkboxes
      const selectedCheckboxes = document.querySelectorAll(
        '#editExerciseSelector input[type="checkbox"]:checked'
      );
      const exerciseNames = Array.from(selectedCheckboxes).map(
        (cb) => cb.value
      );
      exercises = exerciseNames.map((name) => {
        const exercise = this.exerciseLibrary.find((e) => e.name === name);
        return { ...exercise };
      });
    }

    if (!name) {
      alert("Please enter a workout name");
      return;
    }

    if (exercises.length === 0) {
      alert("Please select at least one exercise");
      return;
    }

    // Find and update the workout
    const workoutIndex = this.workouts.findIndex((w) => w.id === workoutId);
    if (workoutIndex === -1) {
      alert("Workout not found");
      return;
    }

    this.workouts[workoutIndex] = {
      ...this.workouts[workoutIndex],
      name,
      notes,
      exercises,
    };

    this.saveWorkouts();

    // Close modal
    this.hideEditWorkoutModal();

    // Refresh displays
    this.renderWorkoutManager();
    this.renderWorkoutList();

    this.showSuccessMessage(`Workout "${name}" updated!`);
  }

  renderWorkoutManager() {
    const container = document.getElementById("workoutManager");

    if (this.workouts.length === 0) {
      container.innerHTML =
        '<p class="exercise-selector-empty">No workouts yet. Create one above!</p>';
      return;
    }

    container.innerHTML = "";

    this.workouts.forEach((workout) => {
      const item = document.createElement("div");
      item.className = "workout-manager-item";

      const header = document.createElement("div");
      header.className = "workout-manager-header";

      const name = document.createElement("div");
      name.className = "workout-manager-name";
      name.textContent = workout.name;

      const actions = document.createElement("div");
      actions.className = "workout-manager-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-secondary btn-sm";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => this.editWorkout(workout.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => this.deleteWorkout(workout.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      header.appendChild(name);
      header.appendChild(actions);

      const exercises = document.createElement("ul");
      exercises.className = "workout-manager-exercises";
      workout.exercises.forEach((exercise) => {
        const li = document.createElement("li");
        li.textContent = `${exercise.name} (${exercise.muscle_group})`;
        exercises.appendChild(li);
      });

      item.appendChild(header);
      item.appendChild(exercises);
      container.appendChild(item);
    });
  }

  // ============================================
  // Helper Functions
  // ============================================

  exportData() {
    const exportData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      sessions: this.sessions,
      workouts: this.workouts,
      exerciseLibrary: this.exerciseLibrary,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;

    const dateStr = new Date().toISOString().split("T")[0];
    link.download = `workout-tracker-backup-${dateStr}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const totalItems =
      this.sessions.length + this.workouts.length + this.exerciseLibrary.length;
    this.showSuccessMessage(
      `Data exported! ${this.sessions.length} sessions, ${this.workouts.length} workouts, ${this.exerciseLibrary.length} exercises`
    );
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // Validate the data structure
        if (!importedData.sessions || !Array.isArray(importedData.sessions)) {
          throw new Error("Invalid data format - sessions missing or invalid");
        }

        // Build confirmation message
        let confirmMsg = "Import Data:\n\n";
        confirmMsg += `• ${importedData.sessions.length} sessions\n`;

        if (importedData.workouts) {
          confirmMsg += `• ${importedData.workouts.length} workouts\n`;
        }

        if (importedData.exerciseLibrary) {
          confirmMsg += `• ${importedData.exerciseLibrary.length} exercises\n`;
        }

        confirmMsg +=
          "\nExisting data will be merged (duplicates skipped).\n\nContinue?";

        if (!confirm(confirmMsg)) {
          event.target.value = "";
          return;
        }

        let results = {
          sessions: { added: 0, skipped: 0 },
          workouts: { added: 0, skipped: 0 },
          exercises: { added: 0, skipped: 0 },
        };

        // Import sessions
        const existingSessionIds = new Set(this.sessions.map((s) => s.id));
        importedData.sessions.forEach((session) => {
          if (!existingSessionIds.has(session.id)) {
            this.sessions.push(session);
            results.sessions.added++;
          } else {
            results.sessions.skipped++;
          }
        });

        // Import workouts (if present)
        if (importedData.workouts && Array.isArray(importedData.workouts)) {
          const existingWorkoutIds = new Set(this.workouts.map((w) => w.id));
          importedData.workouts.forEach((workout) => {
            if (!existingWorkoutIds.has(workout.id)) {
              this.workouts.push(workout);
              results.workouts.added++;
            } else {
              results.workouts.skipped++;
            }
          });
        }

        // Import exercise library (if present)
        if (
          importedData.exerciseLibrary &&
          Array.isArray(importedData.exerciseLibrary)
        ) {
          const existingExerciseNames = new Set(
            this.exerciseLibrary.map((e) => e.name.toLowerCase())
          );
          importedData.exerciseLibrary.forEach((exercise) => {
            if (!existingExerciseNames.has(exercise.name.toLowerCase())) {
              this.exerciseLibrary.push(exercise);
              results.exercises.added++;
            } else {
              results.exercises.skipped++;
            }
          });
        }

        // Sort sessions by date (newest first)
        this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Save everything
        this.saveSessions();
        this.saveWorkouts();
        this.saveExerciseLibrary();

        // Refresh all views
        this.renderWorkoutList();
        if (this.currentExercise) {
          this.showExerciseDetail(this.currentExercise);
        }
        if (
          document
            .getElementById("managementView")
            .classList.contains("hidden") === false
        ) {
          this.renderExerciseLibrary();
          this.renderWorkoutManager();
          this.renderExerciseSelector();
        }

        this.refreshInsights();

        // Build success message
        let message = "Import complete!\n\n";
        message += `Sessions: ${results.sessions.added} added`;
        if (results.sessions.skipped > 0)
          message += `, ${results.sessions.skipped} skipped`;

        if (importedData.workouts) {
          message += `\nWorkouts: ${results.workouts.added} added`;
          if (results.workouts.skipped > 0)
            message += `, ${results.workouts.skipped} skipped`;
        }

        if (importedData.exerciseLibrary) {
          message += `\nExercises: ${results.exercises.added} added`;
          if (results.exercises.skipped > 0)
            message += `, ${results.exercises.skipped} skipped`;
        }

        this.showSuccessMessage(message);
      } catch (error) {
        alert(
          "Error importing data: " +
            error.message +
            "\n\nPlease ensure the file is a valid workout tracker backup."
        );
        console.error("Import error:", error);
      }

      // Reset file input
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  getLastSession(exerciseName) {
    const history = this.getSessionHistory(exerciseName);
    return history.length > 0 ? history[0] : null;
  }

  getSessionHistory(exerciseName) {
    return this.sessions
      .filter((s) => s.exerciseName === exerciseName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  formatDate(date) {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString("en-US", options);
  }

  formatShortDate(date) {
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
    });
  }

  updateCurrentDate() {
    const dateElement = document.getElementById("currentDate");
    const now = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    dateElement.textContent = now.toLocaleDateString("en-US", options);
  }

  getQuoteIndexForDate(date = new Date()) {
    if (this.quotes.length === 0) return null;

    const targetKey = this.getLocalDateKey(date);
    const normalizedTarget = new Date(`${targetKey}T00:00:00`);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor(
      (normalizedTarget - this.quoteStartDate) / msPerDay
    );

    return ((diffDays % this.quotes.length) + this.quotes.length) % this.quotes.length;
  }

  getDailyQuote() {
    const index = this.getQuoteIndexForDate();
    if (index === null) return null;
    return this.quotes[index];
  }

  renderDailyQuote() {
    const card = document.getElementById("dailyQuoteCard");
    if (!card) return;

    const quoteText = document.getElementById("quoteText");
    const quoteAuthor = document.getElementById("quoteAuthor");
    const quoteDate = document.getElementById("quoteDate");
    const toggle = document.getElementById("quoteToggle");
    const toggleLabel = document.getElementById("quoteToggleLabel");
    const quoteBody = document.getElementById("quoteBody");

    if (!this.quotes.length) {
      card.classList.add("hidden");
      return;
    }

    const quote = this.getDailyQuote();

    if (!quote) {
      card.classList.add("hidden");
      return;
    }

    card.classList.remove("hidden");
    if (quoteBody) {
      quoteBody.classList.remove("hidden");
    }
    quoteText.textContent = `“${quote.text}”`;
    quoteAuthor.textContent = quote.author;

    const today = new Date();
    quoteDate.textContent = today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (toggleLabel && toggle) {
      toggleLabel.textContent = this.dailyQuoteExpanded ? "Hide" : "Show";
      toggle.setAttribute("aria-expanded", this.dailyQuoteExpanded.toString());
    }
  }

  toggleDailyQuote() {
    this.dailyQuoteExpanded = !this.dailyQuoteExpanded;
    this.updateDailyQuoteState();
  }

  updateDailyQuoteState() {
    const card = document.getElementById("dailyQuoteCard");
    const quoteBody = document.getElementById("quoteBody");
    const toggle = document.getElementById("quoteToggle");
    const toggleLabel = document.getElementById("quoteToggleLabel");

    if (!card || !quoteBody || !toggle || !toggleLabel) return;

    card.classList.toggle("expanded", this.dailyQuoteExpanded);
    card.classList.toggle("collapsed", !this.dailyQuoteExpanded);
    quoteBody.classList.toggle("hidden", !this.dailyQuoteExpanded);
    toggle.setAttribute("aria-expanded", this.dailyQuoteExpanded.toString());
    toggleLabel.textContent = this.dailyQuoteExpanded ? "Hide" : "Show";
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  showSuccessMessage(message) {
    // Simple alert for now - could be enhanced with a toast notification
    const existingMessage = document.querySelector(".success-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = "success-message";
    messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--color-success);
            color: var(--dark-text-primary);
            padding: var(--spacing-md) var(--spacing-lg);
            border-radius: var(--radius-sm);
            box-shadow: var(--elevation-medium);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.style.animation = "slideOut 0.3s ease";
      setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
  }
}

// ============================================
// Initialize Application
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const app = new WorkoutTracker();
});

// Add CSS for success message animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
