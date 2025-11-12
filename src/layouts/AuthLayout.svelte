<script lang="ts">
	import Tabs from '../components/ui/tab/Tabs.svelte';
	import Form from '../components/ui/auth/Form.svelte';
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

	let loginFields: InputItem[] = [
		{ id: 'login', label: 'Email или имя пользователя', type: 'text', required: true, value: '' },
		{ id: 'password', label: 'Пароль', type: 'password', required: true, value: '' }
	];

	let registerFields: InputItem[] = [
		{ id: 'display', label: 'Отображаемое имя', type: 'text', value: '' },
		{ id: 'username', label: 'Имя пользователя', type: 'text', required: true, value: '' },
		{ id: 'email', label: 'Email', type: 'email', required: true, value: '' },
		{ id: 'password', label: 'Пароль', type: 'password', required: true, value: '' }
	];

	let verifyFields: InputItem[] = [
		{ id: 'code', label: 'Код из письма', type: 'text', required: true, value: '' }
	];

	let forgotPasswordFields: InputItem[] = [
		{ id: 'email', label: 'Введите ваш Email', type: 'email', required: true, value: '' }
	];

	let resetPasswordFields: InputItem[] = [
		{ id: 'code', label: 'Код из письма', type: 'text', required: true, value: '' },
		{ id: 'new_password', label: 'Новый пароль', type: 'password', required: true, value: '' }
	];

	function getValue(fields: InputItem[], id: string) {
		return fields.find(f => f.id === id)?.value || '';
	}

	async function handleLogin() {
		await login(getValue(loginFields, 'login'), getValue(loginFields, 'password'));
	}

	async function handleRegister() {
		const success = await register(
		getValue(registerFields, 'username'),
		getValue(registerFields, 'email'),
		getValue(registerFields, 'password'),
		getValue(registerFields, 'display')
		);
		if (success) switchView('verifyEmail');
	}

	async function handleVerify() {
		const email = getValue(registerFields, 'email');
		await verifyEmail(email, getValue(verifyFields, 'code'));
	}

	async function handleRequestReset() {
		const success = await requestPasswordReset(getValue(forgotPasswordFields, 'email'));
		if (success) switchView('resetPassword');
	}

	async function handleResetPassword() {
		const email = getValue(forgotPasswordFields, 'email');
		await verifyPasswordReset(email, getValue(resetPasswordFields, 'code'), getValue(resetPasswordFields, 'new_password'));
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
			style="font-size: 0.8rem;"
			onClick={() => switchView('login')}
		>
			Назад ко входу
		</ClickText>
	{:else if view !== 'verifyEmail'}
		<ClickText
			style="font-size: 0.8rem;"
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
		padding: 25px;
		border-radius: 12px;
		width: min(90%, 240px);
		transition: var(--transition);
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
