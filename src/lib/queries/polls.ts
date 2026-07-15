import { createQuery } from '@tanstack/svelte-query';
import { get } from 'svelte/store';
import { makeRequest } from '$lib/api';
import { loggedIn } from '$lib/stores/auth';
import { polls } from '$lib/stores/polls';
import { profileKeys } from './profile';
import type { Poll, PollOption, PollMedia, Message } from '$lib/types/models';

export type GetPollParams = {
  message_id: number;
};

export type VotePollParams = {
  poll_id: number;
  option_index: number;
};

export const pollKeys = {
  all: ['polls'] as const,
  detail: (messageId: number) => [...pollKeys.all, messageId] as const,
};

export async function fetchPoll(pollId: number): Promise<{ poll: Poll; options: PollOption[] }> {
  const res = await makeRequest<{ poll: Poll; options: PollOption[] }>(
    `/api/v1/polls/${pollId}`,
    null,
    true,
    'GET'
  );
  
  if (!res.data) throw new Error('No poll data in response');
  return res.data;
}

export function extractPollFromMessage(message: Message): { poll: Poll; options: PollOption[]; hasVoted: boolean } | null {
  if (!message.media || message.media.length === 0) return null;
  
  const pollMedia = message.media.find(m => m.type === 'Poll');
  if (!pollMedia) return null;
  
  const pollMediaData = pollMedia as PollMedia;
  
  const poll: Poll = {
    id: pollMediaData.id,
    chat_id: message.chat_id,
    message_id: message.id,
    question: pollMediaData.question,
    allows_multiple: pollMediaData.allows_multiple,
    anonymous: pollMediaData.anonymous,
    is_quiz: pollMediaData.is_quiz,
    explanation: pollMediaData.explanation || null,
    is_closed: false,
    created_at: message.created_at
  };
  
  const options: PollOption[] = pollMediaData.options.map((opt) => ({
    id: opt.id,
    text: opt.text,
    votes_count: opt.votes_count || 0,
    is_correct: opt.is_correct,
    voters: opt.voters
  }));
  
  const hasVoted = pollMediaData.has_voted || false;
  
  return { poll, options, hasVoted };
}

function getCurrentUserId(): number | null {
  const profileData = queryClient.getQueryData(profileKeys.current()) as any;
  return profileData?.id || null;
}

export function storePollFromMessage(message: Message, currentUserId: number | null) {
  const pollData = extractPollFromMessage(message);
  if (!pollData) {
    return;
  }
  
  const { poll, options, hasVoted } = pollData;
  
  const pollMedia = message.media?.find(m => m.type === 'Poll') as PollMedia;
  const userVotedOptions = pollMedia?.user_voted_options || [];
  
  polls.setPoll(message.id, { poll, options });
  
  if (hasVoted && currentUserId && userVotedOptions.length > 0) {   
    polls.setUserVoteData(message.id, currentUserId, userVotedOptions, hasVoted);
  }
}

export async function voteInPoll(params: VotePollParams): Promise<{ poll: Poll; options: PollOption[] }> {
  const res = await makeRequest<{ poll: Poll; options: PollOption[] }>(
    `polls/${params.poll_id}/vote`,
    { option_index: params.option_index },
    true,
    'POST'
  );
  
  if (!res.data) throw new Error('No poll data in response');
  return res.data;
}

export async function closePoll(pollId: number): Promise<{ poll: Poll }> {
  const res = await makeRequest<{ poll: Poll }>(
    `polls/${pollId}/close`,
    null,
    true,
    'POST'
  );
  
  if (!res.data) throw new Error('No poll data in response');
  return res.data;
}

export function usePoll(messageId: number, options?: { enabled?: boolean }) {
  return createQuery({
    queryKey: pollKeys.detail(messageId),
    queryFn: async (): Promise<{ poll: Poll; options: PollOption[] }> => {
      return fetchPoll(messageId);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: (options?.enabled !== false) && get(loggedIn) && messageId > 0,
  });
}

export function createVoteMutation() {
  return {
    mutationFn: voteInPoll,
    onSuccess: (data: { poll: Poll; options: PollOption[] }, variables: VotePollParams) => {
      const currentUserId = getCurrentUserId();
      if (currentUserId) {
        const optionIds = [variables.option_index];
        polls.handlePollVoted(variables.poll_id, currentUserId, optionIds, data);
      }
      
      queryClient.invalidateQueries({ queryKey: pollKeys.detail(variables.poll_id) });
    },
  };
}

export function createClosePollMutation() {
  return {
    mutationFn: closePoll,
    onSuccess: (data: { poll: Poll }, variables: number) => {
      queryClient.invalidateQueries({ queryKey: pollKeys.detail(variables) });
    },
  };
}

export function updatePollInCache(messageId: number, data: { poll?: Poll; options?: PollOption[] }) {
  queryClient.setQueryData(
    pollKeys.detail(messageId),
    (oldData: { poll: Poll; options: PollOption[] } | undefined) => {
      if (!oldData) return oldData;
      
      return {
        poll: data.poll || oldData.poll,
        options: data.options || oldData.options,
      };
    }
  );
}

import { queryClient } from '$lib/query';
