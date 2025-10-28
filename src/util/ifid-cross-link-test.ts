/**
 * Test utility to demonstrate IFID-based cross-link functionality
 * This can be used to verify that the cross-link system works correctly
 */

import {Story, Passage} from '../store/stories/stories.types';
import {
	validateCrossLinkTarget,
	generateCrossLinkTags
} from './ifid-cross-link-utils';

/**
 * Create a test story with a specific IFID
 */
export function createTestStory(name: string, ifid: string): Story {
	return {
		id: 'test-story-id',
		ifid: ifid,
		name: name,
		partName: name,
		lastUpdate: new Date(),
		passages: [],
		script: '',
		stylesheet: '',
		storyFormat: 'Harlowe',
		storyFormatVersion: '3.3.9',
		startPassage: '',
		tags: [],
		tagColors: {},
		zoom: 1,
		snapToGrid: false,
		selected: false
	};
}

/**
 * Create a test passage
 */
export function createTestPassage(name: string, storyId: string): Passage {
	return {
		id: 'test-passage-id',
		name: name,
		story: storyId,
		left: 100,
		top: 100,
		width: 100,
		height: 100,
		tags: [],
		text: '',
		highlighted: false,
		selected: false
	};
}

/**
 * Test IFID-based cross-link validation
 */
export function testIfidCrossLinkValidation() {
	console.log('🧪 Testing IFID-based cross-link validation...');

	// Create test stories with IFIDs
	const story1 = createTestStory(
		'TestStory1',
		'5DFAE1BF-E2AD-495D-9EBC-77258D294873'
	);
	const story2 = createTestStory(
		'TestStory2',
		'BCF58918-94E6-4984-BA54-5486D911DF89'
	);

	// Add passages to stories
	const passage1 = createTestPassage('Start', story1.id);
	const passage2 = createTestPassage('Continue', story2.id);

	story1.passages = [passage1];
	story2.passages = [passage2];

	const stories = [story1, story2];

	// Test 1: Valid cross-link by IFID
	console.log('Test 1: Valid cross-link by IFID');
	const validation1 = validateCrossLinkTarget(stories, story2.ifid, 'Continue');
	console.log('Result:', validation1.isValid ? '✅ PASS' : '❌ FAIL');
	console.log('Found story:', validation1.story?.name);
	console.log('Found passage:', validation1.passage?.name);

	// Test 2: Valid cross-link by name (legacy support)
	console.log('\nTest 2: Valid cross-link by name (legacy support)');
	const validation2 = validateCrossLinkTarget(
		stories,
		'TestStory2',
		'Continue'
	);
	console.log('Result:', validation2.isValid ? '✅ PASS' : '❌ FAIL');
	console.log('Found story:', validation2.story?.name);
	console.log('Found passage:', validation2.passage?.name);

	// Test 3: Invalid cross-link (non-existent story)
	console.log('\nTest 3: Invalid cross-link (non-existent story)');
	const validation3 = validateCrossLinkTarget(
		stories,
		'NonExistentStory',
		'Continue'
	);
	console.log('Result:', !validation3.isValid ? '✅ PASS' : '❌ FAIL');

	// Test 4: Invalid cross-link (non-existent passage)
	console.log('\nTest 4: Invalid cross-link (non-existent passage)');
	const validation4 = validateCrossLinkTarget(
		stories,
		story2.ifid,
		'NonExistentPassage'
	);
	console.log('Result:', !validation4.isValid ? '✅ PASS' : '❌ FAIL');

	// Test 5: Generate cross-link tags
	console.log('\nTest 5: Generate cross-link tags');
	const tags = generateCrossLinkTags(
		story1,
		passage1,
		'backlink',
		story2,
		passage2
	);
	console.log('Generated tags:', tags);
	console.log('Expected tags:', [
		'backlink',
		'source-story-ifid:5DFAE1BF-E2AD-495D-9EBC-77258D294873',
		'source-passage-name:Start',
		'source-story-name:TestStory1'
	]);
	console.log(
		'Result:',
		JSON.stringify(tags) ===
			JSON.stringify([
				'backlink',
				'source-story-ifid:5DFAE1BF-E2AD-495D-9EBC-77258D294873',
				'source-passage-name:Start',
				'source-story-name:TestStory1'
			])
			? '✅ PASS'
			: '❌ FAIL'
	);

	console.log('\n🎉 IFID-based cross-link testing completed!');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
	(window as any).testIfidCrossLinkValidation = testIfidCrossLinkValidation;
}
