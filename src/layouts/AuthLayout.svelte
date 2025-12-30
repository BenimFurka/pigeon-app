<script lang="ts">
	import Tabs from '../components/ui/tab/Tabs.svelte';
	import Form from '../components/ui/Form.svelte';
	import ClickText from '../components/ui/ClickText.svelte';
	import {
		login,
		register,
		verifyEmail,
		requestPasswordReset,
		verifyPasswordReset,
		authError
	} from '../stores/auth';
	import { writable } from 'svelte/store';
	import type { InputItem } from '../types/components';

	const isLoading = writable(false);

	let view = 'login';

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

	let loginFields: InputItem[] = [
		{ 
			id: 'login', 
			label: 'Email или имя пользователя', 
			type: 'text', 
			required: true 
		},
		{ 
			id: 'password', 
			label: 'Пароль', 
			type: 'password', 
			required: true 
		}
	];

	let registerFields: InputItem[] = [
		{ 
			id: 'display', 
			label: 'Отображаемое имя', 
			type: 'text' 
		},
		{ 
			id: 'username', 
			label: 'Имя пользователя', 
			type: 'text', 
			required: true 
		},
		{ 
			id: 'email', 
			label: 'Email', 
			type: 'email', 
			required: true 
		},
		{ 
			id: 'password', 
			label: 'Пароль', 
			type: 'password', 
			required: true 
		}
	];

	let verifyFields: InputItem[] = [
		{ 
			id: 'code', 
			label: 'Код из письма', 
			type: 'text', 
			required: true 
		}
	];

	let forgotPasswordFields: InputItem[] = [
		{ 
			id: 'email', 
			label: 'Введите ваш Email', 
			type: 'email', 
			required: true 
		}
	];

	let resetPasswordFields: InputItem[] = [
		{ 
			id: 'code', 
			label: 'Код из письма', 
			type: 'text', 
			required: true 
		},
		{ 
			id: 'new_password', 
			label: 'Новый пароль', 
			type: 'password', 
			required: true 
		}
	];

	function updateFormData(formData: FormData, dataStore: any) {
		for (const key in dataStore) {
			const value = formData.get(key);
			if (value !== null) {
				dataStore[key] = value.toString();
			}
		}
	}

	async function handleLogin(event: SubmitEvent) {
		if ($isLoading) return;
		isLoading.set(true);
		try {
			const formData = new FormData(event.target as HTMLFormElement);
			updateFormData(formData, loginData);
			await login(loginData.login, loginData.password);
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
			await verifyPasswordReset(
				forgotPasswordData.email, 
				resetPasswordData.code, 
				resetPasswordData.new_password
			);
			if (!$authError) switchView('login');
		} finally {
			isLoading.set(false);
		}
	}

	function switchView(newView: string) {
		authError.set(null);
		view = newView;
	}
</script>

<h1>PIGEON</h1>

<div class="container">
	{#if view === 'login' || view === 'register'}
		<Tabs
			tabs={[
				{ id: 'login', text: 'Вход', active: view === 'login' },
				{ id: 'register', text: 'Регистрация', active: view === 'register' }
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
		submit={$isLoading ? 'Загрузка...' : 'Войти'}
		disabled={$isLoading}
	/>

	<Form
		active={view === 'register'}
		fields={registerFields}
		onSubmit={handleRegister}
		submit={$isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
		disabled={$isLoading}
	/>

	<Form
		title="Проверьте почту и введите код"
		active={view === 'verifyEmail'}
		fields={verifyFields}
		onSubmit={handleVerify}
		submit={$isLoading ? 'Проверка...' : 'Подтвердить'}
		disabled={$isLoading}
	/>

	<Form
		title="Восстановление пароля"
		active={view === 'forgotPassword'}
		fields={forgotPasswordFields}
		onSubmit={handleRequestReset}
		submit={$isLoading ? 'Отправка...' : 'Отправить код'}
		disabled={$isLoading}
	/>

	<Form
		title="Установка нового пароля"
		active={view === 'resetPassword'}
		fields={resetPasswordFields}
		onSubmit={handleResetPassword}
		submit={$isLoading ? 'Обновление...' : 'Сбросить пароль'}
		disabled={$isLoading}
	/>

	{#if view === 'forgotPassword' || view === 'resetPassword'}
		<ClickText
			style="font-size: 0.8rem; align-self: center"
			onClick={() => switchView('login')}
		>
			Назад ко входу
		</ClickText>
	{:else if view !== 'verifyEmail'}
		<ClickText
			style="font-size: 0.8rem; align-self: center"
			onClick={() => switchView('forgotPassword')}
		>
			Забыли пароль?
		</ClickText>
	{/if}
</div>

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
</style>
