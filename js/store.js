/**
 * Storage Manager
 * Wraps localStorage operations
 */

const STORAGE_KEY = 'badminton_manager_data';

class Store {
    constructor() {
        this.data = this._load();
    }

    _load() {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) {
            return { clubs: [] };
        }
        try {
            return JSON.parse(json);
        } catch (e) {
            console.error('Failed to parse data', e);
            return { clubs: [] };
        }
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    getClubs() {
        return this.data.clubs;
    }

    getClub(id) {
        return this.data.clubs.find(c => c.id === id);
    }

    addClub(club) {
        this.data.clubs.push(club);
        this._save();
    }

    updateClub(updatedClub) {
        const index = this.data.clubs.findIndex(c => c.id === updatedClub.id);
        if (index !== -1) {
            this.data.clubs[index] = updatedClub;
            this._save();
        }
    }

    deleteClub(id) {
        this.data.clubs = this.data.clubs.filter(c => c.id !== id);
        this._save();
    }
}
