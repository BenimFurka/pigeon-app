<script>
  import Tabs from '../components/ui/tab/Tabs.svelte';
  import Form from '../components/ui/auth/Form.svelte';

  let activeTab = 'login';
  let isVerificationVisible = false;
  let isResetVerificationVisible = false;

  function switchTab(tabId) {
    activeTab = tabId;
  }

  function handleLoginSubmit(event) {
    console.log('типа вошёл');
  }

  function handleRegisterSubmit(event) {
    console.log('непрвильноеы данные');
  }

  function showVerification() {
    isVerificationVisible = true;
  }

  function showResetVerification() {
    isResetVerificationVisible = true;
  }
</script>


<h1>PIGEON</h1>

<div class="container">
  <Tabs
    tabs={[
      { id: 'login', text: 'Вход', active: activeTab === 'login' },
      { id: 'register', text: 'Регистрация', active: activeTab === 'register' }
    ]}
    onTabSelect={switchTab}
  />

  <div id="error-message" class="error"></div>

  <Form
    active={activeTab === 'login'}
    fields={[
      { id: 'login', label: 'Email или имя пользователя', type: 'text', required: true },
      { id: 'login-password', label: 'Пароль', type: 'password', required: true }
    ]}
    onSubmit={handleLoginSubmit}
    sumbit="Войти"
  />

  <Form
    active={activeTab === 'register'}
    fields={[
      { id: 'display-name', label: 'Отображаемое имя', type: 'text' },
      { id: 'username', label: 'Имя пользователя', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'password', label: 'Пароль', type: 'password', required: true }
    ]}
    onSubmit={handleRegisterSubmit}
    sumbit="Зарегестрироваться"
  />

  <Form
    title="Проверьте почту и введите код"
    active={isVerificationVisible}
    fields={[
      { id: 'verification-code', label: 'Код', type: 'text', placeholder: 'Введите код', maxlength: 6 }
    ]}
    onSubmit={showVerification}
  />

  <Form
    title="Восстановление пароля"
    active={false}
    fields={[
      { id: 'reset-email', label: 'Введите ваш Email', type: 'email', required: true }
    ]}
    onSubmit={() => console.log('Сброс пароля')}
  />

  <Form
    title="Проверьте почту и введите код"
    active={isResetVerificationVisible}
    fields={[
      { id: 'reset-verification-code', label: 'Код', type: 'text', placeholder: 'Введите код', maxlength: 6 },
      { id: 'new-password', label: 'Новый пароль', type: 'password', required: true }
    ]}
    onSubmit={showResetVerification}
  />
</div>

<style>


  .container {
      background: var(--glass);
      padding: 25px;
      border-radius: 12px;
      width: min(90%, 320px);
      transition: var(--transition);
  }
  

  .error:empty {
      display: none;
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
  h1 {
    text-align: center;
  }
</style>
