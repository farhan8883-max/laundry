<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '../../../lib/supabaseClient';

  let user: any = null;
  let profile: any = null;
  let kilos = 0;
  let service_type = 'cuci';
  let price = 0;
  let payment_method = 'COD';
  let pickup = 'Tidak';
  let success = '';
  let errorMsg = '';
  let orders: any[] = [];
  let loading = true;
  let activeTab: 'pesanan' | 'pesan' | 'profil' = 'pesanan';

  // 🔹 Upload proof variables
  let proofFile: File | null = null;
  let proofPreview: string | null = null;
  let ads = ['/gambar1.png', '/gambar2.jpeg', '/gambar3.jpeg'];
  let currentAd = 0;

  // 🔹 Editable profile
  let editingProfile = false;
  let editFullName = '';
  let editPhoneNumber = '';
  let editAddress = ''; // 🏠 Tambahan

  onMount(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      goto('/login');
      return;
    }
    user = data.user;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, address, created_at') // 🏠 tambahkan address
      .eq('id', user.id)
      .single();

    profile = profileData;
    editFullName = profile?.full_name || '';
    editPhoneNumber = profile?.phone_number || '';
    editAddress = profile?.address || ''; // 🏠 isi awal
    await loadOrders();
  });

  onMount(() => {
    const interval = setInterval(() => {
      currentAd = (currentAd + 1) % ads.length;
    }, 5000);
    return () => clearInterval(interval);
  });

  function calculatePrice() {
    switch (service_type) {
      case 'cuci':
        price = kilos * 7000;
        break;
      case 'setrika':
        price = kilos * 6000;
        break;
      case 'cuci+setrika':
        price = kilos * 10000;
        break;
      default:
        price = 0;
    }
    if (pickup === 'Ya') price += 5000;
  }

  function handleProofChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      proofFile = target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        proofPreview = event.target?.result as string;
      };
      reader.readAsDataURL(proofFile);
    }
  }

  async function uploadProof() {
    if (!proofFile || !user) return null;
    const fileExt = proofFile.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `bukti_transfer/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('laundry_proofs')
      .upload(filePath, proofFile, {
        cacheControl: '3600',
        upsert: false
      });
    if (uploadError) {
      errorMsg = '❌ Gagal mengunggah bukti pembayaran.';
      return null;
    }
    const { data } = supabase.storage.from('laundry_proofs').getPublicUrl(filePath);
    return data.publicUrl;
  }

 async function submitLaundry() {
  if (!user) return;
  calculatePrice();

  // 🔹 Validasi profil (alamat & no telepon)
  if (!profile.phone_number || !profile.address) {
    errorMsg = '⚠️ Mohon lengkapi profil Anda terlebih dahulu (isi No. Telepon dan Alamat) sebelum memesan laundry.';
    success = '';
    activeTab = 'profil'; // otomatis pindah ke tab profil
    return;
  }

  // 🔹 Validasi bukti transfer
  if (payment_method === 'Transfer' && !proofFile) {
    errorMsg = 'Mohon unggah bukti pembayaran sebelum mengirim pesanan.';
    success = '';
    return;
  }

  const pickupBool = pickup === 'Ya';
  let uploadedProofUrl = null;

  if (payment_method === 'Transfer' && proofFile) {
    uploadedProofUrl = await uploadProof();
    if (!uploadedProofUrl) return;
  }

  // 🔹 Simpan pesanan ke Supabase
  const { error } = await supabase.from('laundry_orders').insert([
    {
      user_id: user.id,
      kilos,
      service_type,
      price,
      payment_method,
      pickup: pickupBool,
      proof_url: uploadedProofUrl
    }
  ]);

  if (error) {
    errorMsg = '❌ Gagal menyimpan pesanan.';
    success = '';
  } else {
    success = '✅ Pesanan berhasil dikirim!';
    errorMsg = '';
    kilos = 0;
    service_type = 'cuci';
    price = 0;
    payment_method = 'COD';
    pickup = 'Tidak';
    proofFile = null;
    proofPreview = null;
    await loadOrders();
  }
  if (!profile.phone_number || !profile.address) {
    errorMsg = '⚠️ Mohon lengkapi profil Anda terlebih dahulu...';
    activeTab = 'profil';
    return;
}

}


  async function loadOrders() {
    loading = true;
    const { data, error } = await supabase
      .from('laundry_orders')
      .select('id, kilos, service_type, price, status, created_at, payment_method, pickup, proof_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) errorMsg = 'Gagal memuat pesanan.';
    else orders = data;
    loading = false;
  }

  async function logout() {
    await supabase.auth.signOut();
    goto('/login');
  }

  async function saveProfile() {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editFullName,
        phone_number: editPhoneNumber,
        address: editAddress // 🏠 simpan alamat
      })
      .eq('id', user.id);

    if (error) {
      errorMsg = '❌ Gagal menyimpan perubahan profil.';
    } else {
      success = '✅ Profil berhasil diperbarui!';
      profile.full_name = editFullName;
      profile.phone_number = editPhoneNumber;
      profile.address = editAddress; // 🏠 perbarui lokal
      editingProfile = false;
    }
  }
</script>


<main class="dashboard">
  <!-- 🔹 Profile Header -->
  <section class="profile-card">
    <div class="header">
      <div class="avatar"><span>🧺</span></div>
      <div class="info">
        <h2>{profile ? profile.full_name : 'Loading...'}</h2>
        <p>{profile ? profile.email : ''}</p>
      </div>
    </div>
    <button class="logout" on:click={logout}>Logout</button>
  </section>

  <!-- 🔹 Tabs -->
  <div class="nav-tabs">
    <button class:active={activeTab === 'pesanan'} on:click={() => (activeTab = 'pesanan')}>🧾 Pesanan</button>
    <button class:active={activeTab === 'pesan'} on:click={() => (activeTab = 'pesan')}>💬 Riwayat Pesanan</button>
    <button class:active={activeTab === 'profil'} on:click={() => (activeTab = 'profil')}>👤 Profil Saya</button>
  </div>

  <section class="main-content">
    {#if activeTab === 'pesanan'}
      <!-- 🧾 Form Pesanan -->
      <div class="laundry-card">
        <section class="ads-banner">
          <img src={ads[currentAd]} alt="Iklan Laundry" class="ads-img" />
        </section>
        <h1>🧼 Laundry Order</h1>
        {#if success}<p class="alert success">{success}</p>{/if}
        {#if errorMsg}<p class="alert error">{errorMsg}</p>{/if}

        <form on:submit|preventDefault={submitLaundry}>
          <div class="form-group">
            <label>Berat (kg)</label>
            <input type="number" bind:value={kilos} min="1" on:input={calculatePrice} required />
          </div>

          <div class="form-group">
            <label>Jenis Layanan</label>
            <select bind:value={service_type} on:change={calculatePrice}>
              <option value="cuci">Cuci</option>
              <option value="setrika">Setrika</option>
              <option value="cuci+setrika">Cuci + Setrika</option>
            </select>
          </div>

          <div class="form-group">
            <label>Metode Pembayaran</label>
            <select bind:value={payment_method} on:change={calculatePrice}>
              <option value="COD">COD (Bayar di Tempat)</option>
              <option value="Transfer">Transfer (QRIS)</option>
            </select>
          </div>

          {#if payment_method === 'Transfer'}
            <div class="form-group qris-section">
              <label>Scan QRIS untuk Transfer</label>
              <img src="/qr.png" alt="QRIS" class="qris-image" />
              <small>Setelah transfer, unggah bukti di bawah ini:</small>
              <input type="file" accept="image/*" on:change={handleProofChange} />
              {#if proofPreview}
                <div class="preview-section">
                  <p>📸 Pratinjau Bukti Transfer:</p>
                  <img src={proofPreview} alt="Preview Bukti" class="preview-img" />
                </div>
              {/if}
            </div>
          {/if}

          <div class="form-group">
            <label>Perlu Jemput Laundry?</label>
            <select bind:value={pickup} on:change={calculatePrice}>
              <option value="Tidak">Tidak</option>
              <option value="Ya">Ya (Tambah Rp 5.000)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Total Harga</label>
            <input type="text" value={`Rp ${price.toLocaleString('id-ID')}`} readonly />
          </div>

          <button type="submit" class="submit-btn">Kirim Pesanan</button>
        </form>
      </div>
    {/if}

    {#if activeTab === 'pesan'}
      <!-- 💬 Riwayat Pesanan -->
      <div class="orders-card">
        <h2>📋 Riwayat Pesanan</h2>
        {#if loading}
          <p class="info">Memuat pesanan...</p>
        {:else if orders.length === 0}
          <p class="info">Belum ada pesanan laundry.</p>
        {:else}
          <div class="orders-list">
            {#each orders as o}
              <div class="order-item">
                <div class="order-top">
                  <h3>{o.service_type}</h3>
                  <span class="status {o.status}">{o.status}</span>
                </div>
                <p>{o.kilos} kg • Rp {o.price?.toLocaleString('id-ID')}</p>
                <p><strong>Pembayaran:</strong> {o.payment_method}</p>
                <p><strong>Jemput:</strong> {o.pickup}</p>
                <small>{new Date(o.created_at).toLocaleDateString()}</small>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if activeTab === 'profil' && profile}
      <!-- 👤 Profil Saya -->
      <div class="profile-detail-card">
        <h2>👤 Profil Saya</h2>

        {#if !editingProfile}
          <ul class="profile-info">
            <li><strong>Nama:</strong> {profile.full_name}</li>
            <li><strong>Email:</strong> {profile.email}</li>
            <li><strong>No. Telepon:</strong> {profile.phone_number || '-'}</li>
            <li><strong>Alamat:</strong> {profile.address || '-'}</li> <!-- 🏠 tampilkan alamat -->
            <li><strong>Bergabung:</strong> {new Date(profile.created_at).toLocaleDateString()}</li>
          </ul>
          <button class="submit-btn" on:click={() => (editingProfile = true)}>Edit Profil</button>
        {:else}
          <div class="form-group">
            <label>Nama Lengkap</label>
            <input type="text" bind:value={editFullName} />
          </div>

          <div class="form-group">
            <label>No. Telepon</label>
            <input type="text" bind:value={editPhoneNumber} />
          </div>

           <div class="form-group">
            <label>Alamat</label>
            <textarea bind:value={editAddress} rows="3"></textarea> <!-- 🏠 input alamat -->
          </div>

          <button class="submit-btn" on:click={saveProfile}>Simpan</button>
          <button class="logout" on:click={() => (editingProfile = false)}>Batal</button>
        {/if}
      </div>
    {/if}
  </section>
</main>

<style>
  /* 🌿 Reset & Global */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Poppins', sans-serif;
    background: #f8fafc;
    color: #1e293b;
  }

  main.dashboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    gap: 2rem;
  }

  /* 🔹 Profile Card */
  .profile-card {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    border-radius: 20px;
    padding: 1.5rem 2rem;
    width: 100%;
    max-width: 500px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: white;
    color: #2563eb;
    font-size: 1.8rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .info h2 {
    font-size: 1.2rem;
    font-weight: 600;
  }

  .info p {
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .logout {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: 0.3s;
  }

  .logout:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* 🔹 Navigation Tabs */
  .nav-tabs {
    display: flex;
    justify-content: center;
    gap: 1rem;
    width: 100%;
    max-width: 500px;
  }

  .nav-tabs button {
    flex: 1;
    padding: 0.8rem;
    border-radius: 12px;
    border: none;
    background: #e2e8f0;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .nav-tabs button.active {
    background: #2563eb;
    color: white;
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4);
  }

  /* 🔹 Content Sections */
  .main-content {
    width: 100%;
    max-width: 500px;
  }

  .laundry-card,
  .orders-card,
  .profile-detail-card {
    background: white;
    border-radius: 20px;
    padding: 1.5rem;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
    animation: fadeIn 0.4s ease;
  }

  .laundry-card h1,
  .orders-card h2,
  .profile-detail-card h2 {
    margin-bottom: 1rem;
    color: #2563eb;
    font-size: 1.3rem;
    font-weight: 600;
  }

  /* 🔹 Forms */
  .form-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
  }

  label {
    font-weight: 500;
    margin-bottom: 0.4rem;
  }

  input,
  select {
    padding: 0.8rem;
    border-radius: 10px;
    border: 1px solid #cbd5e1;
    font-size: 0.95rem;
    transition: border 0.3s ease;
  }

  input:focus,
  select:focus {
    border-color: #2563eb;
    outline: none;
  }

  .submit-btn {
    width: 100%;
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.9rem;
    font-weight: 600;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .submit-btn:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  /* 🔹 Alerts */
  .alert {
    border-radius: 10px;
    padding: 0.7rem 1rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }

  .alert.success {
    background: #dcfce7;
    color: #166534;
  }

  .alert.error {
    background: #fee2e2;
    color: #b91c1c;
  }

  /* 🔹 Riwayat Pesanan (Cards Grid) */
  .orders-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 480px) {
    .orders-list {
      grid-template-columns: 1fr 1fr;
    }
  }

  .order-item {
    background: #f8fafc;
    border-radius: 15px;
    padding: 1rem;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    border-left: 5px solid #2563eb;
    transition: transform 0.2s ease, box-shadow 0.3s ease;
  }

  .order-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
  }

  .order-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .order-top h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }

  .status {
    padding: 0.2rem 0.6rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status.menunggu {
    background: #fef3c7;
    color: #92400e;
  }

  .status.diproses {
    background: #dbeafe;
    color: #1e40af;
  }

  .status.siap {
    background: #dcfce7;
    color: #166534;
  }

  .order-item p {
    font-size: 0.9rem;
    margin: 0.2rem 0;
  }

  .order-item small {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #64748b;
  }

  /* 🔹 Profil Detail */
  .profile-info {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.95rem;
  }

  .profile-info li strong {
    width: 110px;
    display: inline-block;
  }

  /* 🔹 Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .qris-section {
  background: #f1f5f9;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  text-align: center;
}

.qris-image {
  width: 180px;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.preview-section {
  margin-top: 0.5rem;
  background: #fff;
  padding: 0.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.preview-img {
  width: 100%;
  max-width: 250px;
  border-radius: 10px;
  margin-top: 0.3rem;
}
.ads-banner {
  width: 100%;
  max-width: 500px;
  margin: 1rem auto;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0,0,0,0.05);
}

.ads-img {
  width: 100%;
  height: auto;
  display: block;
  transition: opacity 0.5s ease-in-out;
}
textarea {
  padding: 0.8rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
  resize: vertical;
}

</style>

