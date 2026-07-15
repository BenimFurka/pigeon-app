<script lang="ts">
    import Tabs from '$lib/components/navigation/tab/Tabs.svelte';
    import Form from '$lib/components/shared/Form.svelte';
    import ClickText from '$lib/components/navigation/ClickText.svelte';
    import SettingsModal from '$lib/components/forms/modals/SettingsModal.svelte';
    import { Settings } from 'lucide-svelte';
    import {
        login,
        register,
        verifyEmail,
        requestPasswordReset,
        verifyPasswordReset,
        authError
    } from '$lib/stores/auth';
    import { writable } from 'svelte/store';
    import type { InputItem } from '$lib/types/components';
    import { onMount } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { session } from '$lib/session';

    // Stores
    const isLoading = writable(false);

    // State
    let view = 'login';
    let showSettingsModal = false;
    let isMobile = false;
    
    // Form Data
    let loginData = {
        login: '',
        password: ''
    };

    let registerData = {
        display: '',
        username: '',
        email: '',
        password: ''
    };

    let verifyData = {
        code: ''
    };

    let forgotPasswordData = {
        email: ''
    };

    let resetPasswordData = {
        code: '',
        new_password: ''
    };

	$: loginFields = [
		{ id: 'login', label: $_('auth.login_email_username'), type: 'text', required: true, placeholder: $_('auth.login_email_username') },
		{ id: 'password', label: $_('auth.password'), type: 'password', required: true, placeholder: $_('auth.password') }
	] as InputItem[];
	$: registerFields = [
		{ id: 'display', label: $_('auth.display_name'), type: 'text', placeholder: $_('auth.display_name') },
		{ id: 'username', label: $_('auth.username'), type: 'text', required: true, placeholder: $_('auth.username') },
		{ id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email' },
		{ id: 'password', label: $_('auth.password'), type: 'password', required: true, placeholder: $_('auth.password') }
	] as InputItem[];
	$: verifyFields = [
		{ id: 'code', label: $_('auth.email_code'), type: 'text', required: true, placeholder: $_('auth.email_code') }
	] as InputItem[];
	$: forgotPasswordFields = [
		{ id: 'email', label: $_('auth.enter_email'), type: 'email', required: true, placeholder: $_('auth.enter_email') }
	] as InputItem[];
	$: resetPasswordFields = [
		{ id: 'code', label: $_('auth.email_code'), type: 'text', required: true, placeholder: $_('auth.email_code') },
		{ id: 'new_password', label: $_('auth.new_password'), type: 'password', required: true, placeholder: $_('auth.new_password') }
	] as InputItem[];

    // Lifecycle hooks
    onMount(() => {
        const checkMobile = () => {
            isMobile = window.innerWidth <= 768;
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    });

    // Event handlers
    async function handleLogin(event: SubmitEvent) {
		if ($isLoading) return;
		isLoading.set(true);
		try {
			const formData = new FormData(event.target as HTMLFormElement);
			updateFormData(formData, loginData);
			const success = await login(loginData.login, loginData.password);
			if (success) {
				await session.initialize();
			}
		} finally {
			isLoading.set(false);
		}
	}

	async function handleRegister(event: SubmitEvent) {
		if ($isLoading) return;
		isLoading.set(true);
		try {
			const formData = new FormData(event.target as HTMLFormElement);
			updateFormData(formData, registerData);
			const success = await register(
				registerData.username,
				registerData.email,
				registerData.password,
				registerData.display
			);
			if (success) switchView('verifyEmail');
		} finally {
			isLoading.set(false);
		}
	}

	async function handleVerify(event: SubmitEvent) {
		if ($isLoading) return;
		isLoading.set(true);
		try {
			const formData = new FormData(event.target as HTMLFormElement);
			updateFormData(formData, verifyData);
			await verifyEmail(registerData.email, verifyData.code);
			await session.initialize();
		} finally {
			isLoading.set(false);
		}
	}

	async function handleRequestReset(event: SubmitEvent) {
		if ($isLoading) return;
		isLoading.set(true);
		try {
			const formData = new FormData(event.target as HTMLFormElement);
			updateFormData(formData, forgotPasswordData);
			const success = await requestPasswordReset(forgotPasswordData.email);
			if (success) switchView('resetPassword');
		} finally {
			isLoading.set(false);
		}
	}

	async function handleResetPassword(event: SubmitEvent) {
		if ($isLoading) return;
		isLoading.set(true);
		try {
			const formData = new FormData(event.target as HTMLFormElement);
			updateFormData(formData, resetPasswordData);
			const success = await verifyPasswordReset(
				forgotPasswordData.email, 
				resetPasswordData.code, 
				resetPasswordData.new_password
			);
			if (success) {
				await session.initialize();
				switchView('login');
			}
		} finally {
			isLoading.set(false);
		}
	}

    // Utility functions
	function switchView(newView: string) {
		authError.set(null);
		view = newView;
	}

	function openSettings() {
		showSettingsModal = true;
	}

	function closeSettingsModal() {
        showSettingsModal = false;
    }

    function updateFormData(formData: FormData, dataStore: any) {
        for (const key in dataStore) {
            const value = formData.get(key);
            if (value !== null) {
                dataStore[key] = value.toString();
            }
        }
    }
</script>

<h1>PIGEON</h1>

<div class="container">
	{#if view === 'login' || view === 'register'}
		<Tabs
			tabs={[
				{ id: 'login', text: $_('auth.login'), active: view === 'login' },
				{ id: 'register', text: $_('auth.register'), active: view === 'register' }
			]}
			onTabSelect={switchView}
		/>
	{/if}

	{#if $authError}
		<div class="error">{$authError}</div>
	{/if}

		<Form
			active={view === 'login'}
			fields={loginFields}
			onSubmit={handleLogin}
			submit={$isLoading ? $_('auth.loading') : $_('auth.login')}
			disabled={$isLoading}
			/>

		<Form
			active={view === 'register'}
			fields={registerFields}
			onSubmit={handleRegister}
			submit={$isLoading ? $_('auth.registering') : $_('auth.register_button')}
			disabled={$isLoading}
			/>

		<Form
			title={$_('auth.verify_email_title')}
			active={view === 'verifyEmail'}
			fields={verifyFields}
			onSubmit={handleVerify}
			submit={$isLoading ? $_('auth.verifying') : $_('auth.verify')}
			disabled={$isLoading}
			/>

		<Form
			title={$_('auth.password_reset_title')}
			active={view === 'forgotPassword'}
			fields={forgotPasswordFields}
			onSubmit={handleRequestReset}
			submit={$isLoading ? $_('auth.sending') : $_('auth.send_code')}
			disabled={$isLoading}
			/>

		<Form
			title={$_('auth.set_new_password_title')}
			active={view === 'resetPassword'}
			fields={resetPasswordFields}
			onSubmit={handleResetPassword}
			submit={$isLoading ? $_('auth.updating') : $_('auth.reset_password')}
			disabled={$isLoading}
			/>

		{#if view === 'forgotPassword' || view === 'resetPassword'}
			<ClickText
				style="font-size: 0.9rem; align-self: center"
				onClick={() => switchView('login')}
			>
				{$_('auth.back_to_login')}
			</ClickText>
		{:else if view !== 'verifyEmail'}
			<ClickText
				style="font-size: 0.9rem; align-self: center"
				onClick={() => switchView('forgotPassword')}
			>
				{$_('auth.forgot_password')}
			</ClickText>
		{/if}
	</div>

<button class="floating-settings-btn" on:click={openSettings}>
	<Settings size={20} />
</button>

<SettingsModal
	open={showSettingsModal}
	on:close={closeSettingsModal}
	zIndex={1300}
/>

<style>
	.container {
		display: flex;
		flex-direction: column;
        background-image: 
            linear-gradient(var(--surface-glass), var(--surface-glass)),
            linear-gradient(var(--color-bg-elevated), var(--color-bg-elevated));
		padding: 26px;
		border-radius: 12px;
		width: min(90%, 240px);
		transition: var(--transition);
        align-self: center;
	}

	.error {
		color: var(--color-danger);
		margin-bottom: 15px;
		background: var(--color-danger-soft);
		padding: 10px;
		border-radius: 4px;
		border-left: 3px solid var(--color-danger);
		transition: opacity 0.5s;
	}
		
	.error:empty {
		display: none;
	}
	
	h1 {
		text-align: center;
		text-justify: center;
	}

	.floating-settings-btn {
		position: fixed;
		bottom: 20px;
		right: 20px;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--color-accent);
		border: none;
		color: var(--color-button-text);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: all 0.3s ease;
		z-index: 1000;
	}

	.floating-settings-btn:hover {
		transform: scale(1.05);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
	}

	.floating-settings-btn:active {
		transform: scale(0.95);
	}
</style>
