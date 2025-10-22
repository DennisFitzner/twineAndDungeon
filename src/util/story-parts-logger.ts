/**
 * Centralized logging utility for story parts and cross-link operations
 */

export interface StoryPartsLogContext {
	storyId: string;
	storyName: string;
	partName?: string;
	operation: string;
	timestamp: Date;
	details?: Record<string, any>;
}

export interface CrossLinkLogContext {
	sourceStoryId: string;
	sourceStoryName: string;
	targetStoryId?: string;
	targetStoryName?: string;
	linkType: 'interlink' | 'backlink';
	passageName: string;
	operation: string;
	timestamp: Date;
	details?: Record<string, any>;
}

export interface TabLogContext {
	tabId: string;
	tabName: string;
	operation: 'select' | 'close' | 'create' | 'filter' | 'close_blocked';
	timestamp: Date;
	details?: Record<string, any>;
}

class StoryPartsLogger {
	private static instance: StoryPartsLogger;
	private logs: Array<
		StoryPartsLogContext | CrossLinkLogContext | TabLogContext
	> = [];
	private maxLogs = 1000; // Prevent memory leaks

	private constructor() {}

	public static getInstance(): StoryPartsLogger {
		if (!StoryPartsLogger.instance) {
			StoryPartsLogger.instance = new StoryPartsLogger();
		}
		return StoryPartsLogger.instance;
	}

	/**
	 * Log story parts operations
	 */
	public logStoryParts(context: Omit<StoryPartsLogContext, 'timestamp'>): void {
		const logEntry: StoryPartsLogContext = {
			...context,
			timestamp: new Date()
		};

		this.addLog(logEntry);
		console.log(
			`[StoryParts] ${context.operation} - Story: ${context.storyName}${
				context.partName ? ` (Part: ${context.partName})` : ''
			}`,
			context.details || {}
		);
	}

	/**
	 * Log cross-link operations (interlinks and backlinks)
	 */
	public logCrossLink(context: Omit<CrossLinkLogContext, 'timestamp'>): void {
		const logEntry: CrossLinkLogContext = {
			...context,
			timestamp: new Date()
		};

		this.addLog(logEntry);
		console.log(
			`[CrossLink] ${context.operation} - ${context.linkType} from ${
				context.sourceStoryName
			} to ${context.targetStoryName || 'unknown'} (Passage: ${
				context.passageName
			})`,
			context.details || {}
		);
	}

	/**
	 * Log tab operations
	 */
	public logTab(context: Omit<TabLogContext, 'timestamp'>): void {
		const logEntry: TabLogContext = {
			...context,
			timestamp: new Date()
		};

		this.addLog(logEntry);
		console.log(
			`[Tab] ${context.operation} - Tab: ${context.tabName} (ID: ${context.tabId})`,
			context.details || {}
		);
	}

	/**
	 * Get all logs
	 */
	public getLogs(): Array<
		StoryPartsLogContext | CrossLinkLogContext | TabLogContext
	> {
		return [...this.logs];
	}

	/**
	 * Get logs filtered by type
	 */
	public getLogsByType(
		type: 'storyParts' | 'crossLink' | 'tab'
	): Array<StoryPartsLogContext | CrossLinkLogContext | TabLogContext> {
		return this.logs.filter(log => {
			switch (type) {
				case 'storyParts':
					return 'storyId' in log;
				case 'crossLink':
					return 'linkType' in log;
				case 'tab':
					return 'tabId' in log;
				default:
					return false;
			}
		});
	}

	/**
	 * Clear all logs
	 */
	public clearLogs(): void {
		this.logs = [];
		console.log('[StoryPartsLogger] All logs cleared');
	}

	/**
	 * Export logs as JSON
	 */
	public exportLogs(): string {
		return JSON.stringify(this.logs, null, 2);
	}

	private addLog(
		log: StoryPartsLogContext | CrossLinkLogContext | TabLogContext
	): void {
		this.logs.push(log);

		// Maintain max log size
		if (this.logs.length > this.maxLogs) {
			this.logs = this.logs.slice(-this.maxLogs);
		}
	}
}

// Export singleton instance
export const storyPartsLogger = StoryPartsLogger.getInstance();
