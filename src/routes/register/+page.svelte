<script>
  import { supabase } from "$lib/supabaseClient";

  let full_name = "";
  let email = "";
  let phone_number = "";
  let password = "";
  let loading = false;
  let message = "";

  async function handleRegister(e) {
    e.preventDefault();
    loading = true;
    message = "";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, phone_number },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      message = error.message;
    } else {
      message = "✅ Pendaftaran berhasil! Silakan cek email kamu untuk verifikasi.";
      full_name = email = phone_number = password = "";
    }

    loading = false;
  }
</script>

<style>
  body {
    margin: 0;
    font-family: Arial, sans-serif;
    background: #f4f6f8;
  }

  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }

  form {
    background: #fff;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
  }

  h2 {
    text-align: center;
    color: #333;
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.3rem;
    font-weight: 600;
    color: #333;
  }

  input {
    width: 100%;
    padding: 0.7rem;
    margin-bottom: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: #007bff;
  }

  button {
    width: 100%;
    padding: 0.8rem;
    background-color: #007bff;
    border: none;
    color: white;
    font-size: 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: 0.2s;
  }

  button:hover {
    background-color: #005dc0;
  }

  button:disabled {
    background-color: #999;
    cursor: not-allowed;
  }

  .message {
    text-align: center;
    margin-top: 1rem;
    color: #333;
  }
</style>

<div class="container">
  <form on:submit={handleRegister}>
    <h2>Daftar Akun</h2>

    <label for="full_name">Nama Lengkap</label>
    <input
      id="full_name"
      type="text"
      placeholder="Nama Lengkap"
      bind:value={full_name}
      required
    />

    <label for="email">Email</label>
    <input
      id="email"
      type="email"
      placeholder="email@example.com"
      bind:value={email}
      required
    />

    <label for="phone">Nomor Telepon</label>
    <input
      id="phone"
      type="text"
      placeholder="08123456789"
      bind:value={phone_number}
    />

    <label for="password">Password</label>
    <input
      id="password"
      type="password"
      placeholder="********"
      bind:value={password}
      required
    />

    <button type="submit" disabled={loading}>
      {loading ? "Mendaftar..." : "Daftar"}
    </button>

    {#if message}
      <p class="message">{message}</p>
    {/if}
  </form>
</div>
