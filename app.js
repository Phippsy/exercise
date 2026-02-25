// ============================================
// Workout Tracker Application
// ============================================

class WorkoutTracker {
  constructor() {
    this.workouts = [];
    this.sessions = [];
    this.workoutHistory = [];
    this.exerciseLibrary = []; // Master list of all available exercises
    this.quotes = [];
    this.currentWorkout = null;
    this.currentExercise = null;
    this.activeSessionDrafts = {};
    this.pairMode = false;
    this.selectedExercises = [];
    this.pairedExercises = null;
    this.onboardingStep = 0;
    this.onboardingSteps = [];
    this.onboardingFocusElement = null;
    this.dailyQuoteExpanded = false;
    this.selectedHistoryId = null;
    this.latestShareDataUrl = null;
    this.currentSession = null;
    this.exerciseLibraryFilters = { search: "", muscles: new Set() };
    this.workoutFilters = new Set();
    this.workoutSearchTerm = "";
    this.favoriteFilterOnly =
      JSON.parse(localStorage.getItem("favoriteFilterOnly")) || false;
    this.quoteStartDate = new Date("2024-01-01T00:00:00");
    this.warmupAdded = false;

    // Google Sheets sync
    this.googleSheetsUrl = localStorage.getItem("googleSheetsUrl") || "";
    this.googleSheetsAutoSync = JSON.parse(localStorage.getItem("googleSheetsAutoSync")) || false;
    this.sheetsIsSyncing = false;

    this.init();
  }

  async init() {
    await this.loadWorkouts();
    await this.loadQuotes();
    this.loadSessions();
    this.loadActiveSessionDrafts();
    this.loadWorkoutHistory();
    this.loadUserName();
    this.loadTheme();
    this.setupEventListeners();
    this.setupExerciseLibraryFilters();
    this.setupWorkoutFilters();
    this.renderWorkoutList();
    this.renderActivityOverview();
    this.renderWorkoutOverview();
    this.setupOnboarding();
    this.updateCurrentDate();
    this.initializeDailyQuoteCard();
    this.updateLayoutOffsets();
    this.autoResizeExerciseTitles();
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
      let newWorkouts = [];
      if (storedWorkouts) {
        this.workouts = JSON.parse(storedWorkouts);

        // Merge any new workouts from exercises.json that don't exist locally
        const existingIds = new Set(this.workouts.map((w) => w.id));
        newWorkouts = (data.workouts || []).filter(
          (w) => !existingIds.has(w.id),
        );
        if (newWorkouts.length > 0) {
          this.workouts.push(...newWorkouts);
          this.saveWorkouts();
        }
      } else {
        this.workouts = data.workouts;
        this.saveWorkouts();
      }

      // Ensure newer metadata fields exist
      this.workouts = this.workouts.map((workout, index) => ({
        favorite: false,
        ...workout,
        id: workout.id || index + 1,
      }));

      // Load or build exercise library
      const storedLibrary = localStorage.getItem("exerciseLibrary");
      if (storedLibrary) {
        this.exerciseLibrary = JSON.parse(storedLibrary);
      } else {
        this.buildExerciseLibrary();
      }

      // Merge new exercises from any workouts added above
      if (newWorkouts.length > 0) {
        let libraryChanged = false;
        newWorkouts.forEach((workout) => {
          (workout.exercises || []).forEach((exercise) => {
            if (
              !this.exerciseLibrary.some(
                (e) => e.name.toLowerCase() === exercise.name.toLowerCase(),
              )
            ) {
              this.exerciseLibrary.push({
                name: exercise.name,
                muscle_group: exercise.muscle_group,
                sets: exercise.sets,
                reps: exercise.reps,
                weight_kg: exercise.weight_kg,
                notes: exercise.notes,
                form_notes: exercise.form_notes,
                form_video: exercise.form_video,
              });
              libraryChanged = true;
            }
          });
        });
        if (libraryChanged) {
          this.saveExerciseLibrary();
        }
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
      JSON.stringify(this.exerciseLibrary),
    );
  }

  loadSessions() {
    const stored = localStorage.getItem("workoutSessions");
    this.sessions = stored ? JSON.parse(stored) : [];
  }

  saveSessions() {
    localStorage.setItem("workoutSessions", JSON.stringify(this.sessions));
  }

  loadActiveSessionDrafts() {
    const stored = localStorage.getItem("activeSessionDrafts");
    this.activeSessionDrafts = stored ? JSON.parse(stored) : {};
  }

  saveActiveSessionDrafts() {
    localStorage.setItem(
      "activeSessionDrafts",
      JSON.stringify(this.activeSessionDrafts || {}),
    );
  }

  loadWorkoutHistory() {
    const stored = localStorage.getItem("workoutHistory");
    this.workoutHistory = stored ? JSON.parse(stored) : [];
    this.workoutHistory.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  saveWorkoutHistory() {
    localStorage.setItem("workoutHistory", JSON.stringify(this.workoutHistory));
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
    } else {
      this.updateThemeToggle(false);
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
    return (
      this.getLocalDateKey(new Date(dateString)) === this.getLocalDateKey()
    );
  }

  toggleTheme() {
    const isLight = document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    this.updateThemeToggle(isLight);
  }

  updateThemeToggle(isLight) {
    const toggleConfigs = [
      {
        dark: "themeIconDark",
        light: "themeIconLight",
        text: "themeToggleText",
      },
      {
        dark: "mobileThemeIconDark",
        light: "mobileThemeIconLight",
        text: "mobileThemeToggleText",
      },
    ];

    toggleConfigs.forEach(({ dark, light, text }) => {
      const darkIcon = document.getElementById(dark);
      const lightIcon = document.getElementById(light);
      const toggleText = document.getElementById(text);

      if (!darkIcon || !lightIcon || !toggleText) return;

      if (isLight) {
        darkIcon.classList.add("hidden");
        lightIcon.classList.remove("hidden");
        toggleText.textContent = "Dark";
      } else {
        darkIcon.classList.remove("hidden");
        lightIcon.classList.add("hidden");
        toggleText.textContent = "Light";
      }
    });

    ["themeToggleBtn", "mobileThemeToggleBtn"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) {
        button.setAttribute("aria-pressed", isLight);
      }
    });
  }

  bindButtons(buttonIds, handler) {
    buttonIds.forEach((id) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener("click", handler);
      }
    });
  }

  // ============================================
  // Event Listeners
  // ============================================

  setupEventListeners() {
    // Theme toggle
    this.bindButtons(["themeToggleBtn", "mobileThemeToggleBtn"], () => {
      this.toggleTheme();
    });

    // Daily quote - no interactions needed

    // Workout search
    const workoutSearchInput = document.getElementById("workoutSearchInput");
    if (workoutSearchInput) {
      workoutSearchInput.addEventListener("input", (event) => {
        this.workoutSearchTerm = event.target.value.toLowerCase().trim();
        this.renderWorkoutList();
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

    document.getElementById("addWarmupBlock").addEventListener("click", () => {
      this.addWarmupSets();
    });

    this.bindButtons(["openSessionAddPanel"], () => {
      this.showSessionAddPanel();
    });

    this.bindButtons(["closeSessionAddPanel"], () => {
      this.hideSessionAddPanel();
    });

    const sessionAddSearch = document.getElementById("sessionAddSearch");
    if (sessionAddSearch) {
      sessionAddSearch.addEventListener("input", () => {
        this.renderSessionAddList();
      });
    }

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
    this.bindButtons(["exportDataBtn", "mobileExportDataBtn"], () => {
      this.exportData();
    });

    this.bindButtons(["importDataBtn", "mobileImportDataBtn"], () => {
      document.getElementById("fileInput").click();
    });

    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        this.importData(e);
      });
    }

    this.bindButtons(["historyBtn", "mobileHistoryBtn"], () => {
      this.openHistoryView();
    });

    const backToDashboard = document.getElementById("backToDashboard");
    if (backToDashboard) {
      backToDashboard.addEventListener("click", () => {
        this.showView("workoutListView");
      });
    }

    // Bottom back button bar (mobile)
    const bottomBackBtn = document.getElementById("bottomBackBtn");
    if (bottomBackBtn) {
      bottomBackBtn.addEventListener("click", () => {
        this.handleBottomBackClick();
      });
    }

    const bottomActionBtn = document.getElementById("bottomActionBtn");
    if (bottomActionBtn) {
      bottomActionBtn.addEventListener("click", () => {
        this.handleBottomActionClick();
      });
    }

    const endWorkoutBtn = document.getElementById("endWorkoutBtn");
    if (endWorkoutBtn) {
      endWorkoutBtn.addEventListener("click", () => {
        this.endCurrentWorkoutSession();
      });
    }

    const shareWorkoutCardBtn = document.getElementById("shareWorkoutCardBtn");
    if (shareWorkoutCardBtn) {
      shareWorkoutCardBtn.addEventListener("click", () => {
        this.exportSelectedWorkoutShareCard();
      });
    }

    const copyShareLink = document.getElementById("copyShareLink");
    if (copyShareLink) {
      copyShareLink.addEventListener("click", () => {
        this.copySelectedWorkoutShareCard();
      });
    }

    window.addEventListener("resize", () => {
      this.updateLayoutOffsets();
      this.autoResizeExerciseTitles();
    });

    const exportSessionBtn = document.getElementById("exportSessionBtn");
    if (exportSessionBtn) {
      exportSessionBtn.addEventListener("click", () => {
        this.exportSelectedWorkoutSession();
      });
    }

    const exportSessionMdBtn = document.getElementById("exportSessionMdBtn");
    if (exportSessionMdBtn) {
      exportSessionMdBtn.addEventListener("click", () => {
        this.exportSelectedWorkoutSessionMarkdown();
      });
    }

    // Management view
    this.bindButtons(["manageBtn", "mobileManageBtn"], () => {
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

    // Google Sheets sync tab
    this.setupSyncTabListeners();

    const generateCoachSummaryBtn = document.getElementById(
      "generateCoachSummaryBtn",
    );
    if (generateCoachSummaryBtn) {
      generateCoachSummaryBtn.addEventListener("click", () => {
        this.updateCoachSummaryOutput(true);
      });
    }

    const copyCoachSummaryBtn = document.getElementById("copyCoachSummaryBtn");
    if (copyCoachSummaryBtn) {
      copyCoachSummaryBtn.addEventListener("click", () => {
        this.copyCoachSummary();
      });
    }

    const downloadCoachSummaryBtn = document.getElementById(
      "downloadCoachSummaryBtn",
    );
    if (downloadCoachSummaryBtn) {
      downloadCoachSummaryBtn.addEventListener("click", () => {
        this.downloadCoachSummary();
      });
    }

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

    const editWorkoutBtn = document.getElementById("editWorkoutBtn");
    if (editWorkoutBtn) {
      editWorkoutBtn.addEventListener("click", () => {
        if (!this.currentWorkout) return;
        this.editWorkout(this.currentWorkout.id);
      });
    }

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
      "editExerciseSelector",
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

    // Header context title editing
    const headerContextTitle = document.getElementById("headerContextTitle");
    headerContextTitle.addEventListener("blur", () => {
      this.handleHeaderContextTitleBlur();
    });

    headerContextTitle.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        headerContextTitle.blur();
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
    this.renderDailyQuote();
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
            (b) => b.dataset.muscle !== "all",
          );
          const allOthersActive = otherBtns.every((b) =>
            b.classList.contains("active"),
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
      this.exerciseLibraryFilters.search = e.target.value.toLowerCase().trim();
      this.renderExerciseLibrary();
    });

    const filterButtons =
      filterContainer.querySelectorAll(".muscle-filter-btn");

    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const muscle = btn.dataset.muscle;

        if (muscle === "all") {
          const allActive = btn.classList.contains("active");
          filterButtons.forEach((button) =>
            button.classList.toggle("active", !allActive),
          );
        } else {
          btn.classList.toggle("active");
          const allBtn = filterContainer.querySelector('[data-muscle="all"]');
          const otherBtns = Array.from(filterButtons).filter(
            (b) => b.dataset.muscle !== "all",
          );
          const allOthersActive = otherBtns.every((b) =>
            b.classList.contains("active"),
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
      filterContainer.querySelectorAll(".muscle-filter-btn.active"),
    )
      .filter((btn) => btn.dataset.muscle !== "all")
      .map((btn) => btn.dataset.muscle);

    this.exerciseLibraryFilters.muscles = new Set(activeMuscles);
    this.renderExerciseLibrary();
  }

  setupWorkoutFilters() {
    const filterContainer = document.getElementById("workoutFilters");
    const favoriteToggle = document.getElementById("favoritesOnlyToggle");

    if (!filterContainer) return;

    const filterButtons =
      filterContainer.querySelectorAll(".muscle-filter-btn");

    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const muscle = btn.dataset.muscle;

        if (muscle === "all") {
          const allActive = btn.classList.contains("active");
          filterButtons.forEach((button) =>
            button.classList.toggle("active", !allActive),
          );
        } else {
          btn.classList.toggle("active");
          const allBtn = filterContainer.querySelector('[data-muscle="all"]');
          const otherBtns = Array.from(filterButtons).filter(
            (b) => b.dataset.muscle !== "all",
          );
          const allOthersActive = otherBtns.every((b) =>
            b.classList.contains("active"),
          );

          if (allOthersActive) {
            allBtn.classList.add("active");
          } else {
            allBtn.classList.remove("active");
          }
        }

        this.updateWorkoutFilters(filterContainer);
      });
    });

    if (favoriteToggle) {
      favoriteToggle.classList.toggle("active", this.favoriteFilterOnly);
      favoriteToggle.setAttribute("aria-pressed", this.favoriteFilterOnly);

      favoriteToggle.addEventListener("click", () => {
        this.favoriteFilterOnly = !this.favoriteFilterOnly;
        favoriteToggle.classList.toggle("active", this.favoriteFilterOnly);
        favoriteToggle.setAttribute("aria-pressed", this.favoriteFilterOnly);
        localStorage.setItem(
          "favoriteFilterOnly",
          JSON.stringify(this.favoriteFilterOnly),
        );
        this.updateWorkoutFilters(filterContainer);
      });
    }

    this.updateWorkoutFilters(filterContainer);
  }

  updateWorkoutFilters(filterContainer) {
    const activeMuscles = Array.from(
      filterContainer.querySelectorAll(".muscle-filter-btn.active"),
    )
      .filter((btn) => btn.dataset.muscle !== "all")
      .map((btn) => btn.dataset.muscle);

    this.workoutFilters = new Set(activeMuscles);
    this.renderWorkoutList();
  }

  filterExercises(searchInputId, selectorId) {
    const searchInput = document.getElementById(searchInputId);
    const selector = document.getElementById(selectorId);
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Get active muscle groups
    const container = searchInput.closest(".form-group");
    const activeFilters = Array.from(
      container.querySelectorAll(".muscle-filter-btn.active"),
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
    this.updateBottomBackBar(viewId);
    this.updateHeaderContextTitle();
    this.autoResizeExerciseTitles();
    this.updateLayoutOffsets();

    // Force scroll to top - use multiple approaches to ensure it works
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  updateHeaderContextTitle() {
    const headerContextRow =
      document.getElementById("headerContextTitle")?.parentElement;
    const headerContextTitle = document.getElementById("headerContextTitle");
    const headerContextBadges = document.getElementById("headerContextBadges");

    if (!headerContextTitle || !headerContextRow) return;

    const setEditable = (mode, workoutId = null) => {
      headerContextTitle.contentEditable = "true";
      headerContextTitle.spellcheck = false;
      headerContextTitle.dataset.editMode = mode;
      if (workoutId) {
        headerContextTitle.dataset.workoutId = workoutId;
      } else {
        delete headerContextTitle.dataset.workoutId;
      }
      headerContextTitle.classList.add("header-context-title-editable");
    };

    const disableEditing = () => {
      headerContextTitle.contentEditable = "false";
      delete headerContextTitle.dataset.editMode;
      delete headerContextTitle.dataset.workoutId;
      headerContextTitle.classList.remove("header-context-title-editable");
    };

    const views = document.querySelectorAll(".view");
    let currentView = null;

    views.forEach((view) => {
      if (!view.classList.contains("hidden")) {
        currentView = view.id;
      }
    });

    if (currentView === "exerciseListView" && this.currentWorkout) {
      headerContextTitle.textContent = this.currentWorkout.name;
      headerContextBadges.innerHTML = "";
      headerContextRow.style.display = "flex";
      setEditable("workout", this.currentWorkout.id);
    } else if (currentView === "exerciseDetailView") {
      const exerciseName = document.getElementById("exerciseDetailName");
      const muscleGroup = document.getElementById("exerciseDetailMuscleGroup");

      if (exerciseName) {
        headerContextTitle.textContent = exerciseName.textContent;

        // Copy muscle badge to header
        if (muscleGroup && headerContextBadges) {
          headerContextBadges.innerHTML = muscleGroup.outerHTML;
        }

        headerContextRow.style.display = "flex";

        if (this.pairedExercises) {
          disableEditing();
        } else {
          setEditable("exercise");
        }
      }
    } else {
      headerContextRow.style.display = "none";
      disableEditing();
    }

    this.autoResizeExerciseTitles();
    this.updateLayoutOffsets();
  }

  autoResizeTitle(element, { maxLines = 2, minFontSize = 14 } = {}) {
    if (!element) return;

    const computed = window.getComputedStyle(element);
    const baseFontSize =
      parseFloat(element.dataset.originalFontSize) ||
      parseFloat(computed.fontSize);

    if (!element.dataset.originalFontSize) {
      element.dataset.originalFontSize = baseFontSize;
    }

    element.classList.remove("title-clamped");
    element.style.maxHeight = "none";
    element.style.fontSize = `${baseFontSize}px`;

    let currentSize = baseFontSize;
    let lineHeight = parseFloat(window.getComputedStyle(element).lineHeight);
    if (!lineHeight || Number.isNaN(lineHeight)) {
      lineHeight = currentSize * 1.2;
    }
    let maxHeight = lineHeight * maxLines;

    while (currentSize > minFontSize && element.scrollHeight > maxHeight + 1) {
      currentSize -= 1;
      element.style.fontSize = `${currentSize}px`;
      lineHeight = parseFloat(window.getComputedStyle(element).lineHeight);
      if (!lineHeight || Number.isNaN(lineHeight)) {
        lineHeight = currentSize * 1.2;
      }
      maxHeight = lineHeight * maxLines;
    }

    element.style.maxHeight = `${maxHeight}px`;

    if (element.scrollHeight > maxHeight + 1) {
      element.classList.add("title-clamped");
    }
  }

  autoResizeExerciseTitles() {
    const elements = [
      document.getElementById("headerContextTitle"),
      document.getElementById("exerciseDetailName"),
      document.getElementById("pairedExercise1Name"),
      document.getElementById("pairedExercise2Name"),
    ];

    elements.forEach((element) => {
      if (element) {
        this.autoResizeTitle(element, { maxLines: 2, minFontSize: 14 });
      }
    });
  }

  updateLayoutOffsets() {
    const header = document.querySelector(".app-header");
    const bottomNav = document.querySelector(".mobile-bottom-nav");
    const bottomBackBar = document.getElementById("bottomBackBar");
    const headerHeight = header?.getBoundingClientRect().height || 80;
    const bottomNavVisible =
      bottomNav && window.getComputedStyle(bottomNav).display !== "none";
    const bottomNavHeight = bottomNavVisible
      ? bottomNav.getBoundingClientRect().height
      : 0;
    const bottomBackHeight =
      bottomBackBar && !bottomBackBar.classList.contains("hidden")
        ? bottomBackBar.getBoundingClientRect().height
        : 0;
    const bottomPadding = Math.max(96, bottomNavHeight + bottomBackHeight + 24);

    document.documentElement.style.setProperty(
      "--app-header-height",
      `${headerHeight}px`,
    );
    document.documentElement.style.setProperty(
      "--app-bottom-padding",
      `${bottomPadding}px`,
    );
  }

  handleHeaderContextTitleBlur() {
    const headerContextTitle = document.getElementById("headerContextTitle");
    if (!headerContextTitle) return;

    const mode = headerContextTitle.dataset.editMode;
    const newName = headerContextTitle.textContent.trim();

    if (mode === "workout") {
      if (!this.currentWorkout) return;

      const workoutNameElement = document.getElementById("currentWorkoutName");

      if (!newName) {
        headerContextTitle.textContent = this.currentWorkout.name;
        if (workoutNameElement) {
          workoutNameElement.textContent = this.currentWorkout.name;
        }
        this.autoResizeExerciseTitles();
        return;
      }

      const workout = this.workouts.find(
        (w) => w.id === this.currentWorkout.id,
      );
      if (workout && workout.name !== newName) {
        workout.name = newName;
        this.currentWorkout.name = newName;

        if (workoutNameElement) {
          workoutNameElement.textContent = newName;
        }

        this.saveWorkouts();
        this.renderWorkoutList();
        this.renderExerciseList();
      }
      this.autoResizeExerciseTitles();
    } else if (mode === "exercise") {
      if (!this.currentExercise || this.pairedExercises) return;

      const originalName = this.currentExercise.name;
      const exerciseNameElement = document.getElementById("exerciseDetailName");

      if (!newName) {
        headerContextTitle.textContent = originalName;
        if (exerciseNameElement) {
          exerciseNameElement.textContent = originalName;
        }
        this.autoResizeExerciseTitles();
        return;
      }

      if (newName === originalName) return;

      const duplicateName = this.exerciseLibrary.some(
        (exercise) =>
          exercise.name.toLowerCase() === newName.toLowerCase() &&
          exercise.name !== originalName,
      );

      if (duplicateName) {
        alert("An exercise with this name already exists");
        headerContextTitle.textContent = originalName;
        if (exerciseNameElement) {
          exerciseNameElement.textContent = originalName;
        }
        this.autoResizeExerciseTitles();
        return;
      }

      const exercise = this.exerciseLibrary.find(
        (ex) => ex.name === originalName,
      );
      if (!exercise) return;

      exercise.name = newName;
      this.applyExerciseUpdates(originalName, exercise);

      if (this.currentExercise && this.currentExercise.name === originalName) {
        this.currentExercise =
          this.currentWorkout?.exercises.find(
            (ex) => ex.name === exercise.name,
          ) || exercise;
      }

      if (exerciseNameElement) {
        exerciseNameElement.textContent = newName;
      }
      headerContextTitle.textContent = newName;
      this.autoResizeExerciseTitles();
    }
  }

  updateBottomBackBar(viewId) {
    const bottomBackBar = document.getElementById("bottomBackBar");
    const bottomBackBtnText = document.getElementById("bottomBackBtnText");
    const bottomActionBtn = document.getElementById("bottomActionBtn");
    const bottomActionBtnText = document.getElementById("bottomActionBtnText");

    if (!bottomBackBar) return;

    // Show back bar for non-main views
    if (viewId === "workoutListView") {
      bottomBackBar.classList.add("hidden");
      if (bottomActionBtn) bottomActionBtn.classList.add("hidden");
    } else if (viewId === "exerciseListView") {
      bottomBackBar.classList.remove("hidden");
      bottomBackBtnText.textContent = "Back to Workouts";
      if (bottomActionBtn) {
        bottomActionBtn.classList.remove("hidden");
        bottomActionBtnText.textContent = "Finish Workout";
      }
    } else if (viewId === "exerciseDetailView") {
      bottomBackBar.classList.remove("hidden");
      bottomBackBtnText.textContent = "Back to Exercises";
      if (bottomActionBtn) {
        bottomActionBtn.classList.remove("hidden");
        bottomActionBtnText.textContent = "Save Session";
      }
    } else if (viewId === "workoutHistoryView") {
      bottomBackBar.classList.remove("hidden");
      bottomBackBtnText.textContent = "Back to Dashboard";
      if (bottomActionBtn) bottomActionBtn.classList.add("hidden");
    } else {
      bottomBackBar.classList.add("hidden");
      if (bottomActionBtn) bottomActionBtn.classList.add("hidden");
    }
  }

  handleBottomBackClick() {
    const views = document.querySelectorAll(".view");
    let currentView = null;

    views.forEach((view) => {
      if (!view.classList.contains("hidden")) {
        currentView = view.id;
      }
    });

    if (currentView === "exerciseListView") {
      this.showView("workoutListView");
    } else if (currentView === "exerciseDetailView") {
      this.pairedExercises = null;
      this.showExerciseList(this.currentWorkout);
    } else if (currentView === "workoutHistoryView") {
      this.showView("workoutListView");
    }
  }

  handleBottomActionClick() {
    const views = document.querySelectorAll(".view");
    let currentView = null;

    views.forEach((view) => {
      if (!view.classList.contains("hidden")) {
        currentView = view.id;
      }
    });

    if (currentView === "exerciseListView") {
      // Trigger "Finish Workout" action
      const endWorkoutBtn = document.getElementById("endWorkoutBtn");
      if (endWorkoutBtn) {
        endWorkoutBtn.click();
      }
    } else if (currentView === "exerciseDetailView") {
      if (this.pairedExercises && this.pairedExercises.length === 2) {
        const savePairedBtn = document.getElementById("savePairedSessionBtn");
        if (savePairedBtn) {
          savePairedBtn.click();
        }
        return;
      }

      // Trigger "Save Session" action
      const saveSessionBtn = document.getElementById("saveSessionBtn");
      if (saveSessionBtn) {
        saveSessionBtn.click();
      }
    }
  }

  // ============================================
  // Workout List View
  // ============================================

  renderWorkoutList() {
    const container = document.getElementById("workoutList");
    container.innerHTML = "";
    const activeFilters = this.workoutFilters;
    const favoritesOnly = this.favoriteFilterOnly;
    const searchTerm = this.workoutSearchTerm?.toLowerCase() || "";

    const sortedWorkouts = [
      ...this.workouts.filter((w) => w.favorite),
      ...this.workouts.filter((w) => !w.favorite),
    ].filter((workout) => {
      if (activeFilters.size === 0) return true;
      const workoutMuscles = workout.exercises.map((ex) => ex.muscle_group);
      return workoutMuscles.some((muscle) => activeFilters.has(muscle));
    });

    const filteredWorkouts = sortedWorkouts
      .filter((workout) => {
        if (!favoritesOnly) return true;
        return workout.favorite;
      })
      .filter((workout) => {
        if (!searchTerm) return true;
        return workout.name.toLowerCase().includes(searchTerm);
      });

    filteredWorkouts.forEach((workout) => {
      const card = this.createWorkoutCard(workout);
      container.appendChild(card);
    });
  }

  createWorkoutCard(workout) {
    const card = document.createElement("div");
    card.className = "workout-card";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");

    const header = document.createElement("div");
    header.className = "workout-card-header";

    const title = document.createElement("h3");
    title.className = "workout-card-title";
    title.textContent = workout.name;

    const favoriteToggle = document.createElement("button");
    favoriteToggle.className = `favorite-toggle ${
      workout.favorite ? "active" : ""
    }`;
    favoriteToggle.setAttribute("aria-pressed", workout.favorite);
    favoriteToggle.setAttribute(
      "aria-label",
      workout.favorite ? "Remove from favorites" : "Add to favorites",
    );
    favoriteToggle.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    `;
    favoriteToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleFavorite(workout);
    });

    header.appendChild(title);
    header.appendChild(favoriteToggle);
    card.appendChild(header);

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

    card.appendChild(meta);

    const muscleBadges = document.createElement("div");
    muscleBadges.className = "workout-muscle-badges";

    this.getWorkoutMuscleGroups(workout).forEach((muscle) => {
      const badge = document.createElement("span");
      badge.className = "workout-muscle-badge";
      badge.textContent = muscle;
      muscleBadges.appendChild(badge);
    });

    if (muscleBadges.childElementCount > 0) {
      card.appendChild(muscleBadges);
    }

    const actions = document.createElement("div");
    actions.className = "workout-card-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-secondary btn-ghost";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.editWorkout(workout.id);
    });

    const duplicateBtn = document.createElement("button");
    duplicateBtn.className = "btn-secondary btn-ghost";
    duplicateBtn.type = "button";
    duplicateBtn.textContent = "Duplicate";
    duplicateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.duplicateWorkout(workout);
    });

    actions.appendChild(editBtn);
    actions.appendChild(duplicateBtn);
    card.appendChild(actions);

    card.addEventListener("click", () => this.showExerciseList(workout));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.showExerciseList(workout);
      }
    });

    return card;
  }

  getWorkoutMuscleGroups(workout) {
    const muscles = new Set();

    workout.exercises.forEach((exercise) => {
      if (!exercise.muscle_group) return;

      const parts = exercise.muscle_group
        .split(/[·,/&]+/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length === 0) {
        muscles.add(exercise.muscle_group.trim());
        return;
      }

      parts.forEach((part) => muscles.add(part));
    });

    return Array.from(muscles).sort((a, b) => a.localeCompare(b));
  }

  toggleFavorite(workout) {
    workout.favorite = !workout.favorite;
    this.saveWorkouts();
    this.renderWorkoutList();
    this.showSuccessMessage(
      workout.favorite
        ? "Added to favorites for quick launch"
        : "Removed from favorites",
    );
  }

  duplicateWorkout(workout) {
    const copy = JSON.parse(JSON.stringify(workout));
    copy.id = Date.now();
    copy.name = `${workout.name} (Template)`;
    copy.favorite = false;
    this.workouts.push(copy);
    this.saveWorkouts();
    this.renderWorkoutList();
    this.showSuccessMessage("Workout duplicated. Edit to customize.");
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
        (e) => e.name !== exercise.name,
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
          this.selectedExercises[1],
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
        this.isToday(session.date),
    );
  }

  getWorkoutCompletion(workout) {
    const exercises =
      this.currentSession && this.currentWorkout?.id === workout.id
        ? this.getActiveSessionExercises()
        : workout.exercises || [];
    const total = exercises.length;
    const completed = exercises.filter((exercise) =>
      this.isExerciseCompletedToday(exercise, workout.id),
    ).length;

    return {
      total,
      completed,
      allCompleted: total > 0 && completed === total,
    };
  }

  showExerciseList(workout) {
    this.currentWorkout = workout;
    this.setCurrentSessionForWorkout(workout);
    this.pairMode = false;
    this.selectedExercises = [];
    this.hideSessionAddPanel();

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

    this.updateSessionChecklist(workout);
    this.renderExerciseList();
    this.showView("exerciseListView");

    // Smart scroll: Find first incomplete exercise or scroll to top
    this.scrollToNextExercise(workout);
  }

  getActiveSessionExercises() {
    if (this.currentSession?.exercises) return this.currentSession.exercises;
    return this.currentWorkout?.exercises || [];
  }

  createSessionFromWorkout(workout) {
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      exercises: (workout.exercises || []).map((exercise) => ({ ...exercise })),
    };
  }

  setCurrentSessionForWorkout(workout) {
    const persisted = this.activeSessionDrafts?.[workout.id];

    if (persisted?.exercises?.length) {
      this.currentSession = {
        ...persisted,
        workoutId: workout.id,
        workoutName: workout.name,
        exercises: persisted.exercises.map((exercise) => ({ ...exercise })),
      };
    } else {
      this.currentSession = this.createSessionFromWorkout(workout);
    }

    this.persistCurrentSession();
  }

  persistCurrentSession() {
    if (!this.currentSession?.workoutId) return;

    this.activeSessionDrafts[this.currentSession.workoutId] = {
      ...this.currentSession,
      workoutName: this.currentWorkout?.name || this.currentSession.workoutName,
      exercises: (this.currentSession.exercises || []).map((exercise) => ({
        ...exercise,
      })),
      updatedAt: new Date().toISOString(),
    };

    this.saveActiveSessionDrafts();
  }

  clearPersistedSession(workoutId) {
    if (!this.activeSessionDrafts?.[workoutId]) return;
    delete this.activeSessionDrafts[workoutId];
    this.saveActiveSessionDrafts();
  }

  scrollToNextExercise(workout) {
    // Find the first incomplete exercise
    const exercises = this.getActiveSessionExercises() || workout.exercises;
    let firstIncompleteIndex = -1;

    for (let i = 0; i < exercises.length; i++) {
      if (!this.isExerciseCompletedToday(exercises[i], workout.id)) {
        firstIncompleteIndex = i;
        break;
      }
    }

    // If no exercises completed yet, scroll to top
    if (firstIncompleteIndex === 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // If some exercises are completed, scroll to the first incomplete one
    if (firstIncompleteIndex > 0) {
      // Wait for DOM to render
      setTimeout(() => {
        const exerciseItems = document.querySelectorAll(".exercise-item");
        if (exerciseItems[firstIncompleteIndex]) {
          const item = exerciseItems[firstIncompleteIndex];
          const headerHeight =
            document.querySelector(".app-header")?.offsetHeight || 100;
          const itemTop = item.getBoundingClientRect().top + window.scrollY;

          // Scroll so the item is visible with some padding, ensuring 3rd item is in view
          // Add extra offset to show the item below it clearly
          const offset = headerHeight + 20;
          window.scrollTo({
            top: Math.max(0, itemTop - offset),
            behavior: "smooth",
          });
        }
      }, 100);
    } else {
      // All exercises completed, scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  updateSessionChecklist(workout) {
    const checklist = document.getElementById("sessionChecklist");
    if (!checklist) return;

    const { total, completed } = this.getWorkoutCompletion(workout);
    checklist.innerHTML = `
      <span>${completed}/${total} done today</span>
      <div class="session-progress-bar"><div class="session-progress-fill" style="width: ${
        total === 0 ? 0 : Math.round((completed / total) * 100)
      }%"></div></div>
    `;
  }

  renderExerciseList() {
    const container = document.getElementById("exerciseList");
    container.innerHTML = "";

    this.getActiveSessionExercises().forEach((exercise, index) => {
      const item = this.createExerciseItem(exercise, index);
      container.appendChild(item);
    });
  }

  createExerciseItem(exercise, index) {
    const item = document.createElement("div");
    item.className = "exercise-item";
    item.dataset.index = index;

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
    }

    details.appendChild(name);
    details.appendChild(meta);

    // Add muscle group badges
    if (exercise.muscle_group) {
      const muscleBadges = document.createElement("div");
      muscleBadges.className = "exercise-muscle-badges";

      // Split muscle groups if there are multiple (comma-separated)
      const muscleGroups = exercise.muscle_group
        .split(",")
        .map((m) => m.trim());
      muscleGroups.forEach((muscle) => {
        const badge = document.createElement("span");
        badge.className = "exercise-muscle-badge";
        badge.textContent = muscle;
        muscleBadges.appendChild(badge);
      });

      details.appendChild(muscleBadges);
    }
    content.appendChild(details);

    const status = document.createElement("div");
    status.className = "exercise-item-status";
    const completedToday = this.isExerciseCompletedToday(
      exercise,
      this.currentWorkout.id,
    );

    if (completedToday) {
      item.classList.add("exercise-completed-today");
      const badge = document.createElement("span");
      badge.className = "pill pill-success";
      badge.textContent = "Completed today";
      status.appendChild(badge);
      content.appendChild(status);
    }

    const reorderControls = document.createElement("div");
    reorderControls.className = "exercise-reorder-controls";

    const moveUpBtn = document.createElement("button");
    moveUpBtn.className = "btn-icon reorder-btn";
    moveUpBtn.type = "button";
    moveUpBtn.setAttribute("aria-label", `Move ${exercise.name} up`);
    moveUpBtn.innerHTML = `
      <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4l-6 6m6-6l6 6m-6-6v16" />
      </svg>
    `;
    moveUpBtn.disabled = index === 0;
    moveUpBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.moveExercise(index, -1);
    });

    const moveDownBtn = document.createElement("button");
    moveDownBtn.className = "btn-icon reorder-btn";
    moveDownBtn.type = "button";
    moveDownBtn.setAttribute("aria-label", `Move ${exercise.name} down`);
    moveDownBtn.innerHTML = `
      <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 20l6-6m-6 6l-6-6m6 6V4" />
      </svg>
    `;
    moveDownBtn.disabled =
      index === (this.getActiveSessionExercises().length || 0) - 1;
    moveDownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.moveExercise(index, 1);
    });

    reorderControls.appendChild(moveUpBtn);
    reorderControls.appendChild(moveDownBtn);

    if (this.currentSession) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn-icon reorder-btn danger";
      removeBtn.type = "button";
      removeBtn.setAttribute(
        "aria-label",
        `Remove ${exercise.name} from this session`,
      );
      removeBtn.innerHTML = `
        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeExerciseFromSession(index);
      });
      reorderControls.appendChild(removeBtn);
    }

    const chevron = document.createElement("div");
    chevron.className = "exercise-item-chevron";
    chevron.innerHTML = `
            <svg class="icon icon-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
        `;

    item.appendChild(content);
    item.appendChild(reorderControls);
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

  reorderExercises(fromIndex, toIndex) {
    const exercises = this.getActiveSessionExercises();
    if (!Array.isArray(exercises)) return;
    if (toIndex < 0 || toIndex >= exercises.length) return;

    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    if (!this.currentSession) {
      this.saveWorkouts();
    }
    this.renderExerciseList();

    if (this.currentSession) {
      this.persistCurrentSession();
    }

    // Highlight the moved exercise at its new position
    this.highlightExerciseAtIndex(toIndex);
  }

  moveExercise(index, direction) {
    const newIndex = index + direction;
    const exercises = this.getActiveSessionExercises();
    if (!exercises.length) return;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    this.reorderExercises(index, newIndex);
  }

  removeExerciseFromSession(index) {
    if (!this.currentSession?.exercises) return;
    const removed = this.currentSession.exercises.splice(index, 1);
    this.renderExerciseList();
    this.updateSessionChecklist(this.currentWorkout);
    this.persistCurrentSession();
    if (removed[0]) {
      this.showSuccessMessage(
        `${removed[0].name} removed from this session only`,
      );
    }
  }

  showSessionAddPanel() {
    const panel = document.getElementById("sessionAddPanel");
    if (!panel) return;
    panel.classList.remove("hidden");
    const search = document.getElementById("sessionAddSearch");
    if (search) {
      search.value = "";
      setTimeout(() => search.focus(), 50);
    }
    this.renderSessionAddList();
  }

  hideSessionAddPanel() {
    const panel = document.getElementById("sessionAddPanel");
    if (!panel) return;
    panel.classList.add("hidden");
  }

  renderSessionAddList() {
    const list = document.getElementById("sessionAddList");
    if (!list) return;

    const searchTerm = document
      .getElementById("sessionAddSearch")
      ?.value.toLowerCase()
      .trim();

    const existingNames = new Set(
      this.getActiveSessionExercises().map((ex) => ex.name),
    );

    let available = this.exerciseLibrary.filter(
      (exercise) => !existingNames.has(exercise.name),
    );

    if (searchTerm) {
      available = available.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(searchTerm) ||
          (exercise.muscle_group || "").toLowerCase().includes(searchTerm),
      );
    }

    list.innerHTML = "";

    if (available.length === 0) {
      list.innerHTML =
        '<p class="text-muted">No exercises found. Try a different search.</p>';
      return;
    }

    available.slice(0, 25).forEach((exercise) => {
      const item = document.createElement("div");
      item.className = "session-add-item";

      const meta = document.createElement("div");
      meta.className = "session-add-meta";

      const name = document.createElement("div");
      name.className = "session-add-name";
      name.textContent = exercise.name;

      const muscle = document.createElement("div");
      muscle.className = "session-add-muscle";
      muscle.textContent = exercise.muscle_group;

      meta.appendChild(name);
      meta.appendChild(muscle);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn-secondary btn-sm";
      addBtn.textContent = "Add to session";
      addBtn.addEventListener("click", () => {
        this.addExerciseToSession(exercise);
      });

      item.appendChild(meta);
      item.appendChild(addBtn);
      list.appendChild(item);
    });
  }

  addExerciseToSession(exercise) {
    if (!this.currentSession?.exercises) return;
    if (
      this.currentSession.exercises.some(
        (existing) => existing.name === exercise.name,
      )
    ) {
      this.showSuccessMessage("Already in this session");
      return;
    }

    this.currentSession.exercises.push({ ...exercise });
    this.renderExerciseList();
    this.updateSessionChecklist(this.currentWorkout);
    this.persistCurrentSession();
    this.showSuccessMessage(`${exercise.name} added to this session`);
  }

  highlightExerciseAtIndex(index) {
    // Wait for DOM to update, then highlight the exercise
    setTimeout(() => {
      const exerciseList = document.getElementById("exerciseList");
      if (!exerciseList) return;

      // Remove any existing highlights
      exerciseList
        .querySelectorAll(".exercise-item-highlight")
        .forEach((item) => {
          item.classList.remove("exercise-item-highlight");
        });

      const exerciseItem = exerciseList.children[index];
      if (!exerciseItem) return;

      // Add highlight class (stays until next action)
      exerciseItem.classList.add("exercise-item-highlight");

      // Scroll the item into view smoothly
      exerciseItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  // ============================================
  // Exercise Detail View
  // ============================================

  showExerciseDetail(exercise) {
    this.currentExercise = exercise;
    this.pairedExercises = null;
    this.warmupAdded = false;

    // Clear any exercise highlights
    const exerciseList = document.getElementById("exerciseList");
    if (exerciseList) {
      exerciseList
        .querySelectorAll(".exercise-item-highlight")
        .forEach((item) => {
          item.classList.remove("exercise-item-highlight");
        });
    }

    document.getElementById("exerciseDetailName").textContent = exercise.name;
    document.getElementById("exerciseDetailMuscleGroup").textContent =
      exercise.muscle_group;

    // Display form info if it exists
    const formInfoCard = document.getElementById("exerciseFormInfo");
    const formNotesDisplay = document.getElementById(
      "exerciseFormNotesDisplay",
    );
    const formVideoDisplay = document.getElementById(
      "exerciseFormVideoDisplay",
    );

    if (exercise.form_notes || exercise.form_video) {
      formInfoCard.style.display = "block";

      // Display form notes
      if (exercise.form_notes) {
        const noteP = document.createElement("p");
        noteP.style.cssText = "margin-bottom: var(--spacing-md); color: var(--dark-text-primary); line-height: 1.6;";
        noteP.textContent = exercise.form_notes;
        formNotesDisplay.innerHTML = "";
        formNotesDisplay.appendChild(noteP);
      } else {
        formNotesDisplay.innerHTML = "";
      }

      // Display form video link
      if (exercise.form_video && /^https?:\/\//i.test(exercise.form_video)) {
        formVideoDisplay.innerHTML = "";
        const link = document.createElement("a");
        link.href = exercise.form_video;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "btn-secondary";
        link.style.cssText = "display: inline-flex; align-items: center; gap: var(--spacing-xs);";
        link.innerHTML = `
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Watch Form Video
        `;
        formVideoDisplay.appendChild(link);
      } else {
        formVideoDisplay.innerHTML = "";
      }
    } else {
      formInfoCard.style.display = "none";
    }

    // Show single exercise view, hide paired view
    document.getElementById("singleExerciseView").classList.remove("hidden");
    document.getElementById("pairedExerciseView").classList.add("hidden");

    const summary = document.getElementById("sessionSummary");
    summary.classList.add("hidden");
    summary.innerHTML = "";

    this.renderPreviousSession(exercise);
    this.renderSessionForm(exercise);
    this.renderSessionHistory(exercise);
    this.renderExerciseInsights(exercise);

    this.showView("exerciseDetailView");

    // Update header context title after view is shown
    this.updateHeaderContextTitle();
  }

  showPairedExerciseDetail(exercise1, exercise2) {
    this.pairedExercises = [exercise1, exercise2];
    this.pairMode = false;
    this.selectedExercises = [];

    document.getElementById("exerciseDetailName").textContent =
      `${exercise1.name} + ${exercise2.name}`;
    document.getElementById("exerciseDetailMuscleGroup").textContent =
      "Paired Exercises";

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

    // Update header context title for paired exercises
    const headerContextRow =
      document.getElementById("headerContextTitle")?.parentElement;
    const headerContextTitle = document.getElementById("headerContextTitle");
    const headerContextBadges = document.getElementById("headerContextBadges");

    if (headerContextTitle && headerContextRow && headerContextBadges) {
      headerContextTitle.textContent = `${exercise1.name} + ${exercise2.name}`;

      // Add both muscle badges
      headerContextBadges.innerHTML = `
        <span class="muscle-badge">${exercise1.muscle_group}</span>
        <span class="muscle-badge">${exercise2.muscle_group}</span>
      `;

      headerContextRow.style.display = "flex";
    }

    this.autoResizeExerciseTitles();
    this.updateLayoutOffsets();
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
    defaultWeight = "",
  ) {
    const containerId = `pairedSetsContainer${exerciseNum}`;
    const container = document.getElementById(containerId);
    const currentSetCount = container.children.length;
    const setNum = setNumber || currentSetCount + 1;

    const nearestPreviousRow = container.lastElementChild;

    let repsValue = defaultReps;
    let weightValue = defaultWeight;

    if (
      setNumber === null &&
      (repsValue === null || repsValue === undefined || repsValue === "") &&
      nearestPreviousRow
    ) {
      const prevSetNum = nearestPreviousRow.getAttribute("data-set-number");
      const prevRepsInput = document.getElementById(
        `paired${exerciseNum}-reps-${prevSetNum}`,
      );
      repsValue = prevRepsInput ? prevRepsInput.value : "";
    }

    if (
      setNumber === null &&
      (weightValue === null ||
        weightValue === undefined ||
        weightValue === "") &&
      nearestPreviousRow
    ) {
      const prevSetNum = nearestPreviousRow.getAttribute("data-set-number");
      const prevWeightInput = document.getElementById(
        `paired${exerciseNum}-weight-${prevSetNum}`,
      );
      weightValue = prevWeightInput ? prevWeightInput.value : "";
    }

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
                    <input type="number" id="paired${exerciseNum}-reps-${setNum}" value="${repsValue}" min="0" step="1" required>
                    <button type="button" class="btn-increment" data-target="paired${exerciseNum}-reps-${setNum}" aria-label="Increase reps">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
                        </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-fill-down"
                      data-fill-type="reps"
                      data-set="${setNum}"
                      data-exercise="${exerciseNum}"
                      aria-label="Fill reps from set ${setNum} down">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v10"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 11l4 4 4-4"/>
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
                    <input type="number" id="paired${exerciseNum}-weight-${setNum}" value="${weightValue}" min="0" step="0.5">
                    <button type="button" class="btn-increment" data-target="paired${exerciseNum}-weight-${setNum}" aria-label="Increase weight">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
                        </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-fill-down"
                      data-fill-type="weight"
                      data-set="${setNum}"
                      data-exercise="${exerciseNum}"
                      aria-label="Fill weight from set ${setNum} down">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v10"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 11l4 4 4-4"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="input-group">
                <label>&nbsp;</label>
                <div class="input-with-controls">
                    <button type="button" class="btn-remove" data-set="${setNum}" data-exercise="${exerciseNum}" aria-label="Remove set">
                        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
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

    // Add event listeners for fill-down buttons
    row.querySelectorAll(".btn-fill-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const setIndex = parseInt(btn.dataset.set, 10);
        const exerciseIndex = parseInt(btn.dataset.exercise, 10);
        this.fillDownPairedValue(btn.dataset.fillType, setIndex, exerciseIndex);
      });
    });
  }

  renumberPairedSets(exerciseNum) {
    const container = document.getElementById(
      `pairedSetsContainer${exerciseNum}`,
    );
    Array.from(container.children).forEach((row, index) => {
      const setNum = index + 1;
      row.setAttribute("data-set-number", setNum);
      row.querySelector(".set-label").textContent = `Set ${setNum}`;

      const repsInput = row.querySelector(
        `input[id^="paired${exerciseNum}-reps-"]`,
      );
      const weightInput = row.querySelector(
        `input[id^="paired${exerciseNum}-weight-"]`,
      );

      if (repsInput) {
        repsInput.id = `paired${exerciseNum}-reps-${setNum}`;
      }

      if (weightInput) {
        weightInput.id = `paired${exerciseNum}-weight-${setNum}`;
      }

      row
        .querySelectorAll('[data-target^="paired' + exerciseNum + '-reps-"]')
        .forEach((btn) => {
          btn.setAttribute(
            "data-target",
            `paired${exerciseNum}-reps-${setNum}`,
          );
        });

      row
        .querySelectorAll('[data-target^="paired' + exerciseNum + '-weight-"]')
        .forEach((btn) => {
          btn.setAttribute(
            "data-target",
            `paired${exerciseNum}-weight-${setNum}`,
          );
        });

      const removeBtn = row.querySelector(".btn-remove");
      if (removeBtn) {
        removeBtn.setAttribute("data-set", setNum);
      }

      row.querySelectorAll(".btn-fill-down").forEach((btn) => {
        btn.setAttribute("data-set", setNum);
        btn.setAttribute("data-exercise", exerciseNum);
        const labelType = btn.dataset.fillType === "weight" ? "weight" : "reps";
        btn.setAttribute(
          "aria-label",
          `Fill ${labelType} from set ${setNum} down`,
        );
      });
    });
  }

  fillDownPairedValue(inputType, startSetNum, exerciseNum) {
    const startIndex = parseInt(startSetNum, 10);
    const sourceInput = document.getElementById(
      `paired${exerciseNum}-${inputType}-${startIndex}`,
    );
    if (!sourceInput || Number.isNaN(startIndex)) return;

    const value = sourceInput.value;
    const container = document.getElementById(
      `pairedSetsContainer${exerciseNum}`,
    );

    Array.from(container.children).forEach((row) => {
      const rowNum = parseInt(row.getAttribute("data-set-number"), 10);
      if (rowNum > startIndex) {
        const targetInput = row.querySelector(
          `#paired${exerciseNum}-${inputType}-${rowNum}`,
        );
        if (targetInput) {
          targetInput.value = value;
        }
      }
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

    this.updateSessionChecklist(this.currentWorkout);
    this.renderExerciseList();
    this.persistCurrentSession();

    this.showSuccessMessage("Both sessions saved successfully!");

    // Refresh the paired view
    this.showPairedExerciseDetail(
      this.pairedExercises[0],
      this.pairedExercises[1],
    );

    this.scrollToTop();
  }

  getPairedSets(exerciseNum) {
    const container = document.getElementById(
      `pairedSetsContainer${exerciseNum}`,
    );
    const sets = [];

    Array.from(container.children).forEach((row) => {
      const setNum = row.getAttribute("data-set-number");
      const reps = parseInt(
        document.getElementById(`paired${exerciseNum}-reps-${setNum}`).value,
      );
      const weightValue = document.getElementById(
        `paired${exerciseNum}-weight-${setNum}`,
      ).value;
      const weight = weightValue ? parseFloat(weightValue) : 0;

      if (!isNaN(reps)) {
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

  addWarmupSets() {
    if (!this.currentExercise) return;
    if (this.warmupAdded) {
      this.showSuccessMessage("Warmup already added");
      return;
    }

    const baseWeight = this.currentExercise.weight_kg || 20;
    const baseReps = this.currentExercise.reps || 8;

    const container = document.getElementById("setsContainer");
    const insertBefore = container.firstChild;

    [0.5, 0.7]
      .slice()
      .reverse()
      .forEach((ratio) => {
        const warmupWeight = Math.max(
          0,
          parseFloat((baseWeight * ratio).toFixed(1)),
        );
        this.addSetRow(null, baseReps, warmupWeight, insertBefore);
      });

    this.warmupAdded = true;
    this.renumberSets();
    document.getElementById("sessionForm").scrollIntoView({
      behavior: "smooth",
    });
    this.showSuccessMessage("Warmup block added. Tweak the weights as needed.");
  }

  addSetRow(
    setNumber = null,
    defaultReps = null,
    defaultWeight = null,
    insertBefore = null,
  ) {
    const container = document.getElementById("setsContainer");
    const currentSetCount = container.children.length;
    const setNum = setNumber || currentSetCount + 1;

    const nearestPreviousRow = insertBefore
      ? insertBefore.previousElementSibling
      : container.lastElementChild;

    let repsValue = defaultReps;
    let weightValue = defaultWeight;

    if (
      !insertBefore &&
      (repsValue === null || repsValue === undefined || repsValue === "") &&
      nearestPreviousRow
    ) {
      const prevSetNum = nearestPreviousRow.getAttribute("data-set-number");
      const prevRepsInput = document.getElementById(`reps-${prevSetNum}`);
      repsValue = prevRepsInput ? prevRepsInput.value : "";
    }

    if (
      !insertBefore &&
      (weightValue === null ||
        weightValue === undefined ||
        weightValue === "") &&
      nearestPreviousRow
    ) {
      const prevSetNum = nearestPreviousRow.getAttribute("data-set-number");
      const prevWeightInput = document.getElementById(`weight-${prevSetNum}`);
      weightValue = prevWeightInput ? prevWeightInput.value : "";
    }

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
                    <input type="number" id="reps-${setNum}" name="reps-${setNum}" value="${repsValue ?? ""}" min="0" step="1" required>
                    <button type="button" class="btn-increment" data-target="reps-${setNum}" aria-label="Increase reps">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
                        </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-fill-down"
                      data-fill-type="reps"
                      data-set="${setNum}"
                      aria-label="Fill reps from set ${setNum} down">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v10"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 11l4 4 4-4"/>
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
                    <input type="number" id="weight-${setNum}" name="weight-${setNum}" value="${weightValue ?? ""}" min="0" step="0.5">
                    <button type="button" class="btn-increment" data-target="weight-${setNum}" aria-label="Increase weight">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
                        </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-fill-down"
                      data-fill-type="weight"
                      data-set="${setNum}"
                      aria-label="Fill weight from set ${setNum} down">
                        <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v10"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 11l4 4 4-4"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="input-group">
                <label>&nbsp;</label>
                <div class="input-with-controls">
                    <button type="button" class="btn-remove" data-set="${setNum}" aria-label="Remove set">
                        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

    if (insertBefore) {
      container.insertBefore(row, insertBefore);
    } else {
      container.appendChild(row);
    }

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

    // Add event listeners for fill-down buttons
    row.querySelectorAll(".btn-fill-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const setIndex = parseInt(btn.dataset.set, 10);
        this.fillDownValue(btn.dataset.fillType, setIndex);
      });
    });
  }

  renumberSets() {
    const container = document.getElementById("setsContainer");
    Array.from(container.children).forEach((row, index) => {
      const setNum = index + 1;
      row.setAttribute("data-set-number", setNum);
      row.querySelector(".set-label").textContent = `Set ${setNum}`;

      const repsInput = row.querySelector('input[id^="reps-"]');
      const weightInput = row.querySelector('input[id^="weight-"]');

      if (repsInput) {
        repsInput.id = `reps-${setNum}`;
        repsInput.name = `reps-${setNum}`;
      }

      if (weightInput) {
        weightInput.id = `weight-${setNum}`;
        weightInput.name = `weight-${setNum}`;
      }

      row.querySelectorAll('[data-target^="reps-"]').forEach((btn) => {
        btn.setAttribute("data-target", `reps-${setNum}`);
      });

      row.querySelectorAll('[data-target^="weight-"]').forEach((btn) => {
        btn.setAttribute("data-target", `weight-${setNum}`);
      });

      const removeBtn = row.querySelector(".btn-remove");
      if (removeBtn) {
        removeBtn.setAttribute("data-set", setNum);
      }

      row.querySelectorAll(".btn-fill-down").forEach((btn) => {
        btn.setAttribute("data-set", setNum);
        const labelType = btn.dataset.fillType === "weight" ? "weight" : "reps";
        btn.setAttribute(
          "aria-label",
          `Fill ${labelType} from set ${setNum} down`,
        );
      });
    });
  }

  fillDownValue(inputType, startSetNum) {
    const startIndex = parseInt(startSetNum, 10);
    const sourceInput = document.getElementById(`${inputType}-${startIndex}`);
    if (!sourceInput || Number.isNaN(startIndex)) return;

    const value = sourceInput.value;
    const container = document.getElementById("setsContainer");

    Array.from(container.children).forEach((row) => {
      const rowNum = parseInt(row.getAttribute("data-set-number"), 10);
      if (rowNum > startIndex) {
        const targetInput = row.querySelector(`#${inputType}-${rowNum}`);
        if (targetInput) {
          targetInput.value = value;
        }
      }
    });
  }

  saveSession() {
    const container = document.getElementById("setsContainer");
    const sets = [];

    Array.from(container.children).forEach((row) => {
      const setNum = row.getAttribute("data-set-number");
      const reps = parseInt(document.getElementById(`reps-${setNum}`).value);
      const weightValue = document.getElementById(`weight-${setNum}`).value;
      const weight = weightValue ? parseFloat(weightValue) : 0;

      if (!isNaN(reps)) {
        sets.push({ reps, weight_kg: weight });
      }
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

    session.totalVolume = this.calculateVolume(sets);
    session.pr = this.getPrFlags(this.currentExercise.name, sets);

    this.sessions.push(session);
    this.saveSessions();
    this.refreshInsights();

    // Refresh the view
    this.showExerciseDetail(this.currentExercise);

    this.showSessionSummary(session);

    this.scrollToTop();

    // Show success feedback
    this.showSuccessMessage("Session saved successfully!");
  }

  calculateVolume(sets) {
    return sets.reduce(
      (sum, set) => sum + (set.reps || 0) * (set.weight_kg || 0),
      0,
    );
  }

  getPrFlags(exerciseName, newSets) {
    const history = this.sessions.filter(
      (s) => s.exerciseName === exerciseName,
    );

    if (history.length === 0) {
      return { weight: false, volume: false };
    }

    const newMaxWeight = Math.max(
      0,
      ...newSets.map((set) => set.weight_kg || 0),
    );
    const newVolume = this.calculateVolume(newSets);

    const previousMaxWeight = history.reduce((max, session) => {
      const sessionMax = Math.max(
        0,
        ...(session.sets || []).map((set) => set.weight_kg || 0),
      );
      return Math.max(max, sessionMax);
    }, 0);

    const previousMaxVolume = history.reduce(
      (max, session) => Math.max(max, this.calculateVolume(session.sets || [])),
      0,
    );

    return {
      weight: newMaxWeight > previousMaxWeight,
      volume: newVolume > previousMaxVolume,
    };
  }

  showSessionSummary(session) {
    const summary = document.getElementById("sessionSummary");
    if (!summary) return;

    const volume = session.totalVolume || this.calculateVolume(session.sets);
    const prBadges = [];
    if (session.pr?.weight) prBadges.push("Heaviest set PR");
    if (session.pr?.volume) prBadges.push("Highest volume");

    summary.innerHTML = `
      <div class="session-summary-details">
        <p class="session-summary-title">Session saved</p>
        <p class="session-summary-meta">${
          session.sets.length
        } sets · ${volume.toFixed(1)} kg-reps total</p>
      </div>
      <div>
        ${prBadges
          .map(
            (badge) => `<span class="pr-badge" aria-label="PR">${badge}</span>`,
          )
          .join(" ")}
      </div>
    `;

    summary.classList.remove("hidden");
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

      if (session.pr?.weight || session.pr?.volume) {
        const pr = document.createElement("div");
        pr.className = "history-item-pr";
        pr.textContent = `${session.pr.weight ? "Weight PR" : ""} ${
          session.pr.volume ? "Volume PR" : ""
        }`.trim();
        date.appendChild(pr);
      }

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
  // Workout History & Sharing
  // ============================================

  endCurrentWorkoutSession() {
    if (!this.currentWorkout) return;

    const todayKey = this.getLocalDateKey();
    const todaysSessions = this.sessions.filter(
      (s) =>
        s.workoutId === this.currentWorkout.id &&
        this.getLocalDateKey(new Date(s.date)) === todayKey,
    );

    const exerciseMap = new Map();

    todaysSessions.forEach((session) => {
      const existing = exerciseMap.get(session.exerciseName) || {
        name: session.exerciseName,
        muscleGroup: session.muscleGroup,
        sets: 0,
        reps: 0,
        volume: 0,
      };

      const sessionReps = (session.sets || []).reduce(
        (sum, set) => sum + (set.reps || 0),
        0,
      );
      const sessionVolume = this.calculateVolume(session.sets || []);

      existing.sets += (session.sets || []).length;
      existing.reps += sessionReps;
      existing.volume += sessionVolume;

      exerciseMap.set(session.exerciseName, existing);
    });

    const exercises = Array.from(exerciseMap.values());

    const sessionExercises = this.getActiveSessionExercises();

    const summary = {
      id: Date.now(),
      workoutId: this.currentWorkout.id,
      workoutName: this.currentWorkout.name,
      date: new Date().toISOString(),
      exercises,
      totalSets: exercises.reduce((sum, ex) => sum + ex.sets, 0),
      totalVolume:
        Math.round(exercises.reduce((sum, ex) => sum + ex.volume, 0) * 10) / 10,
      totalReps: exercises.reduce((sum, ex) => sum + ex.reps, 0),
      completionPct:
        sessionExercises.length === 0
          ? 0
          : Math.round((exercises.length / sessionExercises.length) * 100),
    };

    summary.headline = this.buildWorkoutHeadline(summary);

    const existingIndex = this.workoutHistory.findIndex(
      (entry) =>
        entry.workoutId === summary.workoutId &&
        this.getLocalDateKey(new Date(entry.date)) === todayKey,
    );

    if (existingIndex !== -1) {
      this.workoutHistory.splice(existingIndex, 1);
    }

    this.workoutHistory.unshift(summary);
    this.saveWorkoutHistory();
    this.selectedHistoryId = summary.id;

    this.refreshInsights();

    this.showSuccessMessage("Workout saved to history");

    // Auto-sync to Google Sheets if enabled
    if (this.googleSheetsAutoSync && this.googleSheetsUrl) {
      this.syncWorkoutToSheets(summary, todaysSessions);
    }

    this.clearPersistedSession(this.currentWorkout.id);
    this.openHistoryView(summary.id);
  }

  buildWorkoutHeadline(summary) {
    if (summary.totalVolume > 0) {
      return `Moved ${summary.totalVolume.toFixed(1)} kg-reps across ${
        summary.totalSets
      } sets`;
    }

    if (summary.totalSets > 0) {
      return `${summary.totalSets} sets logged — momentum rising`;
    }

    return "Logged a check-in — the streak counts";
  }

  openHistoryView(selectedId = null) {
    this.showView("workoutHistoryView");
    this.renderWorkoutHistoryList(selectedId || this.selectedHistoryId);
  }

  openHistoryForDate(dateKey) {
    const match = this.workoutHistory.find(
      (entry) => this.getLocalDateKey(new Date(entry.date)) === dateKey,
    );

    if (match) {
      this.selectedHistoryId = match.id;
      this.openHistoryView(match.id);
      return;
    }

    this.openHistoryView();
    this.showSuccessMessage("No saved workout for that day yet");
  }

  renderWorkoutHistoryList(selectedId = null) {
    const list = document.getElementById("workoutHistoryList");
    const count = document.getElementById("historyCount");

    if (!list) return;

    list.innerHTML = "";
    const hasEntries = this.workoutHistory.length > 0;
    if (count) {
      count.textContent = hasEntries
        ? `${this.workoutHistory.length} saved`
        : "Nothing yet";
    }

    if (!hasEntries) {
      this.selectedHistoryId = null;
      this.renderWorkoutHistoryDetail(null);
      return;
    }

    const targetId = selectedId || this.workoutHistory[0].id;
    this.selectedHistoryId = targetId;

    this.workoutHistory.forEach((entry) => {
      const exerciseCount = entry.exercises?.length || 0;
      const item = document.createElement("button");
      item.className = "history-list-item";
      item.type = "button";
      item.setAttribute(
        "aria-label",
        `${entry.workoutName} on ${this.formatDate(new Date(entry.date))}`,
      );

      if (entry.id === targetId) {
        item.classList.add("active");
      }

      const title = document.createElement("div");
      title.className = "history-list-title";
      title.textContent = entry.workoutName;

      const meta = document.createElement("div");
      meta.className = "history-list-meta";
      meta.textContent = `${this.formatDate(
        new Date(entry.date),
      )} · ${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`;

      const stats = document.createElement("div");
      stats.className = "history-list-stats";
      stats.innerHTML = `
        <span>${entry.totalSets || 0} sets</span>
        <span>${(entry.totalVolume || 0).toFixed(1)} kg-reps</span>
      `;

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(stats);

      item.addEventListener("click", () => {
        this.selectedHistoryId = entry.id;
        this.renderWorkoutHistoryList(entry.id);
      });

      list.appendChild(item);
    });

    const selectedEntry = this.workoutHistory.find((e) => e.id === targetId);
    this.renderWorkoutHistoryDetail(selectedEntry || null);
  }

  renderWorkoutHistoryDetail(entry) {
    const detail = document.getElementById("historyDetail");
    const empty = document.getElementById("historyEmptyState");

    if (!detail) return;

    if (!entry) {
      detail.classList.add("hidden");
      if (empty) empty.classList.remove("hidden");
      return;
    }

    detail.classList.remove("hidden");
    if (empty) empty.classList.add("hidden");

    const mood = document.getElementById("historyDetailMood");
    const title = document.getElementById("historyDetailTitle");
    const date = document.getElementById("historyDetailDate");
    const chips = document.getElementById("historyStatChips");
    const funFact = document.getElementById("historyFunFact");
    const exerciseGrid = document.getElementById("historyExerciseGrid");
    const volumeChart = document.getElementById("historyVolumeChart");
    const volumeLegend = document.getElementById("historyVolumeLegend");
    const repsChart = document.getElementById("historyRepsChart");
    const repsLegend = document.getElementById("historyRepsLegend");
    const milestones = document.getElementById("historyMilestones");
    const quoteEl = document.getElementById("historyQuote");
    const exercises = entry.exercises || [];

    if (mood) mood.textContent = this.getHistoryMood(entry);
    if (title) title.textContent = entry.workoutName;
    if (date) date.textContent = this.formatDate(new Date(entry.date));

    if (chips) {
      chips.innerHTML = "";
      [
        `${entry.totalSets || 0} sets`,
        `${(entry.totalVolume || 0).toFixed(1)} kg-reps`,
        `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`,
      ].forEach((text) => {
        const pill = document.createElement("span");
        pill.className = "pill pill-soft";
        pill.textContent = text;
        chips.appendChild(pill);
      });
    }

    if (funFact) {
      funFact.textContent = entry.headline || this.buildWorkoutHeadline(entry);
    }

    this.renderMuscleChart(
      volumeChart,
      volumeLegend,
      this.getVolumeByMuscle(exercises),
      "kg-reps",
    );
    this.renderMuscleChart(
      repsChart,
      repsLegend,
      this.getRepsByMuscle(exercises),
      "reps",
      "Track reps to see how bodyweight work stacks up.",
    );

    if (milestones) {
      const historyForWorkout = this.workoutHistory.filter(
        (s) => s.workoutId === entry.workoutId,
      );
      const totalRuns = historyForWorkout.length;
      const previousRun = historyForWorkout
        .filter((run) => run.id !== entry.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const firstRun = historyForWorkout
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      const topMuscle = this.getVolumeByMuscle(exercises)[0];

      milestones.innerHTML = "";

      const stats = [
        {
          label: "Session count",
          value: totalRuns === 1 ? "Debut session" : `${totalRuns} total runs`,
          sub: firstRun
            ? `Started ${this.formatDate(new Date(firstRun.date))}`
            : "Log this workout to start tracking",
        },
        {
          label: "Last completed",
          value: previousRun
            ? this.formatRelativeDay(previousRun.date, entry.date)
            : "First time",
          sub: previousRun
            ? this.formatDate(new Date(previousRun.date))
            : "No earlier record",
        },
        {
          label: "Body-part MVP",
          value: topMuscle ? topMuscle.muscle : "Full body",
          sub: topMuscle
            ? `${topMuscle.volume.toFixed(1)} kg-reps of focus`
            : "Add sets to see the breakdown",
        },
      ];

      stats.forEach((stat) => {
        const card = document.createElement("div");
        card.className = "milestone-card";
        card.innerHTML = `
          <p class="milestone-label">${stat.label}</p>
          <p class="milestone-value">${stat.value}</p>
          <p class="milestone-sub">${stat.sub}</p>
        `;
        milestones.appendChild(card);
      });
    }

    if (quoteEl) {
      const quote = this.getRandomQuote();
      if (quote) {
        quoteEl.innerHTML = `“${quote.text}” <span>— ${quote.author}</span>`;
      } else {
        quoteEl.textContent = "";
      }
    }

    if (exerciseGrid) {
      exerciseGrid.innerHTML = "";
      if (exercises.length === 0) {
        exerciseGrid.innerHTML =
          '<p class="history-empty-body">No sets logged today — count it as a recovery check-in.</p>';
      } else {
        const sorted = exercises
          .slice()
          .sort((a, b) => (b.volume || 0) - (a.volume || 0));
        sorted.forEach((exercise) => {
          const card = document.createElement("div");
          card.className = "history-exercise-card";

          card.innerHTML = `
            <div class="history-exercise-top">
              <p class="history-exercise-name">${exercise.name}</p>
              <span class="pill pill-soft">${exercise.muscleGroup || ""}</span>
            </div>
            <p class="history-exercise-meta">${exercise.sets || 0} sets · ${
              exercise.reps || 0
            } reps · ${(exercise.volume || 0).toFixed(1)} kg-reps</p>
          `;

          exerciseGrid.appendChild(card);
        });
      }
    }

    const previewUrl = this.generateWorkoutShareCard(entry);
    this.setHistorySharePreview(previewUrl);
  }

  getHistoryMood(entry) {
    if (!entry) return "";
    if (entry.totalVolume > 0) return "Strength day";
    if (entry.totalSets > 0) return "Logged and loaded";
    return "Mindful check-in";
  }

  generateWorkoutShareCard(entry) {
    const width = 1080;
    const padding = 48;
    const chartHeight = 320;
    const chartsY = 280;
    const listStartY = chartsY + chartHeight + 56;
    const rowHeight = 82;
    const exercises = entry.exercises || [];
    const rows = Math.max(Math.ceil(exercises.length / 2), 1);
    const gridHeight = exercises.length ? rows * rowHeight : 96;
    const footerHeight = 96;
    const height = listStartY + gridHeight + footerHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#111827");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Accent overlay
    ctx.fillStyle = "rgba(79, 70, 229, 0.08)";
    ctx.beginPath();
    ctx.ellipse(width * 0.7, 260, 320, 180, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Header
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "26px Inter, sans-serif";
    ctx.fillText(this.formatDate(new Date(entry.date)), padding, 64);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "42px Inter, sans-serif";
    this.drawTruncatedText(
      ctx,
      entry.workoutName,
      padding,
      108,
      width - padding * 2,
    );

    ctx.font = "22px Inter, sans-serif";
    ctx.fillStyle = "#cbd5e1";
    this.drawTruncatedText(
      ctx,
      entry.headline || this.buildWorkoutHeadline(entry),
      padding,
      146,
      width - padding * 2,
    );

    // Stats row
    const stats = [
      { label: "Sets", value: entry.totalSets || 0 },
      {
        label: "Volume",
        value: `${(entry.totalVolume || 0).toFixed(1)} kg-reps`,
      },
      {
        label: "Exercises",
        value: `${exercises.length} ${
          exercises.length === 1 ? "movement" : "movements"
        }`,
      },
    ];

    ctx.font = "18px Inter, sans-serif";
    stats.forEach((stat, index) => {
      const x = padding + index * 220;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      this.drawRoundedRect(ctx, x - 12, 180, 200, 70, 12);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(stat.label, x, 206);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "26px Inter, sans-serif";
      ctx.fillText(stat.value, x, 236);
      ctx.font = "18px Inter, sans-serif";
    });

    // Charts
    const chartWidth = (width - padding * 2 - 32) / 2;
    const volumeData = this.getVolumeByMuscle(exercises);
    const repData = this.getRepsByMuscle(exercises);
    this.drawShareChart(ctx, volumeData, {
      x: padding,
      y: chartsY,
      width: chartWidth,
      height: chartHeight,
      title: "Weighted volume",
      unit: "kg-reps",
      emptyText: "Add loaded lifts to see volume share.",
    });
    this.drawShareChart(ctx, repData, {
      x: padding + chartWidth + 32,
      y: chartsY,
      width: chartWidth,
      height: chartHeight,
      title: "Reps completed",
      unit: "reps",
      emptyText: "Track bodyweight moves to unlock this view.",
    });

    // Exercise grid (all exercises)
    this.drawExerciseGrid(ctx, exercises, {
      x: padding,
      y: listStartY,
      width: width - padding * 2,
    });

    // Footer
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px Inter, sans-serif";
    ctx.fillText("Workout Tracker • Shareable recap", padding, height - 32);

    return canvas.toDataURL("image/png");
  }

  setHistorySharePreview(dataUrl) {
    const preview = document.getElementById("historySharePreview");
    if (preview) {
      preview.src = dataUrl;
    }
    this.latestShareDataUrl = dataUrl;
  }

  exportSelectedWorkoutShareCard() {
    const entry = this.workoutHistory.find(
      (item) => item.id === this.selectedHistoryId,
    );
    if (!entry) return;

    const dataUrl = this.generateWorkoutShareCard(entry);
    const link = document.createElement("a");
    link.href = dataUrl;
    const dateStr = this.getLocalDateKey(new Date(entry.date));
    link.download = `${entry.workoutName}-${dateStr}-recap.png`;
    link.click();
    this.setHistorySharePreview(dataUrl);
    this.showSuccessMessage("Recap image exported");
  }

  async copySelectedWorkoutShareCard() {
    const entry = this.workoutHistory.find(
      (item) => item.id === this.selectedHistoryId,
    );
    if (!entry) return;

    const dataUrl = this.generateWorkoutShareCard(entry);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(dataUrl);
        this.showSuccessMessage("Copied image data URL to clipboard");
      } else {
        this.showSuccessMessage("Copy not supported in this browser");
      }
    } catch (error) {
      console.error("Copy failed", error);
      this.showSuccessMessage("Unable to copy right now");
    }
    this.setHistorySharePreview(dataUrl);
  }

  drawRoundedRect(ctx, x, y, width, height, radius = 12) {
    const r = Math.min(radius, height / 2, width / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  drawTruncatedText(ctx, text, x, y, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.fillText(text, x, y);
      return;
    }

    let truncated = text;
    while (
      ctx.measureText(`${truncated}…`).width > maxWidth &&
      truncated.length > 0
    ) {
      truncated = truncated.slice(0, -1);
    }
    ctx.fillText(`${truncated}…`, x, y);
  }

  drawShareChart(ctx, data, options) {
    const { x, y, width, title, unit, emptyText } = options;
    ctx.save();
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px Inter, sans-serif";
    ctx.fillText(title, x, y);

    const items = data.slice(0, 5);
    if (!items.length || items.every((item) => !item.value)) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "16px Inter, sans-serif";
      ctx.fillText(emptyText, x, y + 32);
      ctx.restore();
      return;
    }

    const maxValue = Math.max(...items.map((item) => item.value), 1);
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    const barHeight = 26;
    const spacing = 52;

    items.forEach((item, index) => {
      const barY = y + 30 + index * spacing;
      const gradient = ctx.createLinearGradient(x, barY, x + width, barY);
      gradient.addColorStop(0, `hsl(${200 + index * 18}, 82%, 72%)`);
      gradient.addColorStop(1, `hsl(${280 + index * 16}, 88%, 74%)`);

      const label = this.truncateForWidth(ctx, item.muscle, width - 80);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "17px Inter, sans-serif";
      ctx.fillText(label, x, barY);

      ctx.font = "14px Inter, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      const valueText =
        unit === "reps"
          ? `${Math.round(item.value)} ${unit}`
          : `${item.value.toFixed(1)} ${unit}`;
      ctx.fillText(valueText, x + width - 140, barY);

      // Track
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      this.drawRoundedRect(ctx, x, barY + 10, width, barHeight, 10);

      // Fill
      ctx.fillStyle = gradient;
      this.drawRoundedRect(
        ctx,
        x,
        barY + 10,
        Math.max((item.value / maxValue) * width, 6),
        barHeight,
        10,
      );

      ctx.fillStyle = "#f8fafc";
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText(
        `${Math.round((item.value / totalValue) * 100)}%`,
        x + width - 48,
        barY + 28,
      );
    });
    ctx.restore();
  }

  truncateForWidth(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;

    let truncated = text;
    while (
      ctx.measureText(`${truncated}…`).width > maxWidth &&
      truncated.length > 0
    ) {
      truncated = truncated.slice(0, -1);
    }
    return `${truncated}…`;
  }

  drawExerciseGrid(ctx, exercises, options) {
    const { x, y, width } = options;
    ctx.save();
    ctx.font = "18px Inter, sans-serif";

    if (!exercises.length) {
      ctx.fillStyle = "#6b7280";
      ctx.fillText("No exercises logged yet", x, y + 20);
      ctx.restore();
      return;
    }

    const colWidth = (width - 24) / 2;
    const rowHeight = 82;

    exercises.forEach((exercise, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardX = x + col * (colWidth + 24);
      const cardY = y + row * rowHeight;

      ctx.fillStyle = "rgba(255,255,255,0.04)";
      this.drawRoundedRect(ctx, cardX, cardY, colWidth, rowHeight - 16, 14);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "20px Inter, sans-serif";
      this.drawTruncatedText(
        ctx,
        exercise.name,
        cardX + 14,
        cardY + 30,
        colWidth - 28,
      );

      ctx.font = "14px Inter, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(exercise.muscleGroup || "", cardX + 14, cardY + 52);

      ctx.fillStyle = "#e5e7eb";
      const meta = `${exercise.sets || 0} sets • ${
        exercise.reps || 0
      } reps • ${(exercise.volume || 0).toFixed(1)} kg-reps`;
      this.drawTruncatedText(ctx, meta, cardX + 14, cardY + 72, colWidth - 28);
    });

    ctx.restore();
  }

  // ============================================
  // Insights and Visualizations
  // ============================================

  refreshInsights() {
    this.renderWorkoutList();
    if (this.currentWorkout) {
      this.renderExerciseList();
      this.updateSessionChecklist(this.currentWorkout);
    }
    this.renderActivityOverview();
    this.renderWorkoutOverview();
    this.renderCoachPerformanceCharts();
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
      dailyCounts.slice(0, dailyCounts.length - 7),
    );

    const totalEl = document.getElementById("activityTotal");
    const trendEl = document.getElementById("activityTrend");

    if (!totalEl || !trendEl) return;

    totalEl.textContent = `${total} sets`;
    trendEl.textContent = trendText;

    this.renderMiniBarChart(
      "activityChart",
      dailyCounts.map((day) => ({
        label: day.label,
        value: day.value,
      })),
    );
  }

  renderCoachPerformanceCharts() {
    const chart7 = document.getElementById("coachSetsChart7");
    const chart28 = document.getElementById("coachSetsChart28");

    if (!chart7 || !chart28) return;

    const entries7 = this.getSetCountsByExercise(7);
    const entries28 = this.getSetCountsByExercise(28);

    const total7 = entries7.reduce((sum, entry) => sum + entry.value, 0);
    const total28 = entries28.reduce((sum, entry) => sum + entry.value, 0);

    const total7El = document.getElementById("coachSetsTotal7");
    const total28El = document.getElementById("coachSetsTotal28");
    const trend7El = document.getElementById("coachSetsTrend7");
    const trend28El = document.getElementById("coachSetsTrend28");

    if (total7El) {
      total7El.textContent = `${total7} sets`;
    }
    if (total28El) {
      total28El.textContent = `${total28} sets`;
    }

    if (trend7El) {
      trend7El.textContent = entries7.length
        ? `Across ${entries7.length} exercise${entries7.length === 1 ? "" : "s"}`
        : "No sets logged in the last 7 days";
    }

    if (trend28El) {
      trend28El.textContent = entries28.length
        ? `Across ${entries28.length} exercise${
            entries28.length === 1 ? "" : "s"
          }`
        : "No sets logged in the last 28 days";
    }

    this.renderMiniBarChart("coachSetsChart7", entries7);
    this.renderMiniBarChart("coachSetsChart28", entries28);
  }

  renderWorkoutOverview() {
    const days = 14;
    const dailyCounts = this.getOverallWorkoutCounts(days);
    const total = dailyCounts.reduce((sum, day) => sum + day.value, 0);
    const trendText = this.describeTrend(
      dailyCounts.slice(-7),
      dailyCounts.slice(0, dailyCounts.length - 7),
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
        date: day.date,
      })),
      (entry) => {
        if (entry.date) {
          this.openHistoryForDate(entry.date);
        }
      },
    );
  }

  renderWorkoutInsights(workout) {
    const days = 14;
    const historySource =
      this.workoutHistory.filter((s) => s.workoutId === workout.id).length > 0
        ? this.workoutHistory
        : this.sessions;

    const history = historySource.filter((s) => s.workoutId === workout.id);
    const lastSession =
      history.length > 0
        ? history.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0]
        : null;
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
      dailyCounts.slice(0, dailyCounts.length - 7),
    );

    this.renderMiniBarChart(
      "currentWorkoutChart",
      dailyCounts.map((day) => ({
        label: day.label,
        value: day.value,
      })),
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
        0,
      ),
    );

    const averageVolume =
      volumes.length > 0
        ? Math.round(
            (volumes.reduce((a, b) => a + b, 0) / volumes.length) * 10,
          ) / 10
        : 0;

    recencyEl.textContent = this.formatDate(new Date(last.date));
    lastPerformedEl.textContent = this.formatDate(new Date(last.date));
    countEl.textContent = `${totalSessions} session${
      totalSessions === 1 ? "" : "s"
    }`;
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
          0,
        ),
      })),
    );

    const trendData = recentSessions.map((session) => ({
      value: session.sets.reduce(
        (sum, set) => sum + (set.weight_kg || 0) * (set.reps || 0),
        0,
      ),
    }));
    trendEl.textContent = this.describeTrend(
      trendData.slice(-5),
      trendData.slice(0, Math.max(0, trendData.length - 5)),
    );
  }

  renderMiniBarChart(containerId, data, onBarClick = null) {
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

      if (onBarClick) {
        bar.classList.add("mini-bar-clickable");
        bar.tabIndex = 0;
        bar.addEventListener("click", () => onBarClick(entry));
        bar.addEventListener("keypress", (e) => {
          if (e.key === "Enter") onBarClick(entry);
        });
      }

      container.appendChild(bar);
    });
  }

  getDailyExerciseCounts(days = 14) {
    const today = new Date();
    const counts = new Map();

    this.sessions.forEach((session) => {
      const key = session.date.split("T")[0];
      const setsLogged = (session.sets || []).length;
      counts.set(key, (counts.get(key) || 0) + setsLogged);
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

  getSetCountsByExercise(days = 7) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const counts = new Map();

    this.sessions.forEach((session) => {
      const sessionDate = new Date(session.date);
      if (Number.isNaN(sessionDate.getTime()) || sessionDate < startDate) {
        return;
      }

      const exerciseName = session.exerciseName || "Unknown exercise";
      const setCount = (session.sets || []).length;
      if (!setCount) return;

      counts.set(exerciseName, (counts.get(exerciseName) || 0) + setCount);
    });

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  getWorkoutDailyCounts(workoutId, days = 14) {
    const today = new Date();
    const counts = new Map();

    this.sessions
      .filter((s) => s.workoutId === workoutId)
      .forEach((session) => {
        const key = (session.date || "").split("T")[0];
        counts.set(key, (counts.get(key) || 0) + 1);
      });

    this.workoutHistory
      .filter((s) => s.workoutId === workoutId)
      .forEach((entry) => {
        const key = (entry.date || "").split("T")[0];
        counts.set(key, Math.max(1, counts.get(key) || 0));
      });

    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().split("T")[0];
      results.push({
        label: this.formatShortDate(date),
        value: counts.get(key) || 0,
        date: key,
      });
    }
    return results;
  }

  getOverallWorkoutCounts(days = 14) {
    const today = new Date();
    const counts = new Map();

    const allEntries = [...this.sessions, ...this.workoutHistory];

    allEntries.forEach((session) => {
      const key = (session.date || "").split("T")[0];
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
        date: key,
      });
    }
    return results;
  }

  describeTrend(recentSlice, previousSlice) {
    const recentTotal = recentSlice.reduce((sum, day) => sum + day.value, 0);
    const previousTotal = previousSlice.reduce(
      (sum, day) => sum + day.value,
      0,
    );

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

  getVolumeByMuscle(exercises = []) {
    const totals = new Map();

    exercises.forEach((exercise) => {
      const key = exercise.muscleGroup || "Full body";
      totals.set(key, (totals.get(key) || 0) + (exercise.volume || 0));
    });

    return Array.from(totals.entries())
      .map(([muscle, volume]) => ({ muscle, volume, value: volume }))
      .sort((a, b) => b.volume - a.volume);
  }

  getRepsByMuscle(exercises = []) {
    const totals = new Map();

    exercises.forEach((exercise) => {
      const key = exercise.muscleGroup || "Full body";
      totals.set(key, (totals.get(key) || 0) + (exercise.reps || 0));
    });

    return Array.from(totals.entries())
      .map(([muscle, reps]) => ({ muscle, reps, value: reps }))
      .sort((a, b) => b.reps - a.reps);
  }

  renderMuscleChart(
    container,
    legendEl,
    breakdown,
    unitLabel,
    emptyMessage = "Log sets to see the muscle breakdown.",
  ) {
    if (!container) return;

    container.innerHTML = "";
    if (legendEl) legendEl.textContent = "";

    if (!breakdown.length || breakdown.every((item) => !item.value)) {
      container.innerHTML = `<p class="chart-caption">${emptyMessage}</p>`;
      return;
    }

    const maxValue = Math.max(...breakdown.map((v) => v.value), 1);
    const totalValue = breakdown.reduce((sum, item) => sum + item.value, 0);

    breakdown.forEach((item, index) => {
      const bar = document.createElement("div");
      bar.className = "volume-bar-item";
      const gradient = `linear-gradient(120deg, hsl(${
        200 + index * 18
      }, 82%, 72%), hsl(${280 + index * 16}, 88%, 74%))`;
      const pct = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;

      const formattedValue =
        unitLabel === "reps" ? Math.round(item.value) : item.value.toFixed(1);

      const barRow = document.createElement("div");
      barRow.className = "volume-bar-row";

      const barInfo = document.createElement("div");
      barInfo.className = "volume-bar-info";

      const swatch = document.createElement("span");
      swatch.className = "volume-swatch";
      swatch.style.background = gradient;

      const infoDiv = document.createElement("div");
      const nameP = document.createElement("p");
      nameP.className = "volume-bar-name";
      nameP.textContent = item.muscle;
      const subP = document.createElement("p");
      subP.className = "volume-bar-sub";
      subP.textContent = `${formattedValue} ${unitLabel}`;
      infoDiv.appendChild(nameP);
      infoDiv.appendChild(subP);

      barInfo.appendChild(swatch);
      barInfo.appendChild(infoDiv);

      const valueSpan = document.createElement("span");
      valueSpan.className = "volume-bar-value";
      valueSpan.textContent = `${pct}%`;

      barRow.appendChild(barInfo);
      barRow.appendChild(valueSpan);

      const track = document.createElement("div");
      track.className = "volume-bar-track";
      const fill = document.createElement("div");
      fill.className = "volume-bar-fill";
      fill.style.width = `${(item.value / maxValue) * 100}%`;
      fill.style.background = gradient;
      track.appendChild(fill);

      bar.appendChild(barRow);
      bar.appendChild(track);

      container.appendChild(bar);
    });

    if (legendEl && breakdown.length > 0) {
      const top = breakdown[0];
      const share = totalValue > 0 ? Math.round((top.value / totalValue) * 100) : 0;
      legendEl.textContent = `${top.muscle} carried the day (${share}% of ${unitLabel})`;
    }
  }

  formatRelativeDay(dateString, referenceDate = new Date()) {
    if (!dateString) return "Unknown";
    const target = new Date(dateString);
    const reference = new Date(referenceDate);
    const diffDays = Math.round(
      (reference.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 0) return "Earlier today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    const diffWeeks = Math.round(diffDays / 7);
    if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
    }

    return this.formatDate(target);
  }

  getRandomQuote() {
    if (!this.quotes.length) return null;
    const index = Math.floor(Math.random() * this.quotes.length);
    return this.quotes[index];
  }

  // ============================================
  // Onboarding
  // ============================================

  setupOnboarding() {
    this.onboardingSteps = [
      {
        title: "Welcome to Workout Tracker",
        body: "Track workouts, log sets, and keep your routine consistent. Let's take a 30-second tour.",
        viewId: "workoutListView",
      },
      {
        title: "Pick a workout",
        body: "Start on the home screen, tap a workout, and you'll see the exercises inside. Add your own anytime via Manage.",
        viewId: "workoutListView",
        focusSelector: "#workoutList .workout-card",
        prepare: () => {
          this.showView("workoutListView");
        },
      },
      {
        title: "Log sets with ease",
        body: "Open an exercise to see your last session, add sets with reps and weight, and save to build history.",
        viewId: "exerciseDetailView",
        focusId: "sessionForm",
        prepare: () => {
          this.openFirstExerciseDetailForOnboarding();
        },
      },
      {
        title: "Click 'Manage' to add and edit exercises and workouts",
        body: "Use the Manage menu to create workouts, tweak exercises, and keep your library organized.",
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
    if (!overlay) return;
    overlay.classList.remove("hidden");
    this.syncOnboardingContent();
  }

  hideOnboarding() {
    const overlay = document.getElementById("onboardingOverlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
  }

  syncOnboardingContent() {
    const step = this.onboardingSteps[this.onboardingStep];
    const titleEl = document.getElementById("onboardingTitle");
    const bodyEl = document.getElementById("onboardingBody");
    const backBtn = document.getElementById("onboardingBack");
    const nextBtn = document.getElementById("onboardingNext");

    if (!step || !titleEl || !bodyEl || !backBtn || !nextBtn) return;

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
        parseInt(dot.dataset.step) === this.onboardingStep,
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
    this.updateCoachSummaryOutput();
  }

  hideManagementView() {
    document.getElementById("managementView").classList.add("hidden");
  }

  switchManagementTab(tabName) {
    const managementView = document.getElementById("managementView");
    if (!managementView) return;

    // Update tab buttons
    managementView.querySelectorAll(".management-tab").forEach((tab) => {
      tab.classList.remove("active");
      if (tab.dataset.tab === tabName) {
        tab.classList.add("active");
      }
    });

    // Update tab content
    managementView
      .querySelectorAll(".management-tab-content")
      .forEach((content) => {
        content.classList.remove("active");
      });

    if (tabName === "exercises") {
      document.getElementById("exercisesTab").classList.add("active");
    } else if (tabName === "workouts") {
      document.getElementById("workoutsTab").classList.add("active");
      this.renderExerciseSelector();
    } else if (tabName === "coach") {
      document.getElementById("coachTab").classList.add("active");
      this.updateCoachSummaryOutput();
    } else if (tabName === "sync") {
      document.getElementById("syncTab").classList.add("active");
      this.renderSyncTabStatus();
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
        (e) => e.name.toLowerCase() === name.toLowerCase(),
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
    const originalName = document.getElementById(
      "editExerciseOriginalName",
    ).value;
    const newName = document.getElementById("editExerciseName").value.trim();
    const muscleGroup = document.getElementById("editMuscleGroup").value;
    const sets =
      parseInt(document.getElementById("editDefaultSets").value) || null;
    const reps =
      parseInt(document.getElementById("editDefaultReps").value) || null;
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
        exercise.name !== originalName,
    );

    if (duplicateName) {
      alert("An exercise with this name already exists");
      return;
    }

    const exercise = this.exerciseLibrary.find((e) => e.name === originalName);
    if (!exercise) return;

    const wasCurrentExercise =
      this.currentExercise && this.currentExercise.name === originalName;

    exercise.name = newName;
    exercise.muscle_group = muscleGroup;
    exercise.sets = sets;
    exercise.reps = reps;
    exercise.weight_kg = weight;
    exercise.form_notes = formNotes;
    exercise.form_video = formVideo;

    this.applyExerciseUpdates(originalName, exercise);

    if (wasCurrentExercise) {
      const updated = this.currentWorkout?.exercises.find(
        (ex) => ex.name === exercise.name,
      );
      this.currentExercise = updated || exercise;
      this.showExerciseDetail(this.currentExercise);
    }

    this.hideEditExerciseModal();
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

  applyExerciseUpdates(originalName, updatedExercise) {
    this.updateExerciseInWorkouts(originalName, updatedExercise);
    this.updateSessionsForExercise(originalName, updatedExercise);

    this.saveExerciseLibrary();
    this.saveWorkouts();
    this.saveSessions();

    this.renderExerciseLibrary();
    this.renderExerciseSelector();
    this.renderWorkoutManager();
    this.renderWorkoutList();
    if (this.currentWorkout) {
      this.renderExerciseList();
    }

    this.refreshInsights();
  }

  deleteExercise(exerciseName) {
    if (
      !confirm(
        `Delete "${exerciseName}"? This will remove it from all workouts.`,
      )
    ) {
      return;
    }

    // Remove from library
    this.exerciseLibrary = this.exerciseLibrary.filter(
      (e) => e.name !== exerciseName,
    );
    this.saveExerciseLibrary();

    // Remove from all workouts
    this.workouts.forEach((workout) => {
      workout.exercises = workout.exercises.filter(
        (e) => e.name !== exerciseName,
      );
    });
    this.saveWorkouts();

    // Remove orphaned sessions
    this.sessions = this.sessions.filter(
      (s) => s.exerciseName !== exerciseName,
    );
    this.saveSessions();

    // Clear current exercise if it was deleted
    if (this.currentExercise?.name === exerciseName) {
      this.currentExercise = null;
    }

    // Refresh displays
    this.renderExerciseLibrary();
    this.renderWorkoutManager();
    this.renderWorkoutList();
    this.refreshInsights();

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
      a.name.localeCompare(b.name),
    );

    const filtered = sorted.filter((exercise) =>
      this.matchesExerciseLibraryFilters(exercise),
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
        this.openEditExercise(exercise.name),
      );

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () =>
        this.deleteExercise(exercise.name),
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
      a.name.localeCompare(b.name),
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
      '#exerciseSelector input[type="checkbox"]:checked',
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
    const exercises = exerciseNames
      .map((name) => this.exerciseLibrary.find((e) => e.name === name))
      .filter(Boolean)
      .map((exercise) => ({ ...exercise }));

    const workout = {
      id: Date.now(),
      name,
      notes,
      date: null,
      exercises,
      favorite: false,
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
      `Workout "${name}" created with ${exercises.length} exercises!`,
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

    this.clearPersistedSession(workoutId);

    // Clean up orphaned sessions and history
    this.sessions = this.sessions.filter((s) => s.workoutId !== workoutId);
    this.saveSessions();
    this.workoutHistory = this.workoutHistory.filter(
      (h) => h.workoutId !== workoutId,
    );
    this.saveWorkoutHistory();

    // Reset current workout if it was deleted
    if (this.currentWorkout?.id === workoutId) {
      this.currentWorkout = null;
      this.currentExercise = null;
    }

    this.renderWorkoutManager();
    this.renderWorkoutList();
    this.refreshInsights();

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
    // Guard against missing exercise lists so the modal still renders
    // even if imported data is incomplete.
    this.renderEditExerciseSelector(workout.exercises || []);

    // Show the edit modal
    document.getElementById("editWorkoutModal").classList.remove("hidden");
  }

  hideEditWorkoutModal() {
    document.getElementById("editWorkoutModal").classList.add("hidden");
    document.getElementById("editWorkoutForm").reset();
  }

  renderEditExerciseSelector(currentExercises = []) {
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
      a.name.localeCompare(b.name),
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
      '#editExerciseSelector input[type="checkbox"]:checked',
    );
    const selectedNames = Array.from(checkboxes).map((cb) => cb.value);
    const selectedContainer = document.getElementById("editSelectedExercises");

    // Preserve the user's existing order and only append new selections
    if (selectedContainer) {
      const currentOrder = Array.from(
        selectedContainer.querySelectorAll(".selected-exercise-item"),
      ).map((item) => item.dataset.exerciseName);

      const selectedSet = new Set(selectedNames);
      const preservedOrder = currentOrder.filter((name) =>
        selectedSet.has(name),
      );

      const newSelections = selectedNames.filter(
        (name) => !currentOrder.includes(name),
      );

      const orderedNames = [...preservedOrder, ...newSelections];

      const exercises = orderedNames
        .map((name) => {
          return this.exerciseLibrary.find((e) => e.name === name);
        })
        .filter((e) => e); // Remove any not found

      this.renderSelectedExercisesForEdit(exercises);
      return;
    }

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
      `;
      const nameSpan = document.createElement("span");
      nameSpan.className = "selected-exercise-name";
      nameSpan.textContent = exercise.name;
      const muscleSpan = document.createElement("span");
      muscleSpan.className = "selected-exercise-muscle";
      muscleSpan.textContent = exercise.muscle_group || "";
      item.appendChild(nameSpan);
      item.appendChild(muscleSpan);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "selected-exercise-remove";
      removeBtn.setAttribute("aria-label", `Remove ${exercise.name}`);
      removeBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />
        </svg>
      `;

      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const checkbox = document.getElementById(
          `edit-select-${exercise.name}`,
        );
        if (checkbox) {
          checkbox.checked = false;
        }
        this.updateEditSelectedExercises();
      });

      removeBtn.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });

      item.appendChild(removeBtn);

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
        ".selected-exercise-item",
      );
      const exerciseNames = Array.from(selectedItems).map(
        (item) => item.dataset.exerciseName,
      );
      exercises = exerciseNames
        .map((name) => this.exerciseLibrary.find((e) => e.name === name))
        .filter(Boolean)
        .map((exercise) => ({ ...exercise }));
    } else {
      // Fallback to checkboxes
      const selectedCheckboxes = document.querySelectorAll(
        '#editExerciseSelector input[type="checkbox"]:checked',
      );
      const exerciseNames = Array.from(selectedCheckboxes).map(
        (cb) => cb.value,
      );
      exercises = exerciseNames
        .map((name) => this.exerciseLibrary.find((e) => e.name === name))
        .filter(Boolean)
        .map((exercise) => ({ ...exercise }));
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

    const updatedWorkout = this.workouts[workoutIndex];

    if (this.currentWorkout && this.currentWorkout.id === workoutId) {
      this.currentWorkout = updatedWorkout;
      this.setCurrentSessionForWorkout(updatedWorkout);

      const workoutNameElement = document.getElementById("currentWorkoutName");
      if (workoutNameElement) {
        workoutNameElement.textContent = updatedWorkout.name;
        workoutNameElement.dataset.workoutId = updatedWorkout.id;
      }

      const notesDisplay = document.getElementById("workoutNotesDisplay");
      const notesContent = document.getElementById("workoutNotesContent");

      if (updatedWorkout.notes) {
        notesContent.textContent = updatedWorkout.notes;
        notesDisplay.style.display = "block";
      } else if (notesDisplay) {
        notesDisplay.style.display = "none";
      }

      if (
        this.currentExercise &&
        !updatedWorkout.exercises.some(
          (exercise) => exercise.name === this.currentExercise.name,
        )
      ) {
        this.currentExercise = null;
      }

      this.renderExerciseList();
      this.updateSessionChecklist(updatedWorkout);
      this.renderWorkoutInsights(updatedWorkout);
    }

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

      const exportBtn = document.createElement("button");
      exportBtn.className = "btn-secondary btn-sm";
      exportBtn.type = "button"; // Prevent form submission/navigation
      exportBtn.textContent = "Export";
      exportBtn.addEventListener("click", () => {
        this.exportWorkout(workout.id);
      });

      const editBtn = document.createElement("button");
      editBtn.className = "btn-secondary btn-sm";
      editBtn.type = "button"; // Prevent form submission/navigation
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => this.editWorkout(workout.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.type = "button"; // Prevent form submission/navigation
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => this.deleteWorkout(workout.id));

      actions.appendChild(exportBtn);
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
  // Coach Performance Summary
  // ============================================

  updateCoachSummaryOutput(showToast = false) {
    const output = document.getElementById("coachSummaryOutput");
    if (!output) return;

    output.value = this.buildCoachPerformanceSummary();
    output.scrollTop = 0;
    this.renderCoachPerformanceCharts();

    if (showToast) {
      this.showSuccessMessage("Coach summary refreshed");
    }
  }

  copyCoachSummary() {
    const output = document.getElementById("coachSummaryOutput");
    const summary = output?.value || this.buildCoachPerformanceSummary();

    if (!summary) return;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(summary)
        .then(() => {
          this.showSuccessMessage("Coach summary copied");
        })
        .catch(() => {
          if (output) {
            output.select();
            document.execCommand("copy");
            this.showSuccessMessage("Coach summary copied");
          }
        });
      return;
    }

    if (output) {
      output.select();
      document.execCommand("copy");
      this.showSuccessMessage("Coach summary copied");
    }
  }

  downloadCoachSummary() {
    const summary = this.buildCoachPerformanceSummary();
    const blob = new Blob([summary], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coach-performance-summary-${this.getLocalDateKey()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showSuccessMessage("Coach summary downloaded");
  }

  buildCoachPerformanceSummary() {
    const athleteName = localStorage.getItem("userName")?.trim() || "Athlete";
    const sessions = [...this.sessions];
    const history = [...this.workoutHistory];
    const totalSets = sessions.reduce(
      (sum, session) => sum + (session.sets?.length || 0),
      0,
    );
    const totalVolume = sessions.reduce(
      (sum, session) => sum + this.calculateVolume(session.sets || []),
      0,
    );
    const distinctExercises = new Set(
      sessions.map((session) => session.exerciseName),
    ).size;

    const recentWindowDays = 30;
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - recentWindowDays);

    const recentSessions = sessions.filter(
      (session) => new Date(session.date) >= recentCutoff,
    );
    const recentWorkouts = history.filter(
      (entry) => new Date(entry.date) >= recentCutoff,
    );

    const recentSets = recentSessions.reduce(
      (sum, session) => sum + (session.sets?.length || 0),
      0,
    );
    const recentVolume = recentSessions.reduce(
      (sum, session) => sum + this.calculateVolume(session.sets || []),
      0,
    );

    const recentWorkoutCount =
      recentWorkouts.length ||
      this.countUniqueWorkoutsFromSessions(recentSessions);
    const workoutsLogged = history.length || this.estimateWorkoutsLogged();
    const averageWorkoutsPerWeek =
      recentWorkoutCount === 0
        ? "0.0"
        : (recentWorkoutCount / (recentWindowDays / 7)).toFixed(1);

    const streaks = this.getStreaksFromDates(this.getActivityDateKeys());
    const prCounts = this.getPrCounts(sessions, recentSessions);

    const firstLog = this.getBoundaryDate(
      [...history.map((h) => h.date), ...sessions.map((s) => s.date)],
      "min",
    );
    const latestLog = this.getBoundaryDate(
      [...history.map((h) => h.date), ...sessions.map((s) => s.date)],
      "max",
    );

    const muscleFocus = this.describeTopCounts(
      recentSessions.map((session) => session.muscleGroup),
    );
    const exerciseFocus = this.describeTopCounts(
      recentSessions.map((session) => session.exerciseName),
    );
    const templateFocus = this.describeTopCounts(
      history.length
        ? history.map((entry) => entry.workoutName)
        : sessions.map((session) => session.workoutName || "Unlabeled workout"),
      3,
      "Not enough workouts logged yet",
    );

    const averageSetsPerWorkout = this.calculateAverageSetsPerWorkout();
    const lastWorkoutLine = this.describeLatestWorkout();
    const frequencySummary = this.buildTrainingFrequencySection();
    const exerciseCount7 = this.buildExerciseCountSection(7);
    const exerciseCount28 = this.buildExerciseCountSection(28);
    const intensitySection = this.buildIntensitySection();
    const densitySection = this.buildDensitySection();
    const progressSection = this.buildProgressQualitySection();
    const coreSection = this.buildCoreTrainingSection();
    const recencySection = this.buildRecencyInsightsSection();

    return (
      `# Coach Performance Summary\n\n` +
      `**Athlete:** ${athleteName}\n` +
      `**Last updated:** ${this.formatDate(new Date())}\n\n` +
      `## Lifetime Snapshot\n` +
      `- Workouts logged: ${workoutsLogged}\n` +
      `- Exercise sessions logged: ${sessions.length}\n` +
      `- Sets captured: ${totalSets}\n` +
      `- Training volume moved: ${this.formatNumber(totalVolume)} kg-reps\n` +
      `- Distinct exercises trained: ${distinctExercises}\n` +
      `- First log: ${firstLog || "—"} | Most recent: ${latestLog || "—"}\n` +
      `- Consistency: current streak ${streaks.current} day${
        streaks.current === 1 ? "" : "s"
      } · best streak ${streaks.best} day${streaks.best === 1 ? "" : "s"}\n\n` +
      `## Recent Focus (last ${recentWindowDays} days)\n` +
      `- Workouts completed: ${recentWorkoutCount} (~${averageWorkoutsPerWeek}/wk)\n` +
      `- Sets logged: ${recentSets} | Volume: ${this.formatNumber(
        recentVolume,
      )} kg-reps\n` +
      `- Most-used muscle groups: ${muscleFocus}\n` +
      `- Frequently trained exercises: ${exerciseFocus}\n` +
      `- PR highlights: ${prCounts.recentWeight} weight · ${
        prCounts.recentVolume
      } volume in the window\n` +
      `- Latest activity: ${lastWorkoutLine}\n\n` +
      `## Exercises count (7 days)\n${exerciseCount7}\n` +
      `\n## Exercises count (28 days)\n${exerciseCount28}\n` +
      `## Workout Patterns\n` +
      `- Favorite templates: ${templateFocus}\n` +
      `- Typical sets per workout: ${averageSetsPerWorkout}\n` +
      `- Total PRs to date: ${prCounts.weight} weight | ${
        prCounts.volume
      } volume\n\n` +
      `## Training Frequency & Consistency\n${frequencySummary}\n` +
      `\n## Intensity & Effort\n${intensitySection}\n` +
      `\n## Session Density & Recoverability\n${densitySection}\n` +
      `\n## Progress Quality\n${progressSection}\n` +
      `\n## Core Training Classification\n${coreSection}\n` +
      `\n## Recency-Weighted Insights\n${recencySection}\n`
    );
  }

  buildTrainingFrequencySection() {
    const freq7 = this.getTrainingFrequencyMetrics(7);
    const freq14 = this.getTrainingFrequencyMetrics(14);
    const freq28 = this.getTrainingFrequencyMetrics(28);

    const consistencyBand = this.getConsistencyBand(
      freq7.sessionsPerWeek,
      freq28.sessionsPerWeek,
    );

    return [
      `- Sessions per week (rolling): ${freq7.sessionsPerWeek} (7d) · ${freq14.sessionsPerWeek} (14d) · ${freq28.sessionsPerWeek} (28d)`,
      `- Upper vs lower (7d): ${freq7.upperPerWeek} upper · ${freq7.lowerPerWeek} lower · ${freq7.mixedPerWeek} mixed`,
      `- Upper vs lower (28d): ${freq28.upperPerWeek} upper · ${freq28.lowerPerWeek} lower · ${freq28.mixedPerWeek} mixed`,
      `- Consistency band: ${consistencyBand}`,
    ].join("\n");
  }

  getTrainingFrequencyMetrics(windowDays) {
    const sessionsInWindow = this.getSessionsWithinDays(windowDays);
    const workouts = this.groupSessionsByWorkout(sessionsInWindow);
    const weeks = Math.max(1, windowDays / 7);

    const sessionPerWeek = (workouts.length / weeks).toFixed(1);
    const focusCounts = workouts.reduce(
      (acc, workout) => {
        if (workout.focus === "upper") acc.upper += 1;
        else if (workout.focus === "lower") acc.lower += 1;
        else acc.mixed += 1;
        return acc;
      },
      { upper: 0, lower: 0, mixed: 0 },
    );

    return {
      sessionsPerWeek: sessionPerWeek,
      upperPerWeek: (focusCounts.upper / weeks).toFixed(1),
      lowerPerWeek: (focusCounts.lower / weeks).toFixed(1),
      mixedPerWeek: (focusCounts.mixed / weeks).toFixed(1),
    };
  }

  getConsistencyBand(current, baseline) {
    if (!baseline || baseline === "0.0") return "Not enough data";
    const currentNum = parseFloat(current);
    const baselineNum = parseFloat(baseline);
    if (currentNum >= baselineNum * 0.9) return "High (tracking to baseline)";
    if (currentNum >= baselineNum * 0.6)
      return "Moderate (slightly under baseline)";
    return "Low (below typical cadence)";
  }

  buildMuscleExposureSection(windowDays, includeWindowLabel = false) {
    const sessionsInWindow = this.getSessionsWithinDays(windowDays);
    if (!sessionsInWindow.length) return "- No sessions logged in this window";

    const exposure = this.getMuscleExposureBreakdown(sessionsInWindow);
    const totalVolume = exposure.reduce((sum, item) => sum + item.volume, 0);

    const rows = exposure
      .sort((a, b) => b.sets - a.sets)
      .map((item) => {
        const pct =
          totalVolume > 0 ? Math.round((item.volume / totalVolume) * 100) : 0;
        return `- ${item.muscle}: ${item.sets} sets (${pct}% volume) across ${item.sessions} sessions — ${item.status}`;
      });

    if (includeWindowLabel) {
      rows.unshift(`Window: last ${windowDays} days`);
    }

    return rows.join("\n");
  }

  buildExerciseCountSection(windowDays) {
    const sessionsInWindow = this.getSessionsWithinDays(windowDays);
    if (!sessionsInWindow.length) return "- No sessions logged in this window";

    const totals = new Map();

    sessionsInWindow.forEach((session) => {
      const name = session.exerciseName || "Unspecified exercise";
      const sets = session.sets || [];
      const reps = sets.reduce((sum, set) => sum + (set.reps || 0), 0);
      const volume = this.calculateVolume(sets);
      const current = totals.get(name) || { reps: 0, volume: 0 };
      totals.set(name, {
        reps: current.reps + reps,
        volume: current.volume + volume,
      });
    });

    return Array.from(totals.entries())
      .sort((a, b) => {
        if (b[1].reps !== a[1].reps) return b[1].reps - a[1].reps;
        return b[1].volume - a[1].volume;
      })
      .map(
        ([name, stats]) =>
          `- ${name}: ${stats.reps} reps | ${this.formatNumber(stats.volume)} kg`,
      )
      .join("\n");
  }

  getMuscleExposureBreakdown(sessionList) {
    const thresholds = { under: 6, productive: 12, high: 20 };
    const exposureMap = new Map();

    sessionList.forEach((session) => {
      const muscle = session.muscleGroup || "Unspecified";
      const sets = session.sets?.length || 0;
      const volume = this.calculateVolume(session.sets || []);
      const current = exposureMap.get(muscle) || {
        sets: 0,
        volume: 0,
        sessions: 0,
      };
      exposureMap.set(muscle, {
        sets: current.sets + sets,
        volume: current.volume + volume,
        sessions: current.sessions + 1,
      });
    });

    return Array.from(exposureMap.entries()).map(([muscle, stats]) => ({
      muscle,
      ...stats,
      status: this.classifyExposureStatus(stats.sets, thresholds),
    }));
  }

  classifyExposureStatus(sets, thresholds) {
    if (sets === 0) return "No exposure";
    if (sets < thresholds.under) return "Underexposed";
    if (sets < thresholds.productive) return "Productive";
    if (sets < thresholds.high) return "High";
    return "Excessive";
  }

  buildIntensitySection() {
    const summary7 = this.getEffortDistribution(7);
    const summary28 = this.getEffortDistribution(28);

    return [
      `- Effort per workout uses inferred banding from rep drop-off and load; RPE not logged.`,
      `- Distribution (7d): ${summary7}`,
      `- Distribution (28d): ${summary28}`,
    ].join("\n");
  }

  getEffortDistribution(windowDays) {
    const sessionsInWindow = this.getSessionsWithinDays(windowDays);
    const workouts = this.groupSessionsByWorkout(sessionsInWindow);
    if (!workouts.length) return "no data";

    const counts = { Easy: 0, Moderate: 0, Hard: 0, "Very Hard": 0 };

    workouts.forEach((workout) => {
      const band = this.getWorkoutEffortBand(workout);
      counts[band] += 1;
    });

    const total = workouts.length;
    return Object.entries(counts)
      .map(([band, count]) => `${band} ${Math.round((count / total) * 100)}%`)
      .join(" · ");
  }

  getWorkoutEffortBand(workout) {
    if (!workout.sets) return "Easy";
    const allSets = workout.sets;
    if (!allSets.length) return "Easy";

    const reps = allSets.map((set) => set.reps || 0).filter((r) => r > 0);
    const weights = allSets.map((set) => set.weight_kg || 0);
    const volume = workout.volume || 0;
    const avgLoad = reps.length
      ? volume / reps.reduce((sum, r) => sum + r, 0)
      : 0;
    const maxReps = reps.length ? Math.max(...reps) : 0;
    const minReps = reps.length ? Math.min(...reps) : 0;
    const repDrop = maxReps - minReps;
    const maxWeight = weights.length ? Math.max(...weights) : 0;

    if (repDrop >= 4 || avgLoad >= 90 || maxWeight >= 120) return "Very Hard";
    if (repDrop >= 3 || avgLoad >= 65 || maxWeight >= 90) return "Hard";
    if (repDrop >= 1 || avgLoad >= 40 || maxWeight >= 60) return "Moderate";
    return "Easy";
  }

  buildDensitySection() {
    const last7 = this.getSessionDensityMetrics(7);
    const prior7 = this.getSessionDensityMetrics(7, 7);

    const trend = this.describeDensityTrend(
      last7.setsPerHour,
      prior7.setsPerHour,
    );

    return [
      `- Avg session duration (estimated): ${last7.avgDuration} min`,
      `- Sets per hour: ${last7.setsPerHour} | Volume per minute: ${last7.volumePerMinute} kg`,
      `- Density trend vs prior week: ${trend}`,
    ].join("\n");
  }

  getSessionDensityMetrics(windowDays, offsetDays = 0) {
    const end = new Date();
    end.setDate(end.getDate() - offsetDays);
    const start = new Date();
    start.setDate(start.getDate() - windowDays - offsetDays);

    const sessionsInWindow = this.sessions.filter((session) => {
      if (!session.date) return false;
      const sessionDate = new Date(session.date);
      return sessionDate >= start && sessionDate < end;
    });

    const workouts = this.groupSessionsByWorkout(sessionsInWindow);
    if (!workouts.length) {
      return { avgDuration: "—", setsPerHour: "0.0", volumePerMinute: "0.0" };
    }

    const totals = workouts.reduce(
      (acc, workout) => {
        const estimatedDuration = Math.max(20, workout.setCount * 3);
        acc.duration += estimatedDuration;
        acc.sets += workout.setCount;
        acc.volume += workout.volume;
        return acc;
      },
      { duration: 0, sets: 0, volume: 0 },
    );

    const avgDuration = Math.round(totals.duration / workouts.length);
    const setsPerHour = (
      (totals.sets / Math.max(1, totals.duration)) *
      60
    ).toFixed(1);
    const volumePerMinute = (
      totals.volume / Math.max(1, totals.duration)
    ).toFixed(1);

    return { avgDuration, setsPerHour, volumePerMinute };
  }

  describeDensityTrend(current, prior) {
    const currentNum = parseFloat(current || "0");
    const priorNum = parseFloat(prior || "0");
    if (!priorNum) return "Not enough data";
    if (currentNum > priorNum * 1.05) return "↑ denser than last week";
    if (currentNum < priorNum * 0.95) return "↓ lighter density";
    return "→ steady";
  }

  buildLowerBodySection() {
    const last7 = this.getTrainingFrequencyMetrics(7);
    const ratio = this.getUpperLowerVolumeRatio(28);

    const warning =
      parseFloat(last7.lowerPerWeek) <= 1
        ? "⚠ Legs trained once or less in the last 7 days"
        : "Lower-body frequency on track";

    return [
      `- Lower-body frequency flag: ${warning}`,
      `- Upper vs lower volume ratio (28d): ${ratio.ratio} — ${ratio.label}`,
    ].join("\n");
  }

  getUpperLowerVolumeRatio(windowDays) {
    const sessionsInWindow = this.getSessionsWithinDays(windowDays);
    let upperVolume = 0;
    let lowerVolume = 0;

    sessionsInWindow.forEach((session) => {
      const volume = this.calculateVolume(session.sets || []);
      const bucket = this.classifyMuscleGroup(session.muscleGroup);
      if (bucket === "upper") upperVolume += volume;
      else if (bucket === "lower") lowerVolume += volume;
    });

    const ratioValue =
      upperVolume === 0 && lowerVolume === 0
        ? 1
        : lowerVolume / Math.max(upperVolume, 1);

    let label = "Balanced";
    if (ratioValue < 0.65) label = "Upper-dominant";
    else if (ratioValue > 1.35) label = "Lower-dominant";

    return { ratio: ratioValue.toFixed(2), label };
  }

  buildProgressQualitySection() {
    const insights = this.getProgressQualityInsights(28);
    if (!insights.length)
      return "- Not enough repeated sessions to judge progress";
    return insights.map((line) => `- ${line}`).join("\n");
  }

  getProgressQualityInsights(windowDays) {
    const sessionsInWindow = this.getSessionsWithinDays(windowDays);
    const byExercise = new Map();

    sessionsInWindow.forEach((session) => {
      const key = session.exerciseName || "Exercise";
      const list = byExercise.get(key) || [];
      list.push(session);
      byExercise.set(key, list);
    });

    const insights = [];

    byExercise.forEach((list, exercise) => {
      if (list.length < 2) return;
      const sorted = list.sort((a, b) => new Date(a.date) - new Date(b.date));
      const latest = sorted[sorted.length - 1];
      const previous = sorted[sorted.length - 2];

      const latestVolume = this.calculateVolume(latest.sets || []);
      const previousVolume = this.calculateVolume(previous.sets || []);
      const volumeChange = previousVolume
        ? (latestVolume - previousVolume) / previousVolume
        : 0;

      const latestAvgReps = this.getAverageReps(latest.sets || []);
      const previousAvgReps = this.getAverageReps(previous.sets || []);
      const repChange = latestAvgReps - previousAvgReps;

      if (Math.abs(volumeChange) < 0.05) {
        insights.push(
          `${exercise}: loads stable (repeat performance) over last two sessions`,
        );
      } else if (volumeChange > 0.1) {
        insights.push(
          `${exercise}: volume trending up ${Math.round(volumeChange * 100)}% over last outing`,
        );
      }

      if (repChange > 1) {
        insights.push(`${exercise}: reps before failure increasing (inferred)`);
      }
    });

    return insights.slice(0, 6);
  }

  getAverageReps(sets) {
    if (!sets?.length) return 0;
    const totalReps = sets.reduce((sum, set) => sum + (set.reps || 0), 0);
    return totalReps / sets.length;
  }

  buildCoreTrainingSection() {
    const summary7 = this.getCoreExposureSummary(7);
    const summary28 = this.getCoreExposureSummary(28);

    const redundancyFlag =
      summary7.dominantShare > 0.5
        ? `⚠ ${summary7.dominantFunction} dominates (~${Math.round(summary7.dominantShare * 100)}%)`
        : "Balanced mix across functions";

    const describe = (summary, label) =>
      `${label}: ${summary.lines.length ? summary.lines.join(" · ") : "No core work logged"}`;

    return [
      describe(summary7, "7d"),
      describe(summary28, "28d"),
      `Redundancy check: ${redundancyFlag}`,
    ].join("\n");
  }

  getCoreExposureSummary(windowDays) {
    const sessionsInWindow = this.getSessionsWithinDays(windowDays);
    const buckets = new Map();

    sessionsInWindow.forEach((session) => {
      const fn = this.classifyCoreFunction(session.exerciseName || "");
      if (!fn) return;
      const sets = session.sets?.length || 0;
      buckets.set(fn, (buckets.get(fn) || 0) + sets);
    });

    const total = Array.from(buckets.values()).reduce((sum, v) => sum + v, 0);
    const lines = Array.from(buckets.entries()).map(([fn, sets]) => {
      const pct = total ? Math.round((sets / total) * 100) : 0;
      return `${fn}: ${sets} sets (${pct}%)`;
    });

    const dominant = lines.length
      ? lines
          .map((line) => {
            const [fn, rest] = line.split(": ");
            const pctMatch = rest.match(/(\d+)%/);
            const pct = pctMatch ? parseInt(pctMatch[1], 10) / 100 : 0;
            return { fn, pct };
          })
          .sort((a, b) => b.pct - a.pct)[0]
      : { fn: "", pct: 0 };

    return {
      lines,
      dominantFunction: dominant.fn,
      dominantShare: dominant.pct,
    };
  }

  classifyCoreFunction(exerciseName) {
    const name = exerciseName.toLowerCase();
    if (name.includes("pallof") || name.includes("anti-rotation"))
      return "Anti-rotation";
    if (
      name.includes("plank") ||
      name.includes("rollout") ||
      name.includes("dead bug")
    )
      return "Anti-extension";
    if (name.includes("carry") || name.includes("farmers"))
      return "Anti-extension";
    if (
      name.includes("side bend") ||
      name.includes("side plank") ||
      name.includes("windmill")
    )
      return "Lateral flexion";
    if (
      name.includes("crunch") ||
      name.includes("sit-up") ||
      name.includes("leg raise") ||
      name.includes("toes to bar")
    )
      return "Flexion/hip flexion";
    return "";
  }

  buildRecencyInsightsSection() {
    const sessions = this.getSessionsWithinDays(10);
    if (!sessions.length) return "- No activity in the last 10 days";

    const muscleExposure = this.getMuscleExposureBreakdown(sessions)
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 3)
      .map((item) => `${item.muscle} (${item.sets} sets)`)
      .join(", ");

    const effort = this.getEffortDistribution(10);

    const gaps = this.getMuscleExposureBreakdown(sessions)
      .filter((item) => item.status === "Underexposed")
      .map((item) => item.muscle)
      .slice(0, 2)
      .join(", ");

    return [
      `- Recent microcycle (10d): focus on ${muscleExposure || "n/a"}`,
      `- Intensity mix: ${effort}`,
      `- Gaps/overloads: ${gaps || "none flagged"}`,
    ].join("\n");
  }

  buildTransparencySection() {
    const completeness = this.getDataCompleteness(28);
    const underReporting = completeness.flag;

    return [
      `- Data completeness: ${completeness.score}% (${completeness.confidence} confidence)`,
      `- Under-reporting watch: ${underReporting}`,
    ].join("\n");
  }

  getDataCompleteness(windowDays) {
    const sessionsInWindow = this.getSessionsWithinDays(windowDays);
    const workouts = this.groupSessionsByWorkout(sessionsInWindow);
    const uniqueDays = new Set(
      workouts.map((workout) => this.getLocalDateKey(workout.date)),
    );
    const expectedPerWeek = 4;
    const expectedTotal = expectedPerWeek * (windowDays / 7);
    const score = Math.min(
      100,
      Math.round((uniqueDays.size / expectedTotal) * 100),
    );

    let confidence = "Low";
    if (score >= 75) confidence = "High";
    else if (score >= 40) confidence = "Medium";

    const weekly28 = this.getTrainingFrequencyMetrics(28);
    const weekly7 = this.getTrainingFrequencyMetrics(7);
    const flag =
      parseFloat(weekly7.sessionsPerWeek) <
      parseFloat(weekly28.sessionsPerWeek) * 0.5
        ? "⚠ Recent logging well below baseline"
        : "No obvious under-reporting";

    return { score, confidence, flag };
  }

  groupSessionsByWorkout(sessionList) {
    const grouped = new Map();
    sessionList.forEach((session) => {
      if (!session.date) return;
      const key = `${this.getLocalDateKey(new Date(session.date))}-${
        session.workoutId || session.workoutName || "workout"
      }`;
      const entry = grouped.get(key) || {
        id: key,
        date: new Date(session.date),
        workoutName: session.workoutName || "Unlabeled workout",
        setCount: 0,
        volume: 0,
        focusCounts: { upper: 0, lower: 0, core: 0, other: 0 },
        sets: [],
        sessions: [],
      };

      const muscleBucket = this.classifyMuscleGroup(session.muscleGroup);
      entry.focusCounts[muscleBucket] =
        (entry.focusCounts[muscleBucket] || 0) + 1;
      entry.setCount += session.sets?.length || 0;
      entry.volume += this.calculateVolume(session.sets || []);
      entry.sets.push(...(session.sets || []));
      entry.sessions.push(session);

      grouped.set(key, entry);
    });

    return Array.from(grouped.values()).map((entry) => ({
      ...entry,
      focus: this.getWorkoutFocus(entry.focusCounts),
    }));
  }

  classifyMuscleGroup(muscle) {
    const name = (muscle || "").toLowerCase();
    const lowerGroups = [
      "quads",
      "hamstrings",
      "glutes",
      "calves",
      "legs",
      "lower back",
      "adductors",
      "abductors",
      "hips",
    ];
    const upperGroups = [
      "back",
      "chest",
      "shoulders",
      "traps",
      "trapezius",
      "triceps",
      "biceps",
      "forearms",
      "upper",
    ];
    const coreGroups = ["core", "abs", "obliques"];

    if (lowerGroups.some((group) => name.includes(group))) return "lower";
    if (upperGroups.some((group) => name.includes(group))) return "upper";
    if (coreGroups.some((group) => name.includes(group))) return "core";
    return "other";
  }

  getWorkoutFocus(counts) {
    const { upper = 0, lower = 0, core = 0, other = 0 } = counts || {};
    if (upper > lower && upper >= core && upper >= other) return "upper";
    if (lower > upper && lower >= core && lower >= other) return "lower";
    if (core > upper && core > lower) return "core";
    return "mixed";
  }

  getSessionsWithinDays(windowDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);
    return this.sessions.filter((session) => {
      if (!session.date) return false;
      const sessionDate = new Date(session.date);
      return sessionDate >= cutoff;
    });
  }

  getActivityDateKeys() {
    const keys = new Set();

    this.workoutHistory.forEach((entry) => {
      if (entry.date) {
        keys.add(this.getLocalDateKey(new Date(entry.date)));
      }
    });

    this.sessions.forEach((session) => {
      if (session.date) {
        keys.add(this.getLocalDateKey(new Date(session.date)));
      }
    });

    return keys;
  }

  getStreaksFromDates(dateKeys) {
    if (!dateKeys || dateKeys.size === 0) {
      return { current: 0, best: 0 };
    }

    const sorted = Array.from(dateKeys)
      .map((key) => new Date(key))
      .sort((a, b) => a.getTime() - b.getTime());

    let best = 1;
    let currentRun = 1;

    for (let i = 1; i < sorted.length; i++) {
      const diffDays =
        (sorted[i].getTime() - sorted[i - 1].getTime()) / 86400000;
      if (Math.round(diffDays) === 1) {
        currentRun += 1;
        best = Math.max(best, currentRun);
      } else {
        currentRun = 1;
      }
    }

    let current = 0;
    const today = new Date();
    while (dateKeys.has(this.getLocalDateKey(today))) {
      current += 1;
      today.setDate(today.getDate() - 1);
    }

    return { current, best };
  }

  getBoundaryDate(dateStrings, direction = "min") {
    const validDates = dateStrings
      .map((d) => (d ? new Date(d) : null))
      .filter((d) => d && !isNaN(d));

    if (validDates.length === 0) return null;

    const target = validDates.reduce((acc, current) => {
      if (direction === "min") {
        return current < acc ? current : acc;
      }
      return current > acc ? current : acc;
    });

    return this.formatDate(target);
  }

  describeTopCounts(items, limit = 3, fallback = "No data yet") {
    const counts = new Map();

    items
      .filter(Boolean)
      .forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));

    if (counts.size === 0) return fallback;

    const sorted = Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );

    return sorted
      .slice(0, limit)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ");
  }

  estimateWorkoutsLogged() {
    if (!this.sessions.length) return 0;

    const uniqueDays = new Set(
      this.sessions.map(
        (session) =>
          `${this.getLocalDateKey(new Date(session.date))}-${
            session.workoutId || session.workoutName || "workout"
          }`,
      ),
    );

    return uniqueDays.size;
  }

  countUniqueWorkoutsFromSessions(sessionList) {
    if (!sessionList?.length) return 0;

    const uniqueDays = new Set(
      sessionList.map(
        (session) =>
          `${this.getLocalDateKey(new Date(session.date))}-${
            session.workoutId || session.workoutName || "workout"
          }`,
      ),
    );

    return uniqueDays.size;
  }

  calculateAverageSetsPerWorkout() {
    if (this.workoutHistory.length) {
      const totals = this.workoutHistory.reduce(
        (sum, entry) => sum + (entry.totalSets || 0),
        0,
      );
      return `${(totals / Math.max(1, this.workoutHistory.length)).toFixed(
        1,
      )} sets`;
    }

    if (!this.sessions.length) return "—";

    const grouped = new Map();

    this.sessions.forEach((session) => {
      const key = `${this.getLocalDateKey(new Date(session.date))}-${
        session.workoutId || session.workoutName || "workout"
      }`;
      const current = grouped.get(key) || 0;
      grouped.set(key, current + (session.sets?.length || 0));
    });

    const average =
      Array.from(grouped.values()).reduce((sum, sets) => sum + sets, 0) /
      Math.max(1, grouped.size);

    return `${average.toFixed(1)} sets`;
  }

  getPrCounts(allSessions, recentSessions) {
    const lifetime = { weight: 0, volume: 0 };
    const recent = { weight: 0, volume: 0 };

    allSessions.forEach((session) => {
      if (session.pr?.weight) lifetime.weight += 1;
      if (session.pr?.volume) lifetime.volume += 1;
    });

    recentSessions.forEach((session) => {
      if (session.pr?.weight) recent.weight += 1;
      if (session.pr?.volume) recent.volume += 1;
    });

    return {
      weight: lifetime.weight,
      volume: lifetime.volume,
      recentWeight: recent.weight,
      recentVolume: recent.volume,
    };
  }

  buildExerciseHighlights() {
    if (!this.sessions.length) return "- No exercise data logged yet\n";

    const stats = new Map();

    this.sessions.forEach((session) => {
      const key = session.exerciseName || "Exercise";
      const entry = stats.get(key) || {
        count: 0,
        totalVolume: 0,
        heaviest: 0,
        lastDate: null,
      };

      entry.count += 1;
      entry.totalVolume += this.calculateVolume(session.sets || []);

      const sessionHeaviest = Math.max(
        0,
        ...(session.sets || []).map((set) => set.weight_kg || 0),
      );
      entry.heaviest = Math.max(entry.heaviest, sessionHeaviest);

      const sessionDate = session.date ? new Date(session.date) : null;
      if (sessionDate && (!entry.lastDate || sessionDate > entry.lastDate)) {
        entry.lastDate = sessionDate;
      }

      stats.set(key, entry);
    });

    const sorted = Array.from(stats.entries()).sort(
      (a, b) => b[1].heaviest - a[1].heaviest || b[1].count - a[1].count,
    );

    return (
      sorted
        .slice(0, 5)
        .map(([name, data]) => {
          const averageVolume = data.totalVolume / Math.max(1, data.count);
          return `- ${name}: last on ${
            data.lastDate ? this.formatDate(data.lastDate) : "—"
          }, heaviest set ${data.heaviest ? `${data.heaviest} kg` : "—"}, avg volume ${this.formatNumber(
            averageVolume,
          )} kg-reps/session`;
        })
        .join("\n") + "\n"
    );
  }

  describeLatestWorkout() {
    if (this.workoutHistory.length > 0) {
      const latest = this.workoutHistory[0];
      return `${latest.workoutName || "Workout"} on ${this.formatDate(
        new Date(latest.date),
      )}`;
    }

    if (this.sessions.length > 0) {
      const latest = this.sessions
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return `${latest.workoutName || latest.exerciseName || "Workout"} on ${this.formatDate(
        new Date(latest.date),
      )}`;
    }

    return "No workouts logged yet";
  }

  formatNumber(value) {
    if (typeof value !== "number" || isNaN(value)) return "0.0";
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
  }

  // ============================================
  // Helper Functions
  // ============================================

  exportData() {
    const exportData = {
      version: "2.0",
      exportType: "full",
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
      `Data exported! ${this.sessions.length} sessions, ${this.workouts.length} workouts, ${this.exerciseLibrary.length} exercises`,
    );
  }

  exportSelectedWorkoutSession() {
    if (!this.workoutHistory.length) {
      alert("No workout sessions to export yet");
      return;
    }

    const selectedEntry =
      this.workoutHistory.find(
        (entry) => entry.id === this.selectedHistoryId,
      ) || this.workoutHistory[0];

    if (!selectedEntry) {
      alert("Select a workout from history to export");
      return;
    }

    const sessionDateKey = this.getLocalDateKey(new Date(selectedEntry.date));
    const sessionsForDay = this.sessions.filter(
      (session) =>
        session.workoutId === selectedEntry.workoutId &&
        this.getLocalDateKey(new Date(session.date)) === sessionDateKey,
    );

    const matchingWorkout = this.workouts.find(
      (workout) => workout.id === selectedEntry.workoutId,
    );

    const exportPayload = {
      version: "2.1",
      exportType: "workout-session",
      exportDate: new Date().toISOString(),
      workoutSummary: selectedEntry,
      sessions: sessionsForDay,
      ...(matchingWorkout ? { workout: matchingWorkout } : {}),
    };

    const dataStr = JSON.stringify(exportPayload, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;

    const sanitizedName = selectedEntry.workoutName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    link.download = `workout-session-${
      sanitizedName || "export"
    }-${sessionDateKey}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showSuccessMessage(
      `Session for "${selectedEntry.workoutName}" exported with ${sessionsForDay.length} exercise logs.`,
    );
  }

  exportSelectedWorkoutSessionMarkdown() {
    if (!this.workoutHistory.length) {
      alert("No workout sessions to export yet");
      return;
    }

    const selectedEntry =
      this.workoutHistory.find(
        (entry) => entry.id === this.selectedHistoryId,
      ) || this.workoutHistory[0];

    if (!selectedEntry) {
      alert("Select a workout from history to export");
      return;
    }

    const sessionDateKey = this.getLocalDateKey(new Date(selectedEntry.date));
    const sessionsForDay = this.sessions.filter(
      (session) =>
        session.workoutId === selectedEntry.workoutId &&
        this.getLocalDateKey(new Date(session.date)) === sessionDateKey,
    );

    const dateStr = this.formatDate(new Date(selectedEntry.date));
    const exercises = selectedEntry.exercises || [];

    let md = `# ${selectedEntry.workoutName}\n`;
    md += `**Date:** ${dateStr}\n\n`;

    // Summary stats
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Exercises | ${exercises.length} |\n`;
    md += `| Total Sets | ${selectedEntry.totalSets || 0} |\n`;
    md += `| Total Reps | ${selectedEntry.totalReps || 0} |\n`;
    md += `| Total Volume | ${(selectedEntry.totalVolume || 0).toFixed(1)} kg-reps |\n`;
    md += `| Completion | ${selectedEntry.completionPct || 0}% |\n\n`;

    // Per-exercise breakdown
    md += `## Exercises\n\n`;

    exercises.forEach((exercise) => {
      md += `### ${exercise.name}\n`;
      md += `*${exercise.muscleGroup || "—"}*\n\n`;
      md += `- **Sets:** ${exercise.sets}\n`;
      md += `- **Reps:** ${exercise.reps}\n`;
      if (exercise.volume > 0) {
        md += `- **Volume:** ${exercise.volume.toFixed(1)} kg-reps\n`;
      }
      md += `\n`;
    });

    // Detailed set-by-set log from sessions
    if (sessionsForDay.length > 0) {
      md += `## Set-by-Set Log\n\n`;

      sessionsForDay.forEach((session) => {
        md += `### ${session.exerciseName}\n\n`;
        md += `| Set | Reps | Weight (kg) | Volume (kg-reps) |\n`;
        md += `|-----|------|-------------|------------------|\n`;

        (session.sets || []).forEach((set, i) => {
          const reps = set.reps || 0;
          const weight = set.weight_kg || 0;
          const vol = (reps * weight).toFixed(1);
          md += `| ${i + 1} | ${reps} | ${weight} | ${vol} |\n`;
        });
        md += `\n`;
      });
    }

    md += `---\n*Exported from Workout Tracker on ${new Date().toLocaleDateString()}*\n`;

    const dataBlob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;

    const sanitizedName = selectedEntry.workoutName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    link.download = `workout-${sanitizedName || "export"}-${sessionDateKey}.md`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showSuccessMessage(
      `Session summary for "${selectedEntry.workoutName}" exported as Markdown.`,
    );
  }

  exportWorkout(workoutId) {
    const workout = this.workouts.find((w) => w.id === workoutId);
    if (!workout) {
      alert("Workout not found");
      return;
    }

    const dataToExport = {
      version: "2.0",
      exportType: "workout",
      exportDate: new Date().toISOString(),
      workout,
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;

    const dateStr = new Date().toISOString().split("T")[0];
    const sanitizedName = workout.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    link.download = `workout-${sanitizedName || "export"}-${dateStr}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showSuccessMessage(`Workout "${workout.name}" exported!`);
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        const isWorkoutImport =
          importedData.exportType === "workout" ||
          (!!importedData.workout && !importedData.sessions);

        const isWorkoutSessionImport =
          importedData.exportType === "workout-session" ||
          (!!importedData.workoutSummary &&
            Array.isArray(importedData.sessions));

        if (isWorkoutImport) {
          const workout = { ...importedData.workout };

          if (
            !workout ||
            !workout.exercises ||
            !Array.isArray(workout.exercises)
          ) {
            throw new Error("Invalid workout export format");
          }

          if (!workout.name) {
            throw new Error("Workout is missing a name");
          }

          if (!workout.id) {
            workout.id = Date.now();
          }

          const confirmMsg =
            `Import workout "${workout.name}" with ${workout.exercises.length} exercises?` +
            "\n\nIt will be added to your workouts if it doesn't already exist.";

          if (!confirm(confirmMsg)) {
            event.target.value = "";
            return;
          }

          const exists = this.workouts.some(
            (w) => w.name.toLowerCase() === workout.name.toLowerCase(),
          );
          if (!exists) {
            // Generate new ID to avoid conflicts
            workout.id = Date.now();
            this.workouts.push(workout);
            this.saveWorkouts();
            this.renderWorkoutManager();
            this.renderWorkoutList();
            this.showSuccessMessage(`Workout "${workout.name}" imported!`);
          } else {
            this.showSuccessMessage(
              `Workout "${workout.name}" already exists (same name). Import skipped.`,
            );
          }

          event.target.value = "";
          return;
        }

        if (isWorkoutSessionImport) {
          const summary = importedData.workoutSummary;

          if (!summary || !summary.workoutName || !summary.date) {
            throw new Error("Invalid workout session export format");
          }

          if (!importedData.sessions || !Array.isArray(importedData.sessions)) {
            throw new Error("Invalid workout session export format");
          }

          const sessionDate = new Date(summary.date);
          let confirmMsg =
            `Import workout session "${
              summary.workoutName
            }" from ${this.formatDate(sessionDate)}?` +
            `\n\nIncludes ${importedData.sessions.length} exercise log${
              importedData.sessions.length === 1 ? "" : "s"
            }.`;

          if (importedData.workout) {
            confirmMsg += "\nAdds the workout template if it's new.";
          }

          if (!confirm(confirmMsg)) {
            event.target.value = "";
            return;
          }

          const results = {
            sessions: { added: 0, skipped: 0 },
            workouts: { added: 0, skipped: 0 },
            history: { added: 0, skipped: 0 },
          };

          let targetWorkoutId = summary.workoutId;

          if (importedData.workout) {
            const workoutName =
              importedData.workout.name || summary.workoutName || "Imported";
            const existingWorkout = this.workouts.find(
              (w) => w.name.toLowerCase() === workoutName.toLowerCase(),
            );

            if (existingWorkout) {
              targetWorkoutId = existingWorkout.id;
              results.workouts.skipped = 1;
            } else {
              const workoutToAdd = { ...importedData.workout };
              workoutToAdd.id = Date.now();
              this.workouts.push(workoutToAdd);
              targetWorkoutId = workoutToAdd.id;
              results.workouts.added = 1;
            }
          }

          const existingSessionIds = new Set(this.sessions.map((s) => s.id));
          importedData.sessions.forEach((session, index) => {
            const sessionCopy = { ...session };
            sessionCopy.workoutId = targetWorkoutId || sessionCopy.workoutId;
            sessionCopy.workoutName =
              summary.workoutName || sessionCopy.workoutName;

            if (!sessionCopy.id || existingSessionIds.has(sessionCopy.id)) {
              sessionCopy.id = Date.now() + index;
            }

            this.sessions.push(sessionCopy);
            results.sessions.added++;
          });

          const summaryToAdd = { ...summary };
          summaryToAdd.workoutId = targetWorkoutId || summaryToAdd.workoutId;

          const hasDuplicateHistory = this.workoutHistory.some(
            (entry) =>
              this.getLocalDateKey(new Date(entry.date)) ===
                this.getLocalDateKey(new Date(summaryToAdd.date)) &&
              entry.workoutId === summaryToAdd.workoutId,
          );

          if (hasDuplicateHistory) {
            results.history.skipped = 1;
          } else {
            if (
              !summaryToAdd.id ||
              this.workoutHistory.some((entry) => entry.id === summaryToAdd.id)
            ) {
              summaryToAdd.id = Date.now();
            }

            this.workoutHistory.unshift(summaryToAdd);
            this.workoutHistory.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
            this.selectedHistoryId = summaryToAdd.id;
            results.history.added = 1;
          }

          this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
          this.saveSessions();
          this.saveWorkouts();
          this.saveWorkoutHistory();

          this.renderWorkoutList();
          this.refreshInsights();
          this.renderWorkoutHistoryList(this.selectedHistoryId);

          let message = "Session import complete!\n\n";
          message += `Sessions: ${results.sessions.added} added`;
          if (results.sessions.skipped > 0)
            message += `, ${results.sessions.skipped} skipped`;

          if (importedData.workout) {
            message += `\nWorkouts: ${results.workouts.added} added`;
            if (results.workouts.skipped > 0)
              message += `, ${results.workouts.skipped} skipped`;
          }

          if (results.history.added || results.history.skipped) {
            message += `\nHistory: ${results.history.added} added`;
            if (results.history.skipped > 0)
              message += `, ${results.history.skipped} skipped`;
          }

          this.showSuccessMessage(message);
          event.target.value = "";
          return;
        }

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
          const existingWorkoutNames = new Set(
            this.workouts.map((w) => w.name.toLowerCase()),
          );
          importedData.workouts.forEach((workout) => {
            if (!existingWorkoutNames.has(workout.name.toLowerCase())) {
              // Generate new ID to avoid conflicts
              workout.id = Date.now() + results.workouts.added;
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
            this.exerciseLibrary.map((e) => e.name.toLowerCase()),
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
            "\n\nPlease ensure the file is a valid workout tracker backup.",
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
      (normalizedTarget - this.quoteStartDate) / msPerDay,
    );

    return (
      ((diffDays % this.quotes.length) + this.quotes.length) %
      this.quotes.length
    );
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

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ============================================
  // Google Sheets Sync
  // ============================================

  saveGoogleSheetsUrl(url) {
    this.googleSheetsUrl = (url || "").trim();
    localStorage.setItem("googleSheetsUrl", this.googleSheetsUrl);
  }

  saveGoogleSheetsAutoSync(enabled) {
    this.googleSheetsAutoSync = !!enabled;
    localStorage.setItem(
      "googleSheetsAutoSync",
      JSON.stringify(this.googleSheetsAutoSync),
    );
  }

  /** Test the connection to the deployed Apps Script web app */
  async testSheetsConnection() {
    if (!this.googleSheetsUrl) {
      this.showSuccessMessage("Please enter your Apps Script URL first");
      return false;
    }

    try {
      const url = `${this.googleSheetsUrl}?action=ping`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.ok) {
        this.showSuccessMessage("Connected to Google Sheets!");
        return true;
      } else {
        this.showSuccessMessage("Connection failed: " + (data.error || "Unknown"));
        return false;
      }
    } catch (err) {
      this.showSuccessMessage("Connection error: " + err.message);
      return false;
    }
  }

  /**
   * Sync a single completed workout (summary + its sessions) to Google Sheets.
   * Called automatically after finishing a workout when auto-sync is on.
   */
  async syncWorkoutToSheets(summary, sessions) {
    if (!this.googleSheetsUrl || this.sheetsIsSyncing) return;
    this.sheetsIsSyncing = true;

    try {
      const payload = JSON.stringify({
        action: "sync_workout",
        summary: summary,
        sessions: sessions,
      });

      const url = `${this.googleSheetsUrl}?action=sync_workout&payload=${encodeURIComponent(payload)}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.ok) {
        this.showSuccessMessage(
          `Synced to Google Sheets (${data.sessions_written} exercises)`,
        );
      } else {
        console.error("Sheets sync error:", data.error);
        this.showSuccessMessage("Sheets sync failed — check console");
      }
    } catch (err) {
      console.error("Sheets sync error:", err);
      this.showSuccessMessage("Sheets sync error — check console");
    } finally {
      this.sheetsIsSyncing = false;
    }
  }

  /**
   * Bulk-sync ALL workout history and sessions to Google Sheets.
   * This is the "mass export" for populating the sheet with existing data.
   */
  async bulkSyncToSheets() {
    if (!this.googleSheetsUrl) {
      this.showSuccessMessage("Set your Apps Script URL first");
      return;
    }

    if (this.sheetsIsSyncing) {
      this.showSuccessMessage("Sync already in progress…");
      return;
    }

    this.sheetsIsSyncing = true;
    const statusEl = document.getElementById("syncStatus");
    if (statusEl) {
      statusEl.textContent = "Syncing all data…";
      statusEl.className = "sync-status syncing";
    }

    try {
      // Split into chunks to avoid Apps Script URL length / execution limits
      const CHUNK = 20;
      const totalHistory = this.workoutHistory.length;
      const totalSessions = this.sessions.length;
      let historyWritten = 0;
      let sessionsWritten = 0;
      let exercisesWritten = 0;

      // First chunk includes exercise library
      for (let i = 0; i < Math.max(totalHistory, totalSessions); i += CHUNK) {
        const historyChunk = this.workoutHistory.slice(i, i + CHUNK);
        const sessionChunk = this.sessions.slice(i, i + CHUNK);
        const exerciseChunk = i === 0 ? this.exerciseLibrary : [];

        const payload = JSON.stringify({
          action: "bulk_sync",
          history: historyChunk,
          sessions: sessionChunk,
          exercises: exerciseChunk,
        });

        const url = `${this.googleSheetsUrl}?action=bulk_sync&payload=${encodeURIComponent(payload)}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (!data.ok) {
          throw new Error(data.error || "Sync chunk failed");
        }

        historyWritten += data.history_written || 0;
        sessionsWritten += data.sessions_written || 0;
        exercisesWritten += data.exercises_written || 0;

        if (statusEl) {
          statusEl.textContent = `Synced ${historyWritten}/${totalHistory} workouts, ${sessionsWritten}/${totalSessions} sessions…`;
        }
      }

      if (statusEl) {
        statusEl.textContent = `Done! ${historyWritten} workouts, ${sessionsWritten} sessions, ${exercisesWritten} exercises synced.`;
        statusEl.className = "sync-status success";
      }

      this.showSuccessMessage(
        `Bulk sync complete — ${historyWritten} workouts synced`,
      );
    } catch (err) {
      console.error("Bulk sync error:", err);
      if (statusEl) {
        statusEl.textContent = "Sync failed: " + err.message;
        statusEl.className = "sync-status error";
      }
      this.showSuccessMessage("Bulk sync failed — " + err.message);
    } finally {
      this.sheetsIsSyncing = false;
    }
  }

  /** Render live status info inside the Sync tab */
  renderSyncTabStatus() {
    const urlInput = document.getElementById("sheetsUrlInput");
    const autoSyncToggle = document.getElementById("sheetsAutoSync");
    const statusEl = document.getElementById("syncStatus");

    if (urlInput) urlInput.value = this.googleSheetsUrl;
    if (autoSyncToggle) autoSyncToggle.checked = this.googleSheetsAutoSync;

    if (statusEl && !this.sheetsIsSyncing) {
      const historyCount = this.workoutHistory.length;
      const sessionCount = this.sessions.length;
      statusEl.textContent = this.googleSheetsUrl
        ? `Ready · ${historyCount} workouts, ${sessionCount} exercise sessions available to sync`
        : "Enter your Apps Script URL above to get started";
      statusEl.className = "sync-status";
    }
  }

  /** Wire up event listeners for the Sync tab elements */
  setupSyncTabListeners() {
    const urlInput = document.getElementById("sheetsUrlInput");
    if (urlInput) {
      urlInput.addEventListener("change", () => {
        this.saveGoogleSheetsUrl(urlInput.value);
        this.renderSyncTabStatus();
      });
    }

    const autoSyncToggle = document.getElementById("sheetsAutoSync");
    if (autoSyncToggle) {
      autoSyncToggle.addEventListener("change", () => {
        this.saveGoogleSheetsAutoSync(autoSyncToggle.checked);
      });
    }

    const testBtn = document.getElementById("sheetsTestBtn");
    if (testBtn) {
      testBtn.addEventListener("click", () => {
        this.testSheetsConnection();
      });
    }

    const bulkSyncBtn = document.getElementById("sheetsBulkSyncBtn");
    if (bulkSyncBtn) {
      bulkSyncBtn.addEventListener("click", () => {
        if (
          confirm(
            `This will sync all ${this.workoutHistory.length} workouts and ${this.sessions.length} exercise sessions to your Google Sheet. Continue?`,
          )
        ) {
          this.bulkSyncToSheets();
        }
      });
    }
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
