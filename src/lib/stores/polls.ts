import { writable, get } from 'svelte/store';
import type { Poll, PollOption, User } from '$lib/types/models';
import { updatePollInCache } from '$lib/queries/polls';

export type PollState = Record<number, { 
    poll: Poll; 
    options: PollOption[];
    userVotes: Record<number, number[]>; 
    hasVoted: Record<number, boolean>;
}>;

const { subscribe, set, update } = writable<PollState>({});

function isValidMessageId(messageId: number | null | undefined): messageId is number {
    return typeof messageId === 'number' && Number.isFinite(messageId) && messageId > 0;
}

function setPoll(messageId: number, pollData: { poll: Poll; options: PollOption[] }) {
    if (!isValidMessageId(messageId) || !pollData) return;
    
    update((state) => ({
        ...state,
        [messageId]: {
            poll: pollData.poll,
            options: pollData.options,
            userVotes: {},
            hasVoted: {}
        }
    }));
}

function updatePoll(pollId: number, pollData: Partial<{ poll: Poll; options: PollOption[] }>) {
    if (!isValidMessageId(pollId)) return;
    
    update((state) => {
        const currentPoll = state[pollId];
        if (!currentPoll) return state;
        
        return {
            ...state,
            [pollId]: {
                poll: pollData.poll || currentPoll.poll,
                options: pollData.options || currentPoll.options,
                userVotes: currentPoll.userVotes,
                hasVoted: currentPoll.hasVoted
            }
        };
    });
}

function updatePollOptions(pollId: number, options: PollOption[]) {
    if (!isValidMessageId(pollId)) return;
    
    update((state) => {
        const currentPoll = state[pollId];
        if (!currentPoll) return state;
        
        return {
            ...state,
            [pollId]: {
                ...currentPoll,
                options
            }
        };
    });
}

function handlePollCreated(messageId: number, pollData: { poll: Poll; options: PollOption[] }) {
    setPoll(messageId, pollData);
    updatePollInCache(messageId, pollData);
}

function handlePollVoted(pollId: number, voterId: number, optionIds: number[], updatedPollData?: { poll: Poll; options: PollOption[] }) {
    if (!isValidMessageId(pollId)) return;
    
    update((state) => {
        const currentPoll = state[pollId];
        if (!currentPoll) return state;
        
        const newUserVotes = { ...currentPoll.userVotes };
        const newHasVoted = { ...currentPoll.hasVoted };
        
        newUserVotes[voterId] = optionIds;
        newHasVoted[voterId] = true;
        
        let updatedOptions = currentPoll.options;
        if (updatedPollData?.options) {
            updatedOptions = updatedPollData.options;
        } else {
            updatedOptions = currentPoll.options.map(option => {
                if (optionIds.includes(option.id || 0)) {
                    return {
                        ...option,
                        votes_count: (option.votes_count || 0) + 1
                    };
                }
                return option;
            });
        }
        
        const updatedPoll = updatedPollData?.poll || currentPoll.poll;
        
        return {
            ...state,
            [pollId]: {
                poll: updatedPoll,
                options: updatedOptions,
                userVotes: newUserVotes,
                hasVoted: newHasVoted
            }
        };
    });
    
    const currentState = get({ subscribe });
    const currentPollData = currentState[pollId];
    if (currentPollData) {
        const cacheData = updatedPollData || {
            options: currentPollData.options.map(option => {
                if (optionIds.includes(option.id || 0)) {
                    return {
                        ...option,
                        votes_count: (option.votes_count || 0) + 1
                    };
                }
                return option;
            })
        };
        updatePollInCache(pollId, cacheData);
    }
}

function handlePollClosed(messageId: number) {
    if (!isValidMessageId(messageId)) return;
    
    update((state) => {
        const currentPoll = state[messageId];
        if (!currentPoll) return state;
        
        return {
            ...state,
            [messageId]: {
                ...currentPoll,
                poll: {
                    ...currentPoll.poll,
                    is_closed: true
                }
            }
        };
    });
    
    const currentState = get({ subscribe });
    const currentPollData = currentState[messageId];
    if (currentPollData) {
        updatePollInCache(messageId, {
            poll: {
                ...currentPollData.poll,
                is_closed: true
            }
        });
    }
}

function handlePollUpdated(poll: Poll, options: PollOption[], hasVoted: boolean, voterId: number, userVotedOptions: number[]) {
    const pollId = poll.message_id;
    if (!isValidMessageId(pollId)) return;

    update((state) => {
        const currentPoll = state[pollId];
        if (!currentPoll) {
            return {
                ...state,
                [pollId]: {
                    poll,
                    options,
                    userVotes: { [voterId]: userVotedOptions },
                    hasVoted: { [voterId]: hasVoted }
                }
            };
        }

        const newUserVotes = { ...currentPoll.userVotes };
        const newHasVoted = { ...currentPoll.hasVoted };

        newUserVotes[voterId] = userVotedOptions;
        newHasVoted[voterId] = hasVoted;

        if (!hasVoted && newHasVoted[voterId]) {
            newUserVotes[voterId] = [];
        }

        return {
            ...state,
            [pollId]: {
                poll,
                options,
                userVotes: newUserVotes,
                hasVoted: newHasVoted
            }
        };
    });

    updatePollInCache(pollId, {
        poll,
        options
    });
}

function getPoll(messageId: number): { poll: Poll; options: PollOption[]; userVotes: Record<number, number[]>; hasVoted: Record<number, boolean> } | null {
    if (!isValidMessageId(messageId)) return null;
    const state = get({ subscribe });
    return state[messageId] || null;
}

function removePoll(messageId: number) {
    if (!isValidMessageId(messageId)) return;
    
    update((state) => {
        const newState = { ...state };
        delete newState[messageId];
        return newState;
    });
}

function clear() {
    set({});
}

function hasUserVoted(messageId: number, userId: number): boolean {
    const pollData = getPoll(messageId);
    if (!pollData) return false;
    
    return pollData.hasVoted[userId] || false;
}

function getUserVotedOptions(messageId: number, userId: number): number[] {
    const pollData = getPoll(messageId);
    if (!pollData) return [];
    
    return pollData.userVotes[userId] || [];
}

function setUserVoteData(messageId: number, userId: number, votedOptions: number[], hasVoted: boolean) {
    if (!isValidMessageId(messageId)) {
        return;
    }
    
    update((state) => {
        const currentPoll = state[messageId];
        if (!currentPoll) {
            return state;
        }
        
        return {
            ...state,
            [messageId]: {
                ...currentPoll,
                userVotes: {
                    ...currentPoll.userVotes,
                    [userId]: votedOptions
                },
                hasVoted: {
                    ...currentPoll.hasVoted,
                    [userId]: hasVoted
                }
            }
        };
    });
}

export const polls = {
    subscribe,
    set,
    setPoll,
    updatePoll,
    updatePollOptions,
    handlePollCreated,
    handlePollVoted,
    handlePollClosed,
    handlePollUpdated,
    get: getPoll,
    remove: removePoll,
    clear,
    hasUserVoted,
    getUserVotedOptions,
    setUserVoteData,
};
