<script lang="ts">
    import type { Poll, PollOption } from '$lib/types/models';
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { formatMessageTime } from '$lib/datetime';
    import { format } from 'svelte-i18n';
    import { _ } from 'svelte-i18n';
    import { wsService } from '$lib/ws-service';
    import type { VotePollMessage } from '$lib/types/websocket';
    import { polls } from '$lib/stores/polls';
    import { onMount } from 'svelte';
    import PollOptionIcon from '../icons/PollOptionIcon.svelte';

    // Props
    export let poll: Poll;
    export let options: PollOption[];
    export let messageId: number;
    export let currentUserId: number | null = null;
    export let hasVoted: boolean = false;
    export let selectedOptions: number[] = [];
    export let totalVotes: number = 0;
    export let canVote: boolean = true;
    export let showResults: boolean = false;

    // Event dispatcher
    const dispatch = createEventDispatcher();

    let displayPoll: Poll = poll;
    let displayOptions: PollOption[] = options;
    let displayTotalVotes: number = totalVotes;
    let displayHasVoted: boolean = hasVoted;
    let displayShowResults: boolean = showResults;

    let hasLocalSelection: boolean = false;
    let lastPollDataId: string | null = null;

    onMount(() => {
        const unsubscribe = polls.subscribe(() => {
            syncFromStore();
        });
        syncFromStore();
        return unsubscribe;
    });

    function syncFromStore() {
        const pollData = polls.get(messageId);

        if (!pollData) {
            displayPoll = poll;
            displayOptions = options;
            displayTotalVotes = options.reduce((sum, opt) => sum + (opt.votes_count || 0), 0);
            displayHasVoted = hasVoted;
            selectedOptions = selectedOptions.length > 0 ? selectedOptions : [];
            displayShowResults = hasVoted || poll.is_closed;
            return;
        }
        
        const storeHasVoted = currentUserId ? polls.hasUserVoted(messageId, currentUserId) : false;
        const dataId = `${pollData.poll.id || messageId}-${pollData.options.map((o: any) => `${o.id}:${o.votes_count}`).join(',')}-${storeHasVoted}`;
        
        if (dataId === lastPollDataId) return;
        lastPollDataId = dataId;
        
        console.log(`[${messageId} ${pollData.poll.id}] pollData updated`);
        
        displayPoll = pollData.poll;
        displayOptions = pollData.options;
        displayTotalVotes = displayOptions.reduce((sum, opt) => sum + (opt.votes_count || 0), 0);
        
        if (currentUserId) {
            displayHasVoted = storeHasVoted;
            if (storeHasVoted || !hasLocalSelection) {
                selectedOptions = polls.getUserVotedOptions(messageId, currentUserId);
            }
            if (storeHasVoted || pollData.poll.is_closed) {
                displayShowResults = true;
                hasLocalSelection = false;
            }
        }
    }

    $: timeStr = formatMessageTime(displayPoll.created_at, $format);
    $: pollTags = getPollTags();
    $: maxVotes = Math.max(...displayOptions.map(opt => opt.votes_count || 0), 1);

    function getPollTags(): string[] {
        const tags = [];
        if (displayPoll.anonymous) tags.push($_('poll.anonymous'));
        if (displayPoll.is_quiz) tags.push($_('poll.quiz'));
        if (displayPoll.allows_multiple) tags.push($_('poll.multiple_choice'));
        return tags;
    }

    function getVotePercentage(votes: number): number {
        return displayTotalVotes > 0 ? Math.round((votes / displayTotalVotes) * 100) : 0;
    }

    function handleOptionClick(optionId: number) {
        if (!canVote || displayPoll.is_closed) return;
        if (displayHasVoted) return;

        hasLocalSelection = true;

        if (displayPoll.allows_multiple) {
            if (selectedOptions.includes(optionId)) {
                selectedOptions = selectedOptions.filter(id => id !== optionId);
                if (selectedOptions.length === 0) hasLocalSelection = false;
            } else {
                selectedOptions = [...selectedOptions, optionId];
            }
        } else {
            selectedOptions = [optionId];
        }
    }

    function handleVote() {
        if (selectedOptions.length === 0) return;

        const optionIndex = displayOptions.findIndex(opt => opt.id === selectedOptions[0]);
        if (optionIndex === -1) return;

        const voteMessage: VotePollMessage = {
            type: 'vote_poll',
            data: { message_id: messageId, option_ids: selectedOptions }
        };
        
        wsService.send(voteMessage);
        
        displayHasVoted = true;
        displayShowResults = true;
        hasLocalSelection = false;
    
        dispatch('vote', { optionIds: selectedOptions, optionIndex });
    }

    function handleShowResults() {
        displayShowResults = true;
        dispatch('showResults');
    }

    function getOptionIcon(option: PollOption, isSelected: boolean): string {
        if (displayPoll.is_quiz && displayHasVoted) {
            if (option.is_correct === true) return 'check';
            if (option.is_correct === false && isSelected) return 'x';
            if (option.is_correct === false && !isSelected) return 'circle';
        }
        if (isSelected) return 'selected';
        return 'circle';
    }
    
    function getVoterList(option: PollOption): string[] {
        if (!option.voters || option.voters.length === 0) return [];
        return option.voters.map(voter => voter.name || voter.username).slice(0, 10);
    }
    
    function showVoterList(option: PollOption): boolean {
        return Boolean(!displayPoll.anonymous && displayShowResults && option.voters && option.voters.length > 0);
    }

    onDestroy(() => console.log(`[${messageId}] destroyed`));
</script>

<div class="poll-container">
    <div class="poll-question">
        {displayPoll.question}
    </div>

    <div class="poll-options">
        {#each displayOptions as option, i (option.id ?? i)}
            {@const iconType = getOptionIcon(option, selectedOptions.includes(option.id ?? 0))}
            {@const percentage = getVotePercentage(option.votes_count || 0)}
            {@const isSelected = selectedOptions.includes(option.id ?? 0)}
            {@const showResultsMode = displayShowResults || displayPoll.is_closed}
            
            {#if i > 0}
                <div class="option-divider"></div>
            {/if}
            
            <button 
                class="poll-option {isSelected ? 'selected' : ''} {displayPoll.is_closed ? 'disabled' : ''} {showResultsMode ? 'results-mode' : ''}"
                on:click={() => handleOptionClick(option.id ?? 0)}
                disabled={!canVote || displayPoll.is_closed || displayHasVoted}
                type="button"
            >
                {#if showResultsMode}
                    <div class="result-top-row">
                        <span class="result-percentage">{percentage}%</span>
                        <span class="option-text option-text-truncated">{option.text}</span>
                        <span class="vote-count-badge">{option.votes_count}</span>
                    </div>
                    <div class="result-bottom-row">
                        <PollOptionIcon type={iconType} multiple={displayPoll.allows_multiple} size={16} />
                        <div class="vote-bar-wrapper">
                            <div class="vote-bar" style="width: {percentage}%"></div>
                        </div>
                    </div>
                {:else}
                    <div class="option-content">
                        <PollOptionIcon type={iconType} multiple={displayPoll.allows_multiple} size={16} />
                        <span class="option-text">{option.text}</span>
                    </div>
                {/if}
                
                {#if showResultsMode && showVoterList(option)}
                    <div class="voter-list">
                        {#each getVoterList(option) as voter}
                            <span class="voter">{voter}</span>
                        {/each}
                        {#if option.voters && option.voters.length > 10}
                            <span class="voter-more">+{option.voters.length - 10} more</span>
                        {/if}
                    </div>
                {/if}
            </button>
        {/each}
    </div>

    <div class="poll-footer">
        <div class="poll-info">
            <span class="vote-count">
                {displayTotalVotes} {$_('poll.votes', { default: displayTotalVotes === 1 ? 'vote' : 'votes' })}
            </span>
            
            {#if pollTags.length > 0}
                <div class="poll-tags">
                    {#each pollTags as tag}
                        <span class="poll-tag">{tag}</span>
                    {/each}
                </div>
            {/if}
        </div>

        {#if !displayShowResults && !displayPoll.is_closed && (displayHasVoted || !canVote)}
            <button class="results-button" on:click={handleShowResults} type="button">
                {$_('poll.results')}
            </button>
        {/if}

        {#if canVote && !displayPoll.is_closed && !displayHasVoted && selectedOptions.length > 0}
            <button class="vote-button" on:click={handleVote} type="button">
                {$_('poll.vote')}
            </button>
        {/if}
    </div>

    {#if displayPoll.is_quiz && displayPoll.explanation && (displayShowResults || displayPoll.is_closed)}
        <div class="poll-explanation">
            <strong>{$_('poll.explanation')}:</strong> {displayPoll.explanation}
        </div>
    {/if}
</div>

<style lang="scss">
    .poll-container {
        background: var(--bubble-bg, rgba(255, 255, 255, 0.06));
        border-radius: 15px;
        max-width: 100%;
        width: 100%;
    }

    .poll-question {
        font-weight: 600;
        font-size: 1.1em;
        margin-bottom: 12px;
        line-height: 1.3;
        color: var(--color-text-button);
        padding: 12px 12px 0 12px;
    }

    .poll-options {
        display: flex;
        flex-direction: column;
        margin-bottom: 8px;
        color: var(--color-text-button);
        padding: 0;
        border-radius: 0;
    }

    .poll-option {
        display: flex;
        flex-direction: column;
        padding: 10px 10px;
        background: transparent;
        margin: 4px auto;
        color: var(--color-text-button);
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.1s ease;
        position: relative;
        text-align: left;
        width: 100%;
        font-size: 0.95em;
        border: none;
        gap: 8px;
    }

    .poll-option:hover:not(.disabled) {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
    }

    .poll-option.selected {
        background: rgba(255, 255, 255, 0.12);
    }

    .poll-option.disabled {
        cursor: not-allowed;
        opacity: 0.7;
    }

    .option-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.12);
        margin: 0 12px;
    }

    .result-top-row {
        display: flex;
        gap: 10px;
        width: 100%;
    }

    .result-percentage {
        font-weight: 400;
        font-size: 1rem;
        color: var(--color-button-text)
    }

    .option-text-truncated {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .vote-count-badge {
        font-size: 0.85em;
        opacity: 0.7;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 20px;
        margin-left: auto;
    }

    .result-bottom-row {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
    }

    .result-icon {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
    }

    .vote-bar-wrapper {
        flex: 1;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        height: 4px;
        overflow: hidden;
    }

    .vote-bar {
        background: var(--color-button-text);
        height: 100%;
        border-radius: 20px;
        transition: width 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
    }

    .option-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
    }

    .voter-list {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        font-size: 0.7rem;
        opacity: 0.7;
    }

    .voter {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 20px;
    }

    .voter-more {
        font-style: italic;
    }

    .poll-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
        padding: 8px 12px 12px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .poll-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        width: 100%;
    }

    .vote-count {
        font-size: 0.85em;
        opacity: 0.7;
    }

    .poll-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .poll-tag {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 0.7em;
        opacity: 0.8;
    }

    .results-button,
    .vote-button {
        background: var(--color-accent);
        color: white;
        border: none;
        padding: 6px 14px;
        border-radius: 30px;
        font-size: 0.85em;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;
    }

    .results-button:hover,
    .vote-button:hover {
        background: var(--color-accent-hover);
        transform: translateY(-1px);
    }

    .poll-explanation {
        margin: 8px 12px 12px 12px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.85em;
        line-height: 1.4;
        backdrop-filter: blur(2px);
        background-color: rgba(255, 255, 255, 0.08);
        border-left: 3px solid rgba(255, 255, 255, 0.16);
    }

    @media (max-width: 480px) {
        .poll-container {
            min-width: 240px;
            max-width: 100%;
        }
        .poll-footer {
            flex-direction: column;
            align-items: stretch;
        }
        .poll-info {
            justify-content: center;
        }
        .results-button,
        .vote-button {
            width: 100%;
            text-align: center;
        }
        .result-top-row {
            gap: 6px;
            flex-wrap: wrap;
        }
        .vote-count-badge {
            margin-left: 0;
        }
    }
</style>