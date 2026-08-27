from pathlib import Path

code = r"""/* =========================================================
   DOMPET HARRY - app.js
   VERSION BERSIH & DIPERBAIKI

   Perbaikan:
   - Duplikasi kode dihapus
   - Dropdown bulan/tahun dapat berpindah dengan benar
   - Transaksi bulan lama tetap dapat dilihat
   - Grafik 7 hari membaca 7 hari kalender terakhir
   - Bubble mengikuti ujung batang
   - Event grafik tidak menumpuk setiap render
   - Backup/Restore terenkripsi tetap dipertahankan
   - PIN 6 digit tetap dipertahankan
   ========================================================= */

const KEY = 'dompet_harry_v1';

let data = [];

/* =========================================================
   LOAD DATA
   ========================================================= */

try {
  data = JSON.parse(localStorage.getItem(KEY) || '[]');

  if (!Array.isArray(data)) {
    data = [];
  }
} catch (e) {
  console.error('Gagal membaca data Dompet Harry:', e);
  data = [];
}

/* =========================================================
   HELPER
   ========================================================= */

const pad = n =>
  String(n).padStart(2, '0');

const today = () => {
  const d = new Date();

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const monthKey = d =>
  String(d).slice(0, 7);

const money = n =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(n) || 0);

const monthName = k => {
  const [y, m] = String(k).split('-');

  return new Date(
    Number(y),
    Number(m) - 1,
    1
  ).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric'
  });
};

function save() {
  localStorage.setItem(
    KEY,
    JSON.stringify(data)
  );
}

/* =========================================================
   DAFTAR BULAN YANG TERSEDIA
   ========================================================= */

function months() {
  const s = new Set();

  for (const x of data) {
    if (!x || !x.date) continue;

    const raw = String(x.date).trim();
    const key = raw.slice(0, 7);

    if (/^\d{4}-\d{2}$/.test(key)) {
      s.add(key);
    }
  }

  /* Bulan berjalan selalu tersedia. */
  s.add(monthKey(today()));

  return [...s].sort().reverse();
}

/* =========================================================
   SETUP DROPDOWN BULAN
   ========================================================= */

function setup(preserveMonth = true) {
  const s = document.getElementById('month');

  if (!s) return;

  const current = s.value;
  const list = months();

  const optionHTML = list
    .map(x =>
      `<option value="${x}">${monthName(x)}</option>`
    )
    .join('');

  if (s.innerHTML !== optionHTML) {
    s.innerHTML = optionHTML;
  }

  if (
    preserveMonth &&
    current &&
    list.includes(current)
  ) {
    s.value = current;
  } else if (
    s.value &&
    list.includes(s.value)
  ) {
    /* Pertahankan nilai yang sudah dipilih. */
  } else {
    s.value = monthKey(today());
  }

  const dateInput =
    document.getElementById('date');

  if (
    dateInput &&
    !dateInput.value
  ) {
    dateInput.value = today();
  }
}

/* =========================================================
   RENDER UTAMA
   ========================================================= */

function render() {
  const monthSelect =
    document.getElementById('month');

  /*
     Simpan bulan yang sedang dipilih.
     Jangan langsung kembali ke bulan berjalan.
  */
  const selectedMonth =
    monthSelect &&
    monthSelect.value
      ? monthSelect.value
      : monthKey(today());

  setup(true);

  const availableMonths = months();

  const mk =
    availableMonths.includes(selectedMonth)
      ? selectedMonth
      : monthKey(today());

  if (monthSelect) {
    monthSelect.value = mk;
  }

  const r = data.filter(x =>
    monthKey(String(x.date)) === mk
  );

  const debit = r
    .filter(x => x.type === 'debit')
    .reduce(
      (a, x) =>
        a + (Number(x.amount) || 0),
      0
    );

  const credit = r
    .filter(x => x.type === 'credit')
    .reduce(
      (a, x) =>
        a + (Number(x.amount) || 0),
      0
    );

  const expense =
    document.getElementById('expense');

  const income =
    document.getElementById('income');

  const balance =
    document.getElementById('balance');

  if (expense) {
    expense.textContent = money(debit);
  }

  if (income) {
    income.textContent = money(credit);
  }

  if (balance) {
    balance.textContent =
      money(credit - debit);
  }

  /* =====================================================
     5 TRANSAKSI TERBARU BULAN TERPILIH
     ===================================================== */

  const recent = [...r]
    .sort(
      (a, b) =>
        String(b.date).localeCompare(
          String(a.date)
        ) ||
        (Number(b.created) || 0) -
        (Number(a.created) || 0)
    )
    .slice(0, 5);

  const transactions =
    document.getElementById(
      'transactions'
    );

  if (transactions) {
    transactions.innerHTML =
      recent.length
        ? recent.map(tx).join('')
        : '<div class="empty">Belum ada transaksi bulan ini.</div>';
  }

  renderHistory();
  drawChart();
}

/* =========================================================
   TEMPLATE TRANSAKSI
   ========================================================= */

function tx(x) {
  const safeId =
    String(x.id)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");

  return `
<div class="tx">

  <div class="cat">
    ${String(x.cat || '📦').split(' ')[0]}
  </div>

  <div class="txmain">

    <b>${esc(x.desc)}</b>

    <span>
      ${esc(x.cat || '📦 Lainnya')}
      •
      ${formatDate(x.date)}
    </span>

  </div>

  <div class="money ${x.type === 'debit' ? 'red' : 'green'}">
    ${x.type === 'debit' ? '-' : '+'}${money(x.amount)}
  </div>

  <button
    class="del"
    onclick="delTx('${safeId}')">
    ✕
  </button>

</div>
`;
}

/* =========================================================
   FORMAT TANGGAL
   ========================================================= */

function formatDate(value) {
  const raw = String(value || '');

  let d;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    d = new Date(raw + 'T00:00:00');
  } else {
    d = new Date(raw);
  }

  if (Number.isNaN(d.getTime())) {
    return esc(raw);
  }

  return d.toLocaleDateString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  );
}

/* =========================================================
   TAMBAH TRANSAKSI
   ========================================================= */

function addTx(e) {
  if (e) {
    e.preventDefault();
  }

  const amountEl =
    document.getElementById('amount');

  const descEl =
    document.getElementById('desc');

  const dateEl =
    document.getElementById('date');

  const typeEl =
    document.getElementById('type');

  const catEl =
    document.getElementById('cat');

  if (
    !amountEl ||
    !descEl ||
    !dateEl ||
    !typeEl ||
    !catEl
  ) {
    alert(
      'Form transaksi tidak ditemukan. Periksa index.html.'
    );
    return;
  }

  const a =
    Number(amountEl.value);

  if (!Number.isFinite(a) || a <= 0) {
    toast('Nominal tidak valid');
    return;
  }

  const description =
    descEl.value.trim();

  if (!description) {
    toast('Keterangan belum diisi');
    descEl.focus();
    return;
  }

  const date =
    dateEl.value || today();

  const type =
    typeEl.value === 'credit'
      ? 'credit'
      : 'debit';

  const category =
    catEl.value || '📦 Lainnya';

  let id;

  if (
    window.crypto &&
    typeof crypto.randomUUID === 'function'
  ) {
    id = crypto.randomUUID();
  } else {
    id =
      String(Date.now()) +
      '-' +
      Math.random()
        .toString(36)
        .slice(2);
  }

  data.push({
    id,
    date,
    desc: description,
    type,
    cat: category,
    amount: a,
    created: Date.now()
  });

  save();

  toast('Transaksi disimpan');

  resetForm();

  /*
     Setelah transaksi baru dibuat,
     tampilkan bulan dari tanggal transaksi.
  */
  const monthSelect =
    document.getElementById('month');

  if (monthSelect) {
    monthSelect.value =
      monthKey(date);
  }

  render();
}

/* =========================================================
   RESET FORM
   ========================================================= */

function resetForm() {
  const desc =
    document.getElementById('desc');

  const amount =
    document.getElementById('amount');

  const date =
    document.getElementById('date');

  if (desc) desc.value = '';
  if (amount) amount.value = '';
  if (date) date.value = today();
}

/* =========================================================
   TYPE DEBIT / CREDIT
   ========================================================= */

function setType(t) {
  const type =
    document.getElementById('type');

  if (type) {
    type.value =
      t === 'credit'
        ? 'credit'
        : 'debit';
  }

  const add =
    document.getElementById('add');

  if (add) {
    add.scrollIntoView({
      behavior: 'smooth'
    });
  }
}

/* =========================================================
   HAPUS TRANSAKSI
   ========================================================= */

function delTx(id) {
  const x = data.find(
    a =>
      String(a.id) === String(id)
  );

  if (
    !x
  ) {
    return;
  }

  if (
    confirm(
      `Hapus ${x.desc} sebesar ${money(x.amount)}?`
    )
  ) {
    data = data.filter(
      a =>
        String(a.id) !== String(id)
    );

    save();

    toast('Transaksi dihapus');

    render();
  }
}

/* =========================================================
   CHART 7 HARI
   ========================================================= */

function drawChart() {
  const chart =
    document.getElementById('chart');

  if (!chart) return;

  const days = [];

  const dayNames = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu'
  ];

  /*
     Grafik selalu mengambil 7 hari kalender terakhir:
     hari ini + 6 hari sebelumnya.

     Dropdown bulan TIDAK mempengaruhi grafik.
  */

  const base =
    new Date();

  base.setHours(
    0, 0, 0, 0
  );

  for (let i = 6; i >= 0; i--) {
    const d =
      new Date(base);

    d.setDate(
      d.getDate() - i
    );

    const k =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const amount =
      data
        .filter(x => {
          if (
            !x ||
            x.type !== 'debit' ||
            x.date == null
          ) {
            return false;
          }

          const raw =
            String(x.date)
              .trim();

          /*
             Ambil 10 karakter pertama.
             Ini mendukung:
             YYYY-MM-DD
             YYYY-MM-DDTHH:mm:ss
          */
          return raw.slice(0, 10) === k;
        })
        .reduce(
          (sum, x) =>
            sum +
            (Number(x.amount) || 0),
          0
        );

    days.push({
      date: k,
      amount,
      day:
        dayNames[d.getDay()],
      dateLabel:
        `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
    });
  }

  const max =
    Math.max(
      ...days.map(
        x => x.amount
      ),
      1
    );

  const weekTotal =
    document.getElementById(
      'weekTotal'
    );

  if (weekTotal) {
    weekTotal.textContent =
      money(
        days.reduce(
          (a, b) =>
            a + b.amount,
          0
        )
      );
  }

  chart.innerHTML =
    days
      .map(
        (x, index) => `
<div
  class="chartItem"
  data-index="${index}"
>

  <div class="chartBarWrap">

    <div
      class="bar"
      data-index="${index}"
      style="height:${Math.max(
        7,
        (x.amount / max) * 100
      )}%"
    ></div>

    <div
      class="chartBubble"
      data-bubble="${index}"
    >

      <div class="bubbleDay">
        ${esc(x.day)}
      </div>

      <div class="bubbleDate">
        ${formatDate(x.date)}
      </div>

      <div class="bubbleDivider"></div>

      <div class="bubbleTitle">
        Pengeluaran
      </div>

      <div class="bubbleAmount">
        ${money(x.amount)}
      </div>

    </div>

  </div>

  <div class="chartLabel">
    <b>${esc(x.day.slice(0, 3))}</b>
    ${esc(x.dateLabel)}
  </div>

</div>
`
      )
      .join('');

  /* =====================================================
     EVENT BATANG
     ===================================================== */

  chart
    .querySelectorAll('.bar')
    .forEach(bar => {
      bar.addEventListener(
        'click',
        function (e) {
          e.stopPropagation();

          const index =
            this.dataset.index;

          const bubble =
            chart.querySelector(
              `.chartBubble[data-bubble="${index}"]`
            );

          if (!bubble) return;

          /*
             Tutup bubble lain.
          */
          chart
            .querySelectorAll(
              '.chartBubble'
            )
            .forEach(b => {
              if (
                b !== bubble
              ) {
                b.classList.remove(
                  'show'
                );

                b.style.left = '';
                b.style.bottom = '';
              }
            });

          /*
             Hapus selected dari batang lain.
          */
          chart
            .querySelectorAll(
              '.bar'
            )
            .forEach(b => {
              if (
                b !== this
              ) {
                b.classList.remove(
                  'selected'
                );
              }
            });

          /*
             Jika sedang terbuka,
             tutup kembali.
          */
          if (
            bubble.classList.contains(
              'show'
            )
          ) {
            bubble.classList.remove(
              'show'
            );

            this.classList.remove(
              'selected'
            );

            return;
          }

          this.classList.add(
            'selected'
          );

          /*
             PENTING:
             Bubble ditempatkan relatif terhadap
             .chartBarWrap.

             bottom = tinggi batang + jarak.

             Dengan begitu:
             batang pendek -> bubble ikut rendah
             batang tinggi -> bubble ikut tinggi
          */
          bubble.style.left =
            '50%';

          bubble.style.right =
            'auto';

          bubble.style.bottom =
            `${this.offsetHeight + 10}px`;

          bubble.style.transform =
            'translateX(-50%)';

          bubble.classList.add(
            'show'
          );

          /*
             Koreksi horizontal agar bubble
             tidak keluar layar.
          */
          requestAnimationFrame(() => {
            const rect =
              bubble.getBoundingClientRect();

            const padding = 8;

            let shift = 0;

            if (
              rect.left < padding
            ) {
              shift =
                padding -
                rect.left;
            }

            if (
              rect.right >
              window.innerWidth -
              padding
            ) {
              shift =
                window.innerWidth -
                padding -
                rect.right;
            }

            if (shift !== 0) {
              bubble.style.left =
                `calc(50% + ${shift}px)`;
            }
          });
        }
      );
    });
}

/* =========================================================
   KLIK DI LUAR CHART = TUTUP BUBBLE
   =========================================================

   Listener dipasang SATU KALI di bawah,
   bukan setiap drawChart().
   ========================================================= */

if (
  !window.__dompetHarryChartOutsideClick
) {
  document.addEventListener(
    'click',
    function (e) {
      if (
        !e.target.closest(
          '#chart'
        )
      ) {
        document
          .querySelectorAll(
            '#chart .chartBubble'
          )
          .forEach(b => {
            b.classList.remove(
              'show'
            );
          });

        document
          .querySelectorAll(
            '#chart .bar'
          )
          .forEach(b => {
            b.classList.remove(
              'selected'
            );
          });
      }
    }
  );

  window.__dompetHarryChartOutsideClick =
    true;
}

/* =========================================================
   RIWAYAT LENGKAP
   ========================================================= */

function renderHistory() {
  const month =
    document.getElementById(
      'month'
    );

  const mk =
    month && month.value
      ? month.value
      : monthKey(today());

  const r =
    [...data]
      .filter(
        x =>
          monthKey(
            String(x.date)
          ) === mk
      )
      .sort(
        (a, b) =>
          String(b.date).localeCompare(
            String(a.date)
          ) ||
          (Number(b.created) || 0) -
          (Number(a.created) || 0)
      );

  const debit =
    r
      .filter(
        x =>
          x.type === 'debit'
      )
      .reduce(
        (s, x) =>
          s +
          (Number(x.amount) || 0),
        0
      );

  const credit =
    r
      .filter(
        x =>
          x.type === 'credit'
      )
      .reduce(
        (s, x) =>
          s +
          (Number(x.amount) || 0),
        0
      );

  const subtitle =
    document.getElementById(
      'historySubtitle'
    );

  const expense =
    document.getElementById(
      'historyExpense'
    );

  const income =
    document.getElementById(
      'historyIncome'
    );

  const list =
    document.getElementById(
      'historyList'
    );

  if (subtitle) {
    subtitle.textContent =
      `${monthName(mk)} • ${r.length} transaksi`;
  }

  if (expense) {
    expense.textContent =
      money(debit);
  }

  if (income) {
    income.textContent =
      money(credit);
  }

  if (list) {
    list.innerHTML =
      r.length
        ? r.map(tx).join('')
        : `<div class="empty">
             Belum ada transaksi pada ${monthName(mk)}.
           </div>`;
  }
}

/* =========================================================
   EVENT DROPDOWN BULAN
   ========================================================= */

function setupMonthEvent() {
  const month =
    document.getElementById(
      'month'
    );

  if (!month) return;

  if (
    month.dataset.dhBound === '1'
  ) {
    return;
  }

  month.addEventListener(
    'change',
    function () {
      /*
         Saat user memilih bulan,
         langsung render bulan tersebut.
      */
      render();
    }
  );

  month.dataset.dhBound = '1';
}

/* =========================================================
   BUKA RIWAYAT
   ========================================================= */

function showHistory() {
  const recent =
    document.getElementById(
      'recentTransactionsPanel'
    );

  const history =
    document.getElementById(
      'historyPanel'
    );

  if (recent) {
    recent.style.display =
      'none';
  }

  if (history) {
    history.classList.add(
      'show'
    );
  }

  renderHistory();

  setNav('navHistory');

  setTimeout(() => {
    if (history) {
      history.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, 50);
}

/* =========================================================
   TUTUP RIWAYAT
   ========================================================= */

function closeHistory() {
  const history =
    document.getElementById(
      'historyPanel'
    );

  const recent =
    document.getElementById(
      'recentTransactionsPanel'
    );

  if (history) {
    history.classList.remove(
      'show'
    );
  }

  if (recent) {
    recent.style.display =
      'block';
  }

  setNav('navHome');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

/* =========================================================
   NAVBAR
   ========================================================= */

function setNav(id) {
  [
    'navHome',
    'navTransaction',
    'navHistory',
    'navBackup'
  ].forEach(x => {
    const el =
      document.getElementById(x);

    if (el) {
      el.classList.remove(
        'active'
      );
    }
  });

  const active =
    document.getElementById(id);

  if (active) {
    active.classList.add(
      'active'
    );
  }
}

/* =========================================================
   BERANDA
   ========================================================= */

function goHome() {
  const recent =
    document.getElementById(
      'recentTransactionsPanel'
    );

  const history =
    document.getElementById(
      'historyPanel'
    );

  if (recent) {
    recent.style.display =
      'block';
  }

  if (history) {
    history.classList.remove(
      'show'
    );
  }

  setNav('navHome');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

/* =========================================================
   TRANSAKSI
   ========================================================= */

function goTransaction() {
  const recent =
    document.getElementById(
      'recentTransactionsPanel'
    );

  const history =
    document.getElementById(
      'historyPanel'
    );

  if (recent) {
    recent.style.display =
      'none';
  }

  if (history) {
    history.classList.remove(
      'show'
    );
  }

  setNav('navTransaction');

  const add =
    document.getElementById(
      'add'
    );

  if (add) {
    add.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

/* =========================================================
   BACKUP
   ========================================================= */

function goBackup() {
  const recent =
    document.getElementById(
      'recentTransactionsPanel'
    );

  const history =
    document.getElementById(
      'historyPanel'
    );

  if (recent) {
    recent.style.display =
      'none';
  }

  if (history) {
    history.classList.remove(
      'show'
    );
  }

  setNav('navBackup');

  const backupCard =
    document.querySelector(
      '.backup-card'
    );

  if (backupCard) {
    backupCard.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function esc(s) {
  return String(s ?? '')
    .replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c])
    );
}

/* =========================================================
   TOAST
   ========================================================= */

function toast(s) {
  const t =
    document.getElementById(
      'toast'
    );

  if (!t) {
    return;
  }

  t.textContent = s;

  t.classList.add('show');

  clearTimeout(
    window.__dompetHarryToastTimer
  );

  window.__dompetHarryToastTimer =
    setTimeout(() => {
      t.classList.remove(
        'show'
      );
    }, 2200);
}

/* =========================================================
   BACKUP SECURITY
   ========================================================= */

const BACKUP_FORMAT =
  'dompet-harry-backup';

const BACKUP_VERSION = 2;

const PBKDF2_ITERATIONS =
  250000;

const BACKUP_PASSWORD_KEY =
  'dompet_harry_backup_verifier_v1';

const encoder =
  new TextEncoder();

const decoder =
  new TextDecoder();

function bytesToBase64(bytes) {
  let binary = '';

  const chunk = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunk
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        i + chunk
      )
    );
  }

  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}

function randomBytes(length) {
  return crypto.getRandomValues(
    new Uint8Array(length)
  );
}

async function deriveBackupKey(
  password,
  salt
) {
  const baseKey =
    await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations:
        PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    [
      'encrypt',
      'decrypt'
    ]
  );
}

/* =========================================================
   PASSWORD VERIFIER
   ========================================================= */

async function createPasswordVerifier(
  password
) {
  const salt =
    randomBytes(16);

  const baseKey =
    await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

  const bits =
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations:
          PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      256
    );

  return {
    salt:
      bytesToBase64(salt),

    verifier:
      bytesToBase64(
        new Uint8Array(bits)
      )
  };
}

async function verifyBackupPassword(
  password,
  record
) {
  try {
    const salt =
      base64ToBytes(
        record.salt
      );

    const expected =
      base64ToBytes(
        record.verifier
      );

    const baseKey =
      await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );

    const bits =
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations:
            PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        baseKey,
        256
      );

    const actual =
      new Uint8Array(bits);

    if (
      actual.length !==
      expected.length
    ) {
      return false;
    }

    let result = 0;

    for (
      let i = 0;
      i < actual.length;
      i++
    ) {
      result |=
        actual[i] ^
        expected[i];
    }

    return result === 0;
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function setupBackupPassword() {
  const p =
    prompt(
      'Buat password backup Dompet Harry.\n\n' +
      'Password ini hanya dibuat SATU KALI.\n' +
      'Minimal 10 karakter.\n\n' +
      'Simpan password ini di tempat aman.'
    );

  if (p === null) {
    return null;
  }

  if (p.length < 10) {
    alert(
      'Password backup minimal 10 karakter.'
    );

    return null;
  }

  const q =
    prompt(
      'Ulangi password backup untuk konfirmasi.'
    );

  if (q !== p) {
    alert(
      'Password backup tidak cocok.'
    );

    return null;
  }

  const verifier =
    await createPasswordVerifier(
      p
    );

  localStorage.setItem(
    BACKUP_PASSWORD_KEY,
    JSON.stringify(verifier)
  );

  return p;
}

async function getBackupPassword() {
  const stored =
    localStorage.getItem(
      BACKUP_PASSWORD_KEY
    );

  if (!stored) {
    return setupBackupPassword();
  }

  let record;

  try {
    record =
      JSON.parse(stored);
  } catch (e) {
    localStorage.removeItem(
      BACKUP_PASSWORD_KEY
    );

    return setupBackupPassword();
  }

  const p =
    prompt(
      'Masukkan password backup Dompet Harry.'
    );

  if (p === null) {
    return null;
  }

  if (p.length < 1) {
    alert(
      'Password tidak boleh kosong.'
    );

    return null;
  }

  const valid =
    await verifyBackupPassword(
      p,
      record
    );

  if (!valid) {
    alert(
      'Password backup salah.'
    );

    return null;
  }

  return p;
}

/* =========================================================
   BACKUP DATA
   ========================================================= */

async function backupData() {
  try {
    if (
      !window.crypto ||
      !crypto.subtle
    ) {
      alert(
        'Browser ini tidak mendukung enkripsi backup.'
      );

      return;
    }

    if (!data.length) {
      if (
        !confirm(
          'Belum ada transaksi. Tetap membuat backup kosong?'
        )
      ) {
        return;
      }
    }

    const password =
      await getBackupPassword();

    if (password === null) {
      return;
    }

    const payload = {
      app: 'Dompet Harry',
      format:
        BACKUP_FORMAT,
      version:
        BACKUP_VERSION,
      createdAt:
        new Date().toISOString(),
      transactionCount:
        data.length,
      transactions:
        data
    };

    const plainText =
      JSON.stringify(payload);

    const salt =
      randomBytes(16);

    const iv =
      randomBytes(12);

    const key =
      await deriveBackupKey(
        password,
        salt
      );

    const encrypted =
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encoder.encode(
          plainText
        )
      );

    const backup = {
      format:
        BACKUP_FORMAT,
      version:
        BACKUP_VERSION,
      algorithm:
        'AES-256-GCM',
      kdf:
        'PBKDF2-SHA256',
      iterations:
        PBKDF2_ITERATIONS,
      salt:
        bytesToBase64(salt),
      iv:
        bytesToBase64(iv),
      data:
        bytesToBase64(
          new Uint8Array(
            encrypted
          )
        )
    };

    const text =
      JSON.stringify(
        backup,
        null,
        2
      );

    const blob =
      new Blob(
        [text],
        {
          type:
            'application/octet-stream'
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        'a'
      );

    const d =
      new Date();

    const filename =
      `Dompet-Harry-Backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.dhbackup`;

    a.href = url;
    a.download =
      filename;

    document.body.appendChild(
      a
    );

    a.click();

    a.remove();

    setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      1000
    );

    toast(
      'Backup terenkripsi berhasil dibuat'
    );
  } catch (error) {
    console.error(error);

    alert(
      'Backup gagal dibuat. Silakan coba lagi.'
    );
  }
}

/* =========================================================
   RESTORE DATA
   ========================================================= */

async function restoreData(event) {
  const file =
    event &&
    event.target &&
    event.target.files
      ? event.target.files[0]
      : null;

  if (
    event &&
    event.target
  ) {
    event.target.value = '';
  }

  if (!file) {
    return;
  }

  try {
    if (
      file.size >
      25 * 1024 * 1024
    ) {
      alert(
        'File backup terlalu besar.'
      );

      return;
    }

    const text =
      await file.text();

    const backup =
      JSON.parse(text);

    if (
      backup.format !==
        BACKUP_FORMAT ||
      (
        backup.version !== 1 &&
        backup.version !==
          BACKUP_VERSION
      )
    ) {
      alert(
        'File bukan backup Dompet Harry yang kompatibel.'
      );

      return;
    }

    if (
      !backup.salt ||
      !backup.iv ||
      !backup.data
    ) {
      alert(
        'Struktur file backup tidak valid.'
      );

      return;
    }

    const password =
      await getBackupPassword();

    if (password === null) {
      return;
    }

    const salt =
      base64ToBytes(
        backup.salt
      );

    const iv =
      base64ToBytes(
        backup.iv
      );

    const encrypted =
      base64ToBytes(
        backup.data
      );

    const key =
      await deriveBackupKey(
        password,
        salt
      );

    let decrypted;

    try {
      decrypted =
        await crypto.subtle.decrypt(
          {
            name:
              'AES-GCM',
            iv
          },
          key,
          encrypted
        );
    } catch (e) {
      alert(
        'Password salah atau file backup rusak.'
      );

      return;
    }

    const restored =
      JSON.parse(
        decoder.decode(
          decrypted
        )
      );

    if (
      restored.app !==
        'Dompet Harry' ||
      restored.format !==
        BACKUP_FORMAT ||
      !Array.isArray(
        restored.transactions
      )
    ) {
      alert(
        'Isi backup tidak valid.'
      );

      return;
    }

    const count =
      restored.transactions.length;

    const ok =
      confirm(
        `Backup berisi ${count} transaksi.\n\n` +
        `Restore akan mengganti data transaksi lokal Dompet Harry saat ini.\n\n` +
        `Lanjutkan?`
      );

    if (!ok) {
      return;
    }

    const clean = [];

    for (
      const item of
      restored.transactions
    ) {
      if (
        !item ||
        typeof item !==
          'object' ||
        !item.date ||
        !item.desc ||
        !item.type ||
        !Number.isFinite(
          Number(
            item.amount
          )
        )
      ) {
        continue;
      }

      if (
        item.type !==
          'debit' &&
        item.type !==
          'credit'
      ) {
        continue;
      }

      clean.push({
        id:
          item.id ||
          (
            String(
              Date.now()
            ) +
            '-' +
            Math.random()
          ),

        date:
          String(
            item.date
          ),

        desc:
          String(
            item.desc
          ),

        type:
          item.type,

        cat:
          String(
            item.cat ||
              '📦 Lainnya'
          ),

        amount:
          Number(
            item.amount
          ),

        created:
          Number(
            item.created
          ) ||
          Date.now()
      });
    }

    data = clean;

    save();

    setup(true);

    render();

    toast(
      `Restore berhasil: ${clean.length} transaksi`
    );

    setTimeout(
      () => {
        alert(
          `Restore berhasil.\n\n` +
          `${clean.length} transaksi telah dimuat kembali ke Dompet Harry.`
        );
      },
      250
    );
  } catch (error) {
    console.error(error);

    alert(
      'Restore gagal. File tidak valid atau rusak.'
    );
  }
}

/* =========================================================
   PIN 6 DIGIT
   ========================================================= */

const DH_PIN_KEY =
  'dompet_harry_pin_hash_v2';

async function dhHash(s) {
  const b =
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(s)
    );

  return Array
    .from(
      new Uint8Array(b)
    )
    .map(
      x =>
        x
          .toString(16)
          .padStart(2, '0')
    )
    .join('');
}

function dhPinValid(p) {
  return /^\d{6}$/.test(
    p || ''
  );
}

function dhShowPin(first = false) {
  const title =
    document.getElementById(
      'pinTitle'
    );

  const text =
    document.getElementById(
      'pinText'
    );

  const action =
    document.getElementById(
      'pinAction'
    );

  const change =
    document.getElementById(
      'pinChange'
    );

  const overlay =
    document.getElementById(
      'pinOverlay'
    );

  if (title) {
    title.textContent =
      first
        ? 'Buat PIN 6 Digit'
        : 'Masukkan PIN';
  }

  if (text) {
    text.textContent =
      first
        ? 'Buat PIN 6 digit untuk mengunci Dompet Harry di perangkat ini.'
        : 'Dompet Harry dikunci. Masukkan PIN 6 digit untuk melanjutkan.';
  }

  if (action) {
    action.textContent =
      first
        ? 'Simpan PIN'
        : 'Buka Dompet';
  }

  if (change) {
    change.style.display =
      first
        ? 'none'
        : 'block';
  }

  if (overlay) {
    overlay.classList.remove(
      'hidden'
    );
  }

  setTimeout(
    () => {
      const input =
        document.getElementById(
          'pinInput'
        );

      if (input) {
        input.focus();
      }
    },
    100
  );
}

function dhHidePin() {
  const overlay =
    document.getElementById(
      'pinOverlay'
    );

  const input =
    document.getElementById(
      'pinInput'
    );

  if (overlay) {
    overlay.classList.add(
      'hidden'
    );
  }

  if (input) {
    input.value = '';
  }
}

async function pinSetup() {
  const saved =
    localStorage.getItem(
      DH_PIN_KEY
    );

  if (saved) {
    const old =
      prompt(
        'Masukkan PIN lama 6 digit.'
      );

    if (
      !dhPinValid(old) ||
      await dhHash(old) !==
        saved
    ) {
      alert(
        'PIN lama salah.'
      );

      return;
    }
  }

  const p =
    prompt(
      'Buat PIN baru 6 digit.'
    );

  if (!dhPinValid(p)) {
    alert(
      'PIN harus tepat 6 digit.'
    );

    return;
  }

  const q =
    prompt(
      'Ulangi PIN baru 6 digit.'
    );

  if (p !== q) {
    alert(
      'PIN tidak cocok.'
    );

    return;
  }

  localStorage.setItem(
    DH_PIN_KEY,
    await dhHash(p)
  );

  alert(
    'PIN 6 digit berhasil disimpan.'
  );

  sessionStorage.setItem(
    'dh_unlocked',
    '1'
  );
}

async function dhUnlock() {
  const input =
    document.getElementById(
      'pinInput'
    );

  const p =
    input
      ? input.value
      : '';

  if (!dhPinValid(p)) {
    alert(
      'Masukkan PIN tepat 6 digit.'
    );

    return;
  }

  const saved =
    localStorage.getItem(
      DH_PIN_KEY
    );

  if (
    saved &&
    await dhHash(p) ===
      saved
  ) {
    dhHidePin();

    sessionStorage.setItem(
      'dh_unlocked',
      '1'
    );
  } else {
    if (input) {
      input.value = '';
    }

    alert(
      'PIN salah.'
    );
  }
}

/* =========================================================
   PIN EVENT
   ========================================================= */

function setupPinEvents() {
  const action =
    document.getElementById(
      'pinAction'
    );

  const input =
    document.getElementById(
      'pinInput'
    );

  const change =
    document.getElementById(
      'pinChange'
    );

  if (
    action &&
    action.dataset.dhBound !== '1'
  ) {
    action.addEventListener(
      'click',
      async () => {
        if (
          !localStorage.getItem(
            DH_PIN_KEY
          )
        ) {
          const p =
            input
              ? input.value
              : '';

          if (!dhPinValid(p)) {
            alert(
              'PIN harus tepat 6 digit.'
            );

            return;
          }

          const q =
            prompt(
              'Ulangi PIN baru 6 digit.'
            );

          if (p !== q) {
            alert(
              'PIN tidak cocok.'
            );

            return;
          }

          localStorage.setItem(
            DH_PIN_KEY,
            await dhHash(p)
          );

          sessionStorage.setItem(
            'dh_unlocked',
            '1'
          );

          dhHidePin();

          return;
        }

        await dhUnlock();
      }
    );

    action.dataset.dhBound =
      '1';
  }

  if (
    input &&
    input.dataset.dhBound !== '1'
  ) {
    input.addEventListener(
      'keydown',
      e => {
        if (
          e.key ===
          'Enter'
        ) {
          if (action) {
            action.click();
          }
        }
      }
    );

    input.dataset.dhBound =
      '1';
  }

  if (
    change &&
    change.dataset.dhBound !== '1'
  ) {
    change.addEventListener(
      'click',
      pinSetup
    );

    change.dataset.dhBound =
      '1';
  }
}

/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  'serviceWorker' in
  navigator
) {
  navigator.serviceWorker
    .register('./sw.js')
    .catch(
      e =>
        console.warn(
          'Service Worker gagal:',
          e
        )
    );
}

/* =========================================================
   START
   ========================================================= */

function initDompetHarry() {
  setup(true);
  setupMonthEvent();
  setupPinEvents();
  render();

  if (
    !localStorage.getItem(
      DH_PIN_KEY
    )
  ) {
    dhShowPin(true);
  } else if (
    sessionStorage.getItem(
      'dh_unlocked'
    ) !== '1'
  ) {
    dhShowPin(false);
  }
}

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initDompetHarry,
    {
      once: true
    }
  );
} else {
  initDompetHarry();
}
"""

path = Path("/mnt/data/app.js")
path.write_text(code, encoding="utf-8")
print(f"File dibuat: {path}")
print(f"Ukuran: {path.stat().st_size:,} bytes")
print(f"Baris: {len(code.splitlines()):,}")
