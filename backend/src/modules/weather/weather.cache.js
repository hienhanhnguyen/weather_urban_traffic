class TtlCache {
	constructor(maxEntries = 500) {
		this.maxEntries = maxEntries;
		this.entries = new Map();
	}

	get(key) {
		const entry = this.entries.get(key);
		if (!entry) return undefined;

		if (entry.expiresAt <= Date.now()) {
			this.entries.delete(key);
			return undefined;
		}

		this.entries.delete(key);
		this.entries.set(key, entry);
		return entry.value;
	}

	set(key, value, ttlMs) {
		if (this.entries.size >= this.maxEntries) {
			const oldest = this.entries.keys().next().value;
			this.entries.delete(oldest);
		}
		this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
	}

	clear() {
		this.entries.clear();
	}

	get size() {
		return this.entries.size;
	}
}

module.exports = { TtlCache };