<script>
  import { supabase } from '../lib/supabaseClient'

  let email = ''
  let password = ''
  let full_name = ''
  let message = ''
  let editData = { full_name: '', email: '', role: '', phone_number: '', new_password: '' };


  async function register() {
    message = 'Registering...'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name }
      }
    })

    if (error) {
      message = `Error: ${error.message}`
    } else {
      message = 'Registration successful! Check your email to verify.'
    }
  }
</script>

<main class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
  <div class="bg-white p-8 rounded-2xl shadow-md w-96">
    <h1 class="text-2xl font-bold mb-6 text-center">Register</h1>

    <input
      type="text"
      placeholder="Full Name"
      bind:value={full_name}
      class="border rounded-lg p-2 w-full mb-3"
    />
    <input
      type="email"
      placeholder="Email"
      bind:value={email}
      class="border rounded-lg p-2 w-full mb-3"
    />
    <input
      type="password"
      placeholder="Password"
      bind:value={password}
      class="border rounded-lg p-2 w-full mb-4"
    />
    <button
      on:click={register}
      class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg w-full"
    >
      Register
    </button>

    <p class="text-sm mt-4 text-center text-gray-600">{message}</p>
    <a href="/login" class="block mt-3 text-blue-600 text-center hover:underline">Sudah punya akun?</a>
  </div>
</main>
