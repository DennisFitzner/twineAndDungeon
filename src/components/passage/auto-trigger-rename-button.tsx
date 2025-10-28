import * as React from 'react';
import {RenamePassageButton} from './rename-passage-button';
import {Passage, Story} from '../../store/stories';

export interface AutoTriggerRenameButtonProps {
	onRename: (value: string) => void;
	passage: Passage;
	story: Story;
	autoTrigger?: boolean;
}

export const AutoTriggerRenameButton: React.FC<
	AutoTriggerRenameButtonProps
> = props => {
	const {onRename, passage, story, autoTrigger = false} = props;

	return (
		<RenamePassageButton
			onRename={onRename}
			passage={passage}
			story={story}
			autoOpen={autoTrigger}
		/>
	);
};
