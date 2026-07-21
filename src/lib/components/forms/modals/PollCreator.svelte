<script lang="ts">
    import { Plus, Trash2 } from 'lucide-svelte';
    import Button from '$lib/components/shared/Button.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import Textarea from '$lib/components/shared/Textarea.svelte';
    import type { PollOption } from '$lib/types/models';
    import { _ } from 'svelte-i18n';
    import PollOptionIcon from '$lib/components/icons/PollOptionIcon.svelte';

    // Props
    export let isOpen: boolean = false;
    export let onClose: () => void;
    export let onCreate: (poll: any) => void;

    // State
    let question = '';
    let options: string[] = ['', ''];
    let allowsMultiple = false;
    let anonymous = true;
    let isQuiz = false;
    let allowRevote = true;
    let explanation = '';
    let correctOptionIndexes: number[] = [];

    // Event handlers
    function handleCreate() {
        const validOptions = options.filter(opt => opt.trim().length > 0);
        
        if (!question.trim()) return;
        if (validOptions.length < 2) return;

        const pollOptions: PollOption[] = validOptions.map((opt, index) => ({
            id: 0,
            poll_id: 0,
            text: opt.trim(),
            is_correct: isQuiz ? correctOptionIndexes.includes(index) : null,
            votes_count: 0
        }));

        const pollData = {
            type: 'Poll',
            id: Date.now(),
            question: question.trim(),
            options: pollOptions,
            allows_multiple: allowsMultiple,
            anonymous,
            is_quiz: isQuiz,
            allow_revote: isQuiz ? false : allowRevote,
            explanation: explanation.trim() || null,
            correct_option_indexes: isQuiz && correctOptionIndexes.length > 0 ? correctOptionIndexes : null,
            has_voted: false,
            user_voted_options: []
        };

        onCreate(pollData);
        resetForm();
        onClose();
    }

    function handleClose() {
        resetForm();
        onClose();
    }

    // Utility functions
    function resetForm() {
        question = '';
        options = ['', ''];
        allowsMultiple = false;
        anonymous = true;
        isQuiz = false;
        allowRevote = true;
        explanation = '';
        correctOptionIndexes = [];
    }

    function addOption() {
        options = [...options, ''];
    }

    function removeOption(index: number) {
        options = options.filter((_, i) => i !== index);
        correctOptionIndexes = correctOptionIndexes
            .map(i => i > index ? i - 1 : i)
            .filter(i => i < options.length - 1);
    }

    function updateOption(index: number, value: string) {
        options = options.map((opt, i) => i === index ? value : opt);
    }

    function toggleCorrectOption(index: number) {
        if (correctOptionIndexes.includes(index)) {
            correctOptionIndexes = correctOptionIndexes.filter(i => i !== index);
        } else {
            correctOptionIndexes = [...correctOptionIndexes, index];
        }
    }
</script>

<Modal
    open={isOpen}
    title={$_('poll.create_poll')}
    showClose={true}
    maxWidth="500px"
    on:close={handleClose}
>
    <div class="poll-creator">
        <div class="poll-group">
            <div class="group-header">
                <span>{$_('poll.basic_settings')}</span>
            </div>
            <div class="form-group">
                <label for="question">{$_('poll.question')}</label>
                <Textarea
                    id="question"
                    bind:value={question}
                    placeholder={$_('poll.question_placeholder')}
                    rows="1"
                    class="question-input"
                />
            </div>
        </div>

        <div class="poll-group">
            <div class="group-header">
                <span>{$_('poll.options')}</span>
            </div>
                        <div class="options-list">
                {#each options as option, index}
                    <div class="option-item">
                        {#if isQuiz}
                            {@const iconType = correctOptionIndexes.includes(index) ? 'check' : 'circle'}
                            <button 
                                type="button"
                                class="option-icon-wrapper clickable"
                                on:click={() => toggleCorrectOption(index)}
                                title={$_('poll.mark_as_correct')}
                            >
                                <PollOptionIcon 
                                    type={iconType} 
                                    multiple={allowsMultiple} 
                                    size={16} 
                                />
                            </button>
                        {/if}

                        <input
                            type="text"
                            bind:value={option}
                            placeholder={$_('poll.option_placeholder', { values: { number: index + 1 } })}
                            class="option-input"
                            on:input={(e) => updateOption(index, e.currentTarget?.value || '')}
                        />
                        
                        {#if options.length > 2}
                            <button
                                type="button"
                                class="remove-option"
                                on:click={() => removeOption(index)}
                                title={$_('common.remove')}
                            >
                                <Trash2 size={16} />
                            </button>
                        {/if}
                    </div>
                {/each}
                
                <button
                    type="button"
                    class="add-option"
                    on:click={addOption}
                    disabled={options.length >= 10}
                >
                    <Plus size={16} />
                    {$_('poll.add_option')}
                </button>
            </div>
        </div>

        <div class="poll-group">
            <div class="group-header">
                <span>{$_('poll.poll_settings')}</span>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        bind:checked={allowsMultiple}
                    />
                    {$_('poll.allow_multiple')}
                </label>
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        bind:checked={anonymous}
                    />
                    {$_('poll.anonymous')}
                </label>
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        bind:checked={isQuiz}
                        on:change={() => {
                            if (isQuiz) {
                                allowRevote = false;
                            }
                        }}
                    />
                    {$_('poll.quiz_mode')}
                </label>
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        bind:checked={allowRevote}
                        disabled={isQuiz}
                    />
                    {$_('poll.allow_revote')}
                </label>
            </div>
        </div>

        {#if isQuiz}
            <div class="poll-group">
                <div class="group-header">
                    <span>{$_('poll.quiz_settings')}</span>
                </div>
                <div class="form-group">
                    <label for="explanation">{$_('poll.explanation')}</label>
                    <textarea
                        id="explanation"
                        bind:value={explanation}
                        placeholder={$_('poll.explanation_placeholder')}
                        rows="2"
                        class="explanation-input"
                    />
                </div>
            </div>
        {/if}
    </div>

    <div slot="footer" class="poll-creator-footer">
        <Button
            on:click={handleClose}
            variant="outline"
        >
            {$_('common.cancel')}
        </Button>
        <Button
            on:click={handleCreate}
            disabled={!question.trim() || options.filter(opt => opt.trim()).length < 2}
        >
            {$_('poll.create')}
        </Button>
    </div>
</Modal>

<style lang="scss">
    @import '../../../../styles/components/modal';

    .poll-creator {
        @extend .modal-content;
    }

    .poll-group {
        @extend .modal-group;
    }

    .group-header {
        @extend .modal-group-header;
    }

    .form-group {
        @extend .form-group;
    }

    .options-list {
        @extend .options-list;
    }

    .option-item {
        @extend .option-item;
    }

    .option-icon-wrapper {
        @extend .option-icon-wrapper;
    }

    .option-input {
        @extend .option-input;
    }

    .remove-option {
        @extend .remove-option;
    }

    .add-option {
        @extend .add-option;
    }

    .checkbox-label {
        @extend .checkbox-label;
    }

    .poll-creator-footer {
        @extend .modal-footer;
    }
</style>