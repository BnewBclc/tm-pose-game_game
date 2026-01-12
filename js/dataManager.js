/**
 * dataManager.js
 * Handles User Data (Login, Signup, Ranking) using LocalStorage.
 * Reverted to client-side storage as requested.
 */

const STORAGE_KEY = "fruitCatcherUsers";

class DataManager {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = null;
    }

    // Load users from LocalStorage
    loadUsers() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Storage Error:", e);
            return [];
        }
    }

    // Save users to LocalStorage
    saveUsers() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.users));
    }

    // Register a new user
    // Supports async interface for compatibility with existing main.js
    async signup(username, password) {
        if (this.users.find(u => u.username === username)) {
            return { success: false, message: "Username already exists." };
        }

        const newUser = {
            username: username,
            password: password,
            bestScore: 0,
            joinDate: new Date().toLocaleDateString()
        };

        this.users.push(newUser);
        this.saveUsers();
        return { success: true, message: "Signup successful! Please login." };
    }

    // Login user
    async login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.currentUser = user;
            return { success: true, user: user };
        }
        return { success: false, message: "Invalid username or password." };
    }

    // Update Score
    async updateScore(score) {
        if (!this.currentUser) return false;

        // Find current user object in array reference
        const userRef = this.users.find(u => u.username === this.currentUser.username);

        if (userRef && score > userRef.bestScore) {
            userRef.bestScore = score;
            this.currentUser.bestScore = score; // Update session object too
            this.saveUsers(); // Save to localStorage
            return true;
        }
        return false;
    }

    // Get Rankings (Top 5)
    async getRankings() {
        const sorted = [...this.users].sort((a, b) => b.bestScore - a.bestScore);
        return sorted.slice(0, 5).map(u => ({
            username: u.username,
            score: u.bestScore
        }));
    }
}

// Export singleton
window.dataManager = new DataManager();
