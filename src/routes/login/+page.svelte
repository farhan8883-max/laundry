<script>
  import { supabase } from '../../lib/supabaseClient';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let message = '';
  let loading = false;

  async function login() {
    message = '';
    loading = true;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      message = `❌ ${error.message}`;
      loading = false;
      return;
    }

    const user = data.user;
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profError) {
      message = `⚠️ ${profError.message}`;
      loading = false;
      return;
    }

    if (profile.role === 'admin' || profile.role === 'superadmin') {
      goto('/admin/dashboard');
    } else {
      goto('/user/dashboard');
    }
  }
</script>

<main>
  <div class="card">
    <div class="header">
      <img src="/logo.png" alt="Logo Perusahaan" class="logo" />
      <h2 class="company-name">BlueWash Laundry</h2>
    </div>

    <div class="title">
      <div class="laundry-icon"></div>
      <h1>Login</h1>
    </div>

    <p class="lead">Masuk ke akun Anda untuk melanjutkan.</p>

    {#if message}
      <div class="msg">{message}</div>
    {/if}

    <label>Email</label>
    <input type="email" bind:value={email} placeholder="email@contoh.com" />

    <label>Password</label>
    <input type="password" bind:value={password} placeholder="Password" />

    <button on:click={login} disabled={loading}>
      {loading ? 'Memproses...' : 'Login'}
    </button>

    <p class="footer">
      Belum punya akun? <a href="/register">Daftar</a>
    </p>
  </div>
</main>

<style>
main {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(180deg, #dbeafe, #bfdbfe);
  font-family: 'Inter', system-ui, sans-serif;
}

/* --- Card Container --- */
.card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15);
  padding: 32px;
  text-align: center;
  transition: all 0.3s ease;
}
.card:hover {
  transform: translateY(-3px);
}

/* --- Header Logo --- */
.header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}
.logo {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}
.company-name {
  font-weight: 700;
  font-size: 20px;
  color: #1d4ed8;
  letter-spacing: 0.5px;
}

/* --- Title + Icon --- */
.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}
h1 {
  font-size: 20px;
  color: #1e3a8a;
  margin: 0;
}

/* --- Custom Laundry Icon --- */
.laundry-icon {
  position: relative;
  width: 28px;
  height: 28px;
  border: 3px solid #2563eb;
  border-radius: 6px;
  background: #eff6ff;
  box-shadow: inset 0 0 0 3px #bfdbfe;
}
.laundry-icon::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid #3b82f6;
  background: radial-gradient(circle at 60% 40%, #60a5fa, #1d4ed8);
}
.laundry-icon::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 4px;
  height: 4px;
  background: #1e3a8a;
  border-radius: 50%;
}

/* --- Texts --- */
.lead {
  color: #6b7280;
  font-size: 14px;
  margin-top: 4px;
  margin-bottom: 20px;
}

/* --- Form Elements --- */
label {
  display: block;
  font-size: 13px;
  color: #334155;
  text-align: left;
  margin-top: 10px;
  margin-bottom: 4px;
}
input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  font-size: 14px;
  transition: 0.2s;
}
input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* --- Button --- */
button {
  margin-top: 18px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}
button:hover:not(:disabled) {
  background: linear-gradient(90deg, #1d4ed8, #2563eb);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* --- Message Box --- */
.msg {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #1e3a8a;
  text-align: left;
}

/* --- Footer --- */
.footer {
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  margin-top: 12px;
}
a {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}
a:hover {
  text-decoration: underline;
}
</style>
