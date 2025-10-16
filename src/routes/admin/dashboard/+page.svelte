<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '../../../lib/supabaseClient';

  let user: any = null;
  let users: any[] = [];
  let orders: any[] = [];
  let loading = true;
  let errorMsg = '';
  let editMode: string | null = null;
  let activeSection: 'users' | 'orders' = 'orders';
  let sidebarOpen = false;
  let modalOpen = false;
  let modalImg = '';

  let editData = {
    full_name: '',
    email: '',
    role: '',
    phone_number: '',
    address: '',
    new_password: ''
  };

  // Statistik ringkasan
  let countCuci = 0;
  let countSetrika = 0;
  let countCuciSetrika = 0;
  let totalUang = 0;
  let totalBelumSiap = 0;
  let totalSiap = 0;

  onMount(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      goto('/login');
      return;
    }

    user = data.user;
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || profile?.role !== 'admin') {
      goto('/user/dashboard');
      return;
    }

    await loadUsers();
    await loadOrders();
  });

  // ================== LOAD DATA ==================
  async function loadUsers() {
    loading = true;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, address, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      errorMsg = 'Gagal memuat data pengguna.';
      console.error(error);
    } else {
      users = data;
    }
    loading = false;
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from('laundry_orders')
      .select(`
        id, kilos, service_type, price, status, payment_method, pickup, created_at, proof_url,
        profiles:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      errorMsg = 'Gagal memuat pesanan.';
    } else {
      orders = data;
      calculateStats();
    }
  }

  // ================== STATISTIK ==================
  function calculateStats() {
    countCuci = orders.filter(o => o.service_type?.toLowerCase() === 'cuci').length;
    countSetrika = orders.filter(o => o.service_type?.toLowerCase() === 'setrika').length;
    countCuciSetrika = orders.filter(
      o => o.service_type?.toLowerCase().includes('cuci') && o.service_type?.toLowerCase().includes('setrika')
    ).length;
    totalUang = orders.reduce((sum, o) => sum + (o.price || 0), 0);
    totalSiap = orders.filter(o => o.status === 'siap').length;
    totalBelumSiap = orders.length - totalSiap;
  }

  // ================== EDIT USER ==================
  function startEdit(u: any) {
    editMode = u.id;
    editData = {
      full_name: u.full_name || '',
      email: u.email || '',
      phone_number: u.phone_number || '',
      address: u.address || '',
      role: u.role || 'user',
      new_password: ''
    };
  }

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editData.full_name,
        email: editData.email,
        role: editData.role,
        phone_number: editData.phone_number,
        address: editData.address
      })
      .eq('id', id);

    if (error) {
      alert('❌ Gagal memperbarui data pengguna.');
      return;
    }

    if (editData.new_password.trim() !== '') {
      const { error: pwErr } = await supabase.auth.admin.updateUserById(id, {
        password: editData.new_password
      });
      if (pwErr) {
        alert('❌ Gagal memperbarui password.');
        return;
      }
    }

    alert('✅ Data berhasil disimpan.');
    editMode = null;
    await loadUsers();
  }

  // ================== UPDATE ORDER STATUS ==================
  async function updateOrderStatus(id: string, newStatus: string) {
    const { error } = await supabase.from('laundry_orders').update({ status: newStatus }).eq('id', id);
    if (error) alert('❌ Gagal memperbarui status.');
    else await loadOrders();
  }

  // ================== DELETE ==================
  async function deleteOrder(id: string) {
    const confirmDelete = confirm('Apakah Anda yakin ingin menghapus pesanan ini?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('laundry_orders').delete().eq('id', id);
    if (error) alert('❌ Gagal menghapus pesanan.');
    else await loadOrders();
  }

  async function deleteUser(id: string) {
    const confirmDelete = confirm('Apakah Anda yakin ingin menghapus pengguna ini? Semua pesanan terkait akan hilang!');
    if (!confirmDelete) return;

    await supabase.from('laundry_orders').delete().eq('user_id', id);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert('❌ Gagal menghapus pengguna.');
    else await loadUsers();
  }

  async function logout() {
    await supabase.auth.signOut();
    goto('/login');
  }

  function openModal(url: string) {
    modalImg = url;
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    modalImg = '';
  }
</script>

<!-- ====================== NAVBAR ====================== -->
<header class="navbar">
  <h1>Admin Dashboard</h1>
  <button class="hamburger" on:click={() => (sidebarOpen = !sidebarOpen)}>☰</button>
</header>

<div class="dashboard">
  <!-- 🔹 Sidebar -->
  <aside class:open={sidebarOpen} class="sidebar">
    <h2>👑 Admin</h2>
    <nav>
      <button class:selected={activeSection === 'users'} on:click={() => (activeSection = 'users')}>👥 Pengguna</button>
      <button class:selected={activeSection === 'orders'} on:click={() => (activeSection = 'orders')}>🧺 Pesanan</button>
      <button class="logout" on:click={logout}>🚪 Logout</button>
    </nav>
  </aside>

  <!-- 🔹 Konten utama -->
  <main class="main-content">
    {#if loading}
      <p>Memuat data...</p>
    {:else if errorMsg}
      <p class="error">{errorMsg}</p>
    {:else if activeSection === 'orders'}
      <section>
        <h2>🧺 Daftar Pesanan Laundry</h2>

        <!-- Cards Ringkasan -->
        <div class="summary-cards">
          <div class="card cuci"><h3>🧼 Cuci</h3><p>{countCuci}</p></div>
          <div class="card setrika"><h3>🧺 Setrika</h3><p>{countSetrika}</p></div>
          <div class="card combo"><h3>💧 Cuci + Setrika</h3><p>{countCuciSetrika}</p></div>
          <div class="card uang"><h3>💰 Total Uang</h3><p>Rp {totalUang.toLocaleString('id-ID')}</p></div>
          <div class="card belum"><h3>⏳ Belum Siap</h3><p>{totalBelumSiap}</p></div>
          <div class="card siap"><h3>✅ Siap</h3><p>{totalSiap}</p></div>
        </div>

        <!-- Tabel Pesanan -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>No</th><th>Nama</th><th>Email</th><th>Layanan</th><th>Kiloan</th>
                <th>Harga</th><th>Bayar</th><th>Jemput</th><th>Status</th><th>Tanggal</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each orders as o, i}
                <tr>
                  <td>{i + 1}</td>
                  <td>{o.profiles?.full_name || '-'}</td>
                  <td>{o.profiles?.email || '-'}</td>
                  <td>{o.service_type}</td>
                  <td>{o.kilos} kg</td>
                  <td>Rp {o.price?.toLocaleString('id-ID')}</td>
                  <td>
                    {#if o.payment_method === 'Transfer' && o.proof_url}
                      <img src={o.proof_url} alt="Bukti Transfer" class="proof-img" on:click={() => openModal(o.proof_url)} />
                    {:else if o.payment_method === 'Transfer'}
                      💳 Transfer
                    {:else}
                      💵 COD
                    {/if}
                  </td>
                  <td>{o.pickup ? '🚗 Dijemput' : '🏠 Antar'}</td>
                  <td><span class="status {o.status}">{o.status}</span></td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <button class="waiting" on:click={() => updateOrderStatus(o.id, 'menunggu')}>Menunggu</button>
                    <button class="process" on:click={() => updateOrderStatus(o.id, 'diproses')}>Diproses</button>
                    <button class="ready" on:click={() => updateOrderStatus(o.id, 'siap')}>Siap</button>
                    <button class="delete" on:click={() => deleteOrder(o.id)}>❌ Hapus</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {:else}
      <section>
        <h2>👥 Daftar Pengguna</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>No</th><th>Nama</th><th>Email</th><th>No. Telepon</th><th>Alamat</th>
                <th>Role</th><th>Tanggal</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each users as u, i}
                <tr>
                  <td>{i + 1}</td>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone_number}</td>
                  <td>{u.address || '-'}</td>
                  <td>{u.role}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {#if editMode === u.id}
                      <div class="edit-form">
                        <input type="text" placeholder="Nama" bind:value={editData.full_name} />
                        <input type="email" placeholder="Email" bind:value={editData.email} />
                        <input type="text" placeholder="No. Telepon" bind:value={editData.phone_number} />
                        <input type="text" placeholder="Alamat" bind:value={editData.address} />
                        <select bind:value={editData.role}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <input type="password" placeholder="Password baru" bind:value={editData.new_password} />
                        <button class="save" on:click={() => saveEdit(u.id)}>💾 Simpan</button>
                        <button class="cancel" on:click={() => (editMode = null)}>❌ Batal</button>
                      </div>
                    {:else}
                      <button class="edit" on:click={() => startEdit(u)}>✏️ Edit</button>
                      <button class="delete" on:click={() => deleteUser(u.id)}>❌ Hapus</button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  </main>

  {#if modalOpen}
    <div class="modal" on:click={closeModal}>
      <img src={modalImg} alt="Bukti Pembayaran Besar" class="modal-img" />
    </div>
  {/if}
</div>

<style>
/* ===== NAVBAR ===== */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #2563eb;
  color: white;
  padding: 0.7rem 1.2rem;
  font-size: 1.2rem;
}
.hamburger { background: none; border: none; color: white; font-size: 1.6rem; cursor: pointer; display: none; }

/* ===== LAYOUT ===== */
.dashboard { display: flex; min-height: calc(100vh - 56px); background: #f8fafc; }
.sidebar { width: 230px; background: linear-gradient(180deg, #1e40af, #3b82f6); color: white; padding: 1.5rem 1rem; transition: transform 0.3s ease; }
.sidebar nav button { display: block; width: 100%; text-align: left; background: transparent; border: none; color: white; padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 0.5rem; }
.sidebar nav button:hover, .sidebar nav button.selected { background: rgba(255, 255, 255, 0.25); }
.sidebar .logout { margin-top: auto; background: #ef4444; color: white; }

.main-content { flex: 1; padding: 1.5rem; overflow-x: auto; }

@media (max-width: 768px) {
  .hamburger { display: block; }
  .sidebar { position: fixed; top: 56px; left: 0; height: 100vh; transform: translateX(-100%); z-index: 1000; }
  .sidebar.open { transform: translateX(0); }
  .main-content { padding: 1rem; }
}

/* ===== CARDS ===== */
.summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.card { background: white; padding: 1rem; text-align: center; border-radius: 12px; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1); }
.cuci { border-top: 4px solid #3b82f6; }
.setrika { border-top: 4px solid #f59e0b; }
.combo { border-top: 4px solid #8b5cf6; }
.uang { border-top: 4px solid #22c55e; }
.belum { border-top: 4px solid #ef4444; }
.siap { border-top: 4px solid #16a34a; }

/* ===== TABLE ===== */
.table-container { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; }
th, td { padding: 0.6rem; text-align: center; border-bottom: 1px solid #e5e7eb; }
th { background: #f3f4f6; }
tr:hover { background: #f9fafb; }

/* BUTTONS */
.waiting { background: #6f42c1; color: white; }
.process { background: #facc15; color: black; }
.ready { background: #0ea5e9; color: white; }
.edit { background: #3b82f6; color: white; }
.delete { background: #ef4444; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 6px; margin-left: 0.3rem; cursor: pointer; }
.delete:hover { background: #dc2626; }

/* STATUS */
.status { padding: 4px 8px; border-radius: 6px; color: white; font-size: 0.9rem; }
.status.menunggu { background: #6f42c1; }
.status.diproses { background: #facc15; color: black; }
.status.siap { background: #22c55e; }

/* BUKTI PEMBAYARAN */
.proof-img {
  max-width: 80px;
  max-height: 80px;
  width: auto;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  object-fit: cover;
  transition: transform 0.2s ease;
}
.proof-img:hover {
  transform: scale(1.2);
  z-index: 10;
}
.modal {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  cursor: pointer;
}

.modal-img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.3);
}

/* EDIT FORM */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.edit-form input,
.edit-form select {
  padding: 0.3rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.edit-form .save {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
}

.edit-form .save:hover {
  background: #2563eb;
}

.edit-form .cancel {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.2rem;
}

.edit-form .cancel:hover {
  background: #dc2626;
}
</style>
