import * as React from 'react';
import {DraggableCore} from 'react-draggable';

// Wrapper component to suppress findDOMNode warnings from react-draggable
// This is a temporary solution until react-draggable is updated to not use findDOMNode
type DraggableCoreWrapperProps = React.ComponentProps<typeof DraggableCore>;

export const DraggableCoreWrapper: React.FC<DraggableCoreWrapperProps> =
	React.memo(props => {
		// Store the original console.warn to restore it later
		const originalWarn = React.useRef(console.warn);

		React.useEffect(() => {
			// Override console.warn to filter out findDOMNode warnings from react-draggable
			console.warn = (...args) => {
				const message = args[0];
				if (
					typeof message === 'string' &&
					message.includes('findDOMNode is deprecated')
				) {
					// Suppress this specific warning
					return;
				}
				// Allow all other warnings to pass through
				originalWarn.current(...args);
			};

			return () => {
				// Restore original console.warn on cleanup
				console.warn = originalWarn.current;
			};
		}, []);

		return <DraggableCore {...props} />;
	});

DraggableCoreWrapper.displayName = 'DraggableCoreWrapper';
