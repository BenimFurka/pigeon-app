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
    import type { InputItem } from '../types/components';

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
		console.log(formData);
		console.log(dataStore);
		for (const key in dataStore) {
			const value = formData.get(key);
			if (value !== null) {
				dataStore[key] = value.toString();
			}
		}
	}

	async function handleLogin(event: SubmitEvent) {
		const formData = new FormData(event.target as HTMLFormElement);
		updateFormData(formData, loginData);
		await login(loginData.login, loginData.password);
	}

	async function handleRegister(event: SubmitEvent) {
		const formData = new FormData(event.target as HTMLFormElement);
		updateFormData(formData, registerData);
		const success = await register(
			registerData.username,
			registerData.email,
			registerData.password,
			registerData.display
		);
		if (success) switchView('verifyEmail');
	}

	async function handleVerify(event: SubmitEvent) {
		const formData = new FormData(event.target as HTMLFormElement);
		updateFormData(formData, verifyData);
		await verifyEmail(registerData.email, verifyData.code);
	}

	async function handleRequestReset(event: SubmitEvent) {
		const formData = new FormData(event.target as HTMLFormElement);
		updateFormData(formData, forgotPasswordData);
		const success = await requestPasswordReset(forgotPasswordData.email);
		if (success) switchView('resetPassword');
	}

	async function handleResetPassword(event: SubmitEvent) {
		const formData = new FormData(event.target as HTMLFormElement);
		updateFormData(formData, resetPasswordData);
		await verifyPasswordReset(
			forgotPasswordData.email, 
			resetPasswordData.code, 
			resetPasswordData.new_password
		);
		if (!$authError) switchView('login');
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
		submit="Войти"
	/>

	<Form
		active={view === 'register'}
		fields={registerFields}
		onSubmit={handleRegister}
		submit="Зарегистрироваться"
	/>

	<Form
		title="Проверьте почту и введите код"
		active={view === 'verifyEmail'}
		fields={verifyFields}
		onSubmit={handleVerify}
		submit="Подтвердить"
	/>

	<Form
		title="Восстановление пароля"
		active={view === 'forgotPassword'}
		fields={forgotPasswordFields}
		onSubmit={handleRequestReset}
		submit="Отправить код"
	/>

	<Form
		title="Установка нового пароля"
		active={view === 'resetPassword'}
		fields={resetPasswordFields}
		onSubmit={handleResetPassword}
		submit="Сбросить пароль"
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
		background: var(--glass);
		padding: 26px;
		border-radius: 12px;
		width: min(90%, 240px);
		transition: var(--transition);
        align-self: center;
	}

	.error {
		color: #ff4d4d;
		margin-bottom: 15px;
		background: rgba(255, 77, 77, 0.1);
		padding: 10px;
		border-radius: 4px;
		border-left: 3px solid #ff4d4d;
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
