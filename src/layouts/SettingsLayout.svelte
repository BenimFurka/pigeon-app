<script lang="ts">
    import Bar from "../components/ui/Bar.svelte";
    import ClickText from "../components/ui/ClickText.svelte";
    import { useCurrentProfile } from "../queries/profile";
    import { logout } from "../stores/auth";

	export let inSettings: boolean = false;
	
	const profileQuery = useCurrentProfile();
	$: currentProfile = $profileQuery?.data || null;
	
	function handleLogout() {
		if (confirm('Вы уверены, что хотите выйти?')) {
			logout();
		}
	}
</script>

<div class="settings-layout {!inSettings ? 'no-settings' : ''}" id="settings-layout">
	<Bar noCenter={true}>
		Настройки
	</Bar>
    <div class="settings-content">
		<div class="settings-section">
			<h3 class="section-title">Профиль</h3>
			{#if currentProfile}
				<div class="profile-info">
					<div class="profile-item">
						<span class="label">Имя:</span>
						<span class="value">{currentProfile.name}</span>
					</div>
					<div class="profile-item">
						<span class="label">Имя пользователя:</span>
						<span class="value">@{currentProfile.username}</span>
					</div>
					{#if currentProfile.bio}
						<div class="profile-item">
							<span class="label">О себе:</span>
							<span class="value">{currentProfile.bio}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
		
		<div class="settings-section">
			<h3 class="section-title">Внешний вид</h3>
			<ClickText>Тема</ClickText>
		</div>
		
		<div class="settings-section">
			<h3 class="section-title">Аккаунт</h3>
			<ClickText onClick={handleLogout} style="color: #ff4d4d;">
				Выйти из аккаунта
			</ClickText>
		</div>
    </div>
</div>

<style>
	.settings-layout {
		display: flex;
		flex-direction: column;
        position: absolute;
        transform: translate(0%, 0px);

		min-height: 0;
		height: 100%;
		width: 300px;
		
        margin-left: 40px;
		z-index: 1;
   		overflow: hidden;
		background-image: 
			linear-gradient(var(--glass), var(--glass)),
			linear-gradient(var(--secondary-color), var(--secondary-color));

		transition: var(--transition);	
    }

	.settings-content {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
		padding: 20px;
		gap: 24px;
	}

	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-title {
		font-size: 0.9em;
		font-weight: 600;
		color: var(--primary-color);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.profile-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.profile-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.profile-item .label {
		font-size: 0.8em;
		opacity: 0.7;
	}

	.profile-item .value {
		font-size: 0.95em;
		color: var(--text-color);
	}

	.no-settings {
		transform: translate(-100%, 0px);
	}
</style>
