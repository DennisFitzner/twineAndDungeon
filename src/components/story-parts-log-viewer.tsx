/**
 * Component for viewing story parts and cross-link logs
 * This can be used for debugging and monitoring story parts operations
 */

import * as React from 'react';
import {storyPartsLogger} from '../util/story-parts-logger';
import './story-parts-log-viewer.css';

export interface StoryPartsLogViewerProps {
	/**
	 * Whether the log viewer is visible
	 */
	visible?: boolean;
	/**
	 * Callback when the viewer should be closed
	 */
	onClose?: () => void;
}

export const StoryPartsLogViewer: React.FC<
	StoryPartsLogViewerProps
> = props => {
	const {visible = false, onClose} = props;
	const [logs, setLogs] = React.useState(storyPartsLogger.getLogs());
	const [filter, setFilter] = React.useState<
		'all' | 'storyParts' | 'crossLink' | 'tab'
	>('all');

	React.useEffect(() => {
		if (visible) {
			setLogs(storyPartsLogger.getLogs());
		}
	}, [visible]);

	const filteredLogs = React.useMemo(() => {
		if (filter === 'all') {
			return logs;
		}
		return storyPartsLogger.getLogsByType(filter);
	}, [logs, filter]);

	const exportLogs = () => {
		const logData = storyPartsLogger.exportLogs();
		const blob = new Blob([logData], {type: 'application/json'});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `story-parts-logs-${new Date().toISOString()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const clearLogs = () => {
		storyPartsLogger.clearLogs();
		setLogs([]);
	};

	if (!visible) {
		return null;
	}

	return (
		<div className="story-parts-log-viewer">
			<div className="log-viewer-header">
				<h3>Story Parts & Cross-Link Logs</h3>
				<div className="log-viewer-controls">
					<select
						value={filter}
						onChange={e => setFilter(e.target.value as any)}
					>
						<option value="all">All Logs</option>
						<option value="storyParts">Story Parts</option>
						<option value="crossLink">Cross Links</option>
						<option value="tab">Tabs</option>
					</select>
					<button onClick={exportLogs}>Export Logs</button>
					<button onClick={clearLogs}>Clear Logs</button>
					{onClose && <button onClick={onClose}>Close</button>}
				</div>
			</div>
			<div className="log-viewer-content">
				{filteredLogs.length === 0 ? (
					<p>No logs available</p>
				) : (
					<div className="log-entries">
						{filteredLogs.map((log, index) => (
							<div key={index} className="log-entry">
								<div className="log-header">
									<span className="log-timestamp">
										{log.timestamp.toLocaleTimeString()}
									</span>
									<span className="log-operation">{log.operation}</span>
									{'storyId' in log && (
										<span className="log-story">
											{log.storyName}
											{log.partName && ` (${log.partName})`}
										</span>
									)}
									{'linkType' in log && (
										<span className="log-link-type">
											{log.linkType}: {log.passageName}
										</span>
									)}
									{'tabId' in log && (
										<span className="log-tab">Tab: {log.tabName}</span>
									)}
								</div>
								{log.details && (
									<div className="log-details">
										<pre>{JSON.stringify(log.details, null, 2)}</pre>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};
