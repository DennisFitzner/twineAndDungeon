/**
 * Tab state management utility for story parts
 * Handles localStorage operations for open tabs and active tab state
 */

/**
 * Get open tab IFIDs for a story folder
 */
export function getOpenTabs(storyFolderName: string): string[] {
	try {
		const key = `twine-tabs-${storyFolderName}`;
		const saved = localStorage.getItem(key);
		return saved ? JSON.parse(saved) : [];
	} catch (error) {
		console.warn('Failed to load open tabs from localStorage:', error);
		return [];
	}
}

/**
 * Save open tab IFIDs for a story folder
 */
export function setOpenTabs(storyFolderName: string, ifids: string[]): void {
	try {
		const key = `twine-tabs-${storyFolderName}`;
		localStorage.setItem(key, JSON.stringify(ifids));
	} catch (error) {
		console.warn('Failed to save open tabs to localStorage:', error);
	}
}

/**
 * Get active tab IFID for a story folder
 */
export function getActiveTab(storyFolderName: string): string | null {
	try {
		const key = `twine-active-tab-${storyFolderName}`;
		return localStorage.getItem(key);
	} catch (error) {
		console.warn('Failed to load active tab from localStorage:', error);
		return null;
	}
}

/**
 * Save active tab IFID for a story folder
 */
export function setActiveTab(storyFolderName: string, ifid: string): void {
	try {
		const key = `twine-active-tab-${storyFolderName}`;
		localStorage.setItem(key, ifid);
	} catch (error) {
		console.warn('Failed to save active tab to localStorage:', error);
	}
}

/**
 * Add a tab to open tabs for a story folder
 */
export function addTab(storyFolderName: string, ifid: string): void {
	const currentTabs = getOpenTabs(storyFolderName);
	if (!currentTabs.includes(ifid)) {
		const newTabs = [...currentTabs, ifid];
		setOpenTabs(storyFolderName, newTabs);
	}
}

/**
 * Remove a tab from open tabs for a story folder
 */
export function removeTab(storyFolderName: string, ifid: string): void {
	const currentTabs = getOpenTabs(storyFolderName);
	const newTabs = currentTabs.filter(id => id !== ifid);
	setOpenTabs(storyFolderName, newTabs);
}

/**
 * Clear all tab state for a story folder
 */
export function clearTabs(storyFolderName: string): void {
	try {
		const tabsKey = `twine-tabs-${storyFolderName}`;
		const activeKey = `twine-active-tab-${storyFolderName}`;
		localStorage.removeItem(tabsKey);
		localStorage.removeItem(activeKey);
	} catch (error) {
		console.warn('Failed to clear tabs from localStorage:', error);
	}
}
