const KEY='dompet_harry_v1';

let data=[];

try{

data=JSON.parse(
localStorage.getItem(KEY)||'[]'
);

if(!Array.isArray(data))
data=[];

}catch(e){

data=[];

}


const pad=n=>
String(n).padStart(2,'0');


const today=()=>{

let d=new Date();

return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

};


const monthKey=d=>
d.slice(0,7);


const money=n=>
new Intl.NumberFormat(
'id-ID',
{
style:'currency',
currency:'IDR',
maximumFractionDigits:0
}
).format(Number(n)||0);


const monthName=k=>{

let [y,m]=k.split('-');

return new Date(
+y,
+m-1,
1
).toLocaleDateString(
'id-ID',
{
month:'long',
year:'numeric'
}
);

};


function save(){

localStorage.setItem(
KEY,
JSON.stringify(data)
);

}


function months(){

let s=new Set(
data.map(x=>monthKey(x.date))
);

s.add(monthKey(today()));

return [...s].sort().reverse();

}


function setup(){

let s=
document.getElementById('month');

let old=s.value;

let list=months();

s.innerHTML=
list
.map(
x=>`<option value="${x}">${monthName(x)}</option>`
)
.join('');

if(old && list.includes(old)){
s.value=old;
}

document.getElementById('date').value=today();

}


function render(){

setup();

let mk=
document.getElementById('month').value
||
monthKey(today());

let r=
data.filter(
x=>monthKey(x.date)===mk
);

let d=
r.filter(
x=>x.type==='debit'
)
.reduce(
(a,x)=>a+(Number(x.amount)||0),
0
);

let c=
r.filter(
x=>x.type==='credit'
)
.reduce(
(a,x)=>a+(Number(x.amount)||0),
0
);

document.getElementById('expense')
.textContent=money(d);

document.getElementById('income')
.textContent=money(c);

document.getElementById('balance')
.textContent=money(c-d);


/* =====================================================
   BERANDA:
   5 TRANSAKSI TERBARU
   ===================================================== */

let recent=
[...r]
.sort(
(a,b)=>
b.date.localeCompare(a.date)||
(b.created||0)-(a.created||0)
)
.slice(0,5);

document.getElementById('transactions')
.innerHTML=

recent.length

?recent.map(tx).join('')

:'<div class="empty">Belum ada transaksi bulan ini.</div>';


/* =====================================================
   RIWAYAT
   ===================================================== */

renderHistory();

drawChart();

}


/* =====================================================
   TEMPLATE TRANSAKSI
   ===================================================== */

function tx(x){

return `
<div class="tx">

<div class="cat">
${String(x.cat||'📦').split(' ')[0]}
</div>

<div class="txmain">

<b>${esc(x.desc)}</b>

<span>
${esc(x.cat)}
•
${new Date(x.date+'T00:00:00')
.toLocaleDateString(
'id-ID',
{
day:'2-digit',
month:'short',
year:'numeric'
}
)}
</span>

</div>

<div class="money ${x.type==='debit'?'red':'green'}">
${x.type==='debit'?'-':'+'}${money(x.amount)}
</div>

<button
class="del"
onclick="delTx('${String(x.id).replace(/'/g,"\\'")}')">
✕
</button>

</div>
`;

}


/* =====================================================
   TAMBAH TRANSAKSI
   ===================================================== */

function addTx(e){

e.preventDefault();

let a=
Number(
document.getElementById('amount').value
);

if(!Number.isFinite(a)||a<=0){

toast('Nominal tidak valid');

return;

}

data.push({

id:
crypto.randomUUID
?crypto.randomUUID()
:String(Date.now())+'-'+Math.random(),

date:
document.getElementById('date').value,

desc:
document.getElementById('desc')
.value
.trim(),

type:
document.getElementById('type').value,

cat:
document.getElementById('cat').value,

amount:a,

created:Date.now()

});

save();

toast('Transaksi disimpan');

resetForm();

render();

}


/* =====================================================
   RESET FORM
   ===================================================== */

function resetForm(){

document.getElementById('desc').value='';

document.getElementById('amount').value='';

document.getElementById('date').value=today();

}


/* =====================================================
   TYPE DEBIT / CREDIT
   ===================================================== */

function setType(t){

document.getElementById('type').value=t;

document.getElementById('add')
.scrollIntoView({
behavior:'smooth'
});

}


/* =====================================================
   HAPUS TRANSAKSI
   ===================================================== */

function delTx(id){

let x=data.find(
a=>String(a.id)===String(id)
);

if(
x &&
confirm(
`Hapus ${x.desc} sebesar ${money(x.amount)}?`
)
){

data=
data.filter(
a=>String(a.id)!==String(id)
);

save();

toast('Transaksi dihapus');

render();

if(
document
.getElementById('historyPanel')
.classList.contains('show')
){

renderHistory();

}

}

}


/* =====================================================
   CHART 7 HARI
   ===================================================== */

/* =====================================================
   CHART 7 HARI
   DENGAN BUBBLE DETAIL SAAT DISENTUH
   ===================================================== */

function drawChart(){

let days=[];

const dayNames=[
'Minggu',
'Senin',
'Selasa',
'Rabu',
'Kamis',
'Jumat',
'Sabtu'
];

for(let i=6;i>=0;i--){

let d=new Date();

d.setHours(0,0,0,0);

d.setDate(
d.getDate()-i
);

let k=
`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

let v=data
.filter(
x=>
x.date===k &&
x.type==='debit'
)
.reduce(
(s,x)=>s+(Number(x.amount)||0),
0
);

days.push({

date:k,

amount:v,

day:dayNames[d.getDay()],

dateLabel:
`${pad(d.getDate())}/${pad(d.getMonth()+1)}`

});

}


/* =========================
   NILAI MAKSIMUM GRAFIK
   ========================= */

let max=Math.max(
...days.map(x=>x.amount),
1
);


/* =========================
   TOTAL 7 HARI
   ========================= */

document.getElementById('weekTotal')
.textContent=
money(
days.reduce(
(a,b)=>a+b.amount,
0
)
);


/* =========================
   RENDER GRAFIK
   ========================= */

document.getElementById('chart')
.innerHTML=

days.map((x,index)=>`

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
x.amount/max*100
)}%"
title=""
></div>


<!-- =========================
     BUBBLE DETAIL
     ========================= -->

<div
class="chartBubble"
data-bubble="${index}"
>

<div class="bubbleDay">
${x.day}
</div>

<div class="bubbleDate">
${new Date(x.date+'T00:00:00')
.toLocaleDateString(
'id-ID',
{
day:'2-digit',
month:'long',
year:'numeric'
}
)}
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

<b>${x.day.slice(0,3)}</b>

${x.dateLabel}

</div>

</div>

`).join('');


/* =====================================================
   EVENT KLIK / SENTUH BATANG
   ===================================================== */

const bars=
document.querySelectorAll(
'#chart .bar'
);

bars.forEach(bar=>{

bar.addEventListener(
'click',
function(e){

e.stopPropagation();

const index=this.dataset.index;


/* =========================
   MATIKAN BUBBLE LAIN
   ========================= */

document
.querySelectorAll(
'#chart .chartBubble'
)
.forEach(b=>{

if(
b.dataset.bubble!==index
){

b.classList.remove('show');

}

});


/* =========================
   MATIKAN BATANG LAIN
   ========================= */

document
.querySelectorAll(
'#chart .bar'
)
.forEach(b=>{

if(b!==this){

b.classList.remove('selected');

}

});


/* =========================
   AMBIL BUBBLE
   ========================= */

const bubble=
document.querySelector(
`#chart .chartBubble[data-bubble="${index}"]`
);

if(!bubble)return;


/* =========================
   TOGGLE
   ========================= */

const isOpen=
bubble.classList.contains('show');


if(isOpen){

bubble.classList.remove('show');

this.classList.remove('selected');

return;

}


/* =========================
   AKTIFKAN BATANG
   ========================= */

this.classList.add('selected');


/* =====================================================
   POSISI BUBBLE
   ===================================================== */

/*
   Bubble berada tepat di atas BATANG
   yang disentuh.

   Karena bubble merupakan child dari
   chartBarWrap, bottom:100% akan mengikuti
   tinggi batang tersebut.
*/

bubble.style.left='50%';
bubble.style.right='auto';
bubble.style.bottom =
(this.offsetHeight + 10) + 'px';


/* =====================================================
   TAMPILKAN DULU
   ===================================================== */

bubble.classList.add('show');


/* =====================================================
   CEK POSISI AGAR TIDAK KELUAR LAYAR
   ===================================================== */

requestAnimationFrame(()=>{

const bubbleRect=
bubble.getBoundingClientRect();

const chartRect=
document
.getElementById('chart')
.getBoundingClientRect();

const padding=8;

let shift=0;


/* =========================
   TERLALU KE KIRI
   ========================= */

if(
bubbleRect.left < padding
){

shift=
padding-bubbleRect.left;

}


/* =========================
   TERLALU KE KANAN
   ========================= */

if(
bubbleRect.right >
window.innerWidth-padding
){

shift=
(window.innerWidth-padding)-
bubbleRect.right;

}


/* =========================
   BATASI PERGESERAN
   ========================= */

if(shift!==0){

bubble.style.left=
`calc(50% + ${shift}px)`;

}

});

});

});

}


/* =====================================================
   TUTUP BUBBLE JIKA AREA DI LUAR GRAFIK DISENTUH
   ===================================================== */

document.addEventListener(
'click',
function(e){

if(
!e.target.closest('#chart')
){

document
.querySelectorAll(
'#chart .chartBubble'
)
.forEach(b=>{

b.classList.remove('show');

});

document
.querySelectorAll(
'#chart .bar'
)
.forEach(b=>{

b.classList.remove('selected');

});

}

}
);


/* =====================================================
   RIWAYAT LENGKAP
   ===================================================== */

function renderHistory(){

let mk=
document.getElementById('month').value
||
monthKey(today());

let r=
[...data]
.filter(
x=>monthKey(x.date)===mk
)
.sort(
(a,b)=>
b.date.localeCompare(a.date)||
(b.created||0)-(a.created||0)
);

let debit=
r.filter(
x=>x.type==='debit'
)
.reduce(
(s,x)=>s+(Number(x.amount)||0),
0
);

let credit=
r.filter(
x=>x.type==='credit'
)
.reduce(
(s,x)=>s+(Number(x.amount)||0),
0
);

document.getElementById('historySubtitle')
.textContent=
`${monthName(mk)} • ${r.length} transaksi`;

document.getElementById('historyExpense')
.textContent=
money(debit);

document.getElementById('historyIncome')
.textContent=
money(credit);

document.getElementById('historyList')
.innerHTML=

r.length

?r.map(tx).join('')

:`<div class="empty">
Belum ada transaksi pada ${monthName(mk)}.
</div>`;

}


/* =====================================================
   BUKA RIWAYAT
   ===================================================== */

function showHistory(){

/*
   SEMBUNYIKAN "TRANSAKSI TERBARU"
   KARENA SEMUA TRANSAKSI SUDAH ADA DI RIWAYAT
*/

document
.getElementById('recentTransactionsPanel')
.style.display='none';


document
.getElementById('historyPanel')
.classList.add('show');

renderHistory();

setNav('navHistory');

setTimeout(()=>{

document
.getElementById('historyPanel')
.scrollIntoView({
behavior:'smooth',
block:'start'
});

},50);

}


/* =====================================================
   TUTUP RIWAYAT
   ===================================================== */

function closeHistory(){

document
.getElementById('historyPanel')
.classList.remove('show');


/*
   KEMBALIKAN TRANSAKSI TERBARU
   SAAT KEMBALI KE BERANDA
*/

document
.getElementById('recentTransactionsPanel')
.style.display='block';


setNav('navHome');

window.scrollTo({
top:0,
behavior:'smooth'
});

}


/* =====================================================
   NAVBAR
   ===================================================== */

function setNav(id){

[
'navHome',
'navTransaction',
'navHistory',
'navBackup'
]
.forEach(x=>{

document
.getElementById(x)
.classList.remove('active');

});

document
.getElementById(id)
.classList.add('active');

}


/* =====================================================
   BERANDA
   ===================================================== */

function goHome(){

/*
   TAMPILKAN KEMBALI TRANSAKSI TERBARU
*/

document
.getElementById('recentTransactionsPanel')
.style.display='block';


document
.getElementById('historyPanel')
.classList.remove('show');

setNav('navHome');

window.scrollTo({
top:0,
behavior:'smooth'
});

}


/* =====================================================
   TRANSAKSI
   ===================================================== */

function goTransaction(){

/*
   TRANSAKSI TERBARU TETAP TERSEMBUNYI
   JIKA SEDANG MASUK KE FORM TRANSAKSI
*/

document
.getElementById('recentTransactionsPanel')
.style.display='none';


document
.getElementById('historyPanel')
.classList.remove('show');

setNav('navTransaction');

document
.getElementById('add')
.scrollIntoView({
behavior:'smooth',
block:'start'
});

}


/* =====================================================
   BACKUP
   ===================================================== */

function goBackup(){

document
.getElementById('recentTransactionsPanel')
.style.display='none';

document
.getElementById('historyPanel')
.classList.remove('show');

setNav('navBackup');

document
.querySelector('.backup-card')
.scrollIntoView({
behavior:'smooth',
block:'start'
});

}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function esc(s){

return String(s)
.replace(
/[&<>"']/g,
c=>({
'&':'&amp;',
'<':'&lt;',
'>':'&gt;',
'"':'&quot;',
"'":'&#039;'
}[c])
);

}


/* =====================================================
   TOAST
   ===================================================== */

function toast(s){

let t=
document.getElementById('toast');

t.textContent=s;

t.classList.add('show');

setTimeout(
()=>t.classList.remove('show'),
2200
);

}


/* =========================================================
   BACKUP SECURITY
   ========================================================= */

const BACKUP_FORMAT='dompet-harry-backup';

const BACKUP_VERSION=2;

const PBKDF2_ITERATIONS=250000;

const BACKUP_PASSWORD_KEY=
'dompet_harry_backup_verifier_v1';

const encoder=new TextEncoder();

const decoder=new TextDecoder();


function bytesToBase64(bytes){

let binary='';

const chunk=0x8000;

for(
let i=0;
i<bytes.length;
i+=chunk
){

binary+=String.fromCharCode(
...bytes.subarray(i,i+chunk)
);

}

return btoa(binary);

}


function base64ToBytes(base64){

const binary=atob(base64);

const bytes=
new Uint8Array(binary.length);

for(
let i=0;
i<binary.length;
i++
){

bytes[i]=
binary.charCodeAt(i);

}

return bytes;

}


function randomBytes(length){

return crypto.getRandomValues(
new Uint8Array(length)
);

}


async function deriveBackupKey(
password,
salt
){

const baseKey=
await crypto.subtle.importKey(
'raw',
encoder.encode(password),
'PBKDF2',
false,
['deriveKey']
);

return crypto.subtle.deriveKey(

{
name:'PBKDF2',
salt:salt,
iterations:PBKDF2_ITERATIONS,
hash:'SHA-256'
},

baseKey,

{
name:'AES-GCM',
length:256
},

false,

['encrypt','decrypt']

);

}


/*
   Password verifier.
   Password asli TIDAK disimpan.
*/

async function createPasswordVerifier(
password
){

const salt=randomBytes(16);

const baseKey=
await crypto.subtle.importKey(
'raw',
encoder.encode(password),
'PBKDF2',
false,
['deriveBits']
);

const bits=
await crypto.subtle.deriveBits(
{
name:'PBKDF2',
salt:salt,
iterations:PBKDF2_ITERATIONS,
hash:'SHA-256'
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
){

try{

const salt=
base64ToBytes(record.salt);

const expected=
base64ToBytes(record.verifier);

const baseKey=
await crypto.subtle.importKey(
'raw',
encoder.encode(password),
'PBKDF2',
false,
['deriveBits']
);

const bits=
await crypto.subtle.deriveBits(
{
name:'PBKDF2',
salt:salt,
iterations:PBKDF2_ITERATIONS,
hash:'SHA-256'
},
baseKey,
256
);

const actual=
new Uint8Array(bits);

if(
actual.length!==expected.length
)return false;

let result=0;

for(
let i=0;
i<actual.length;
i++
){

result|=
actual[i]^expected[i];

}

return result===0;

}catch(e){

console.error(e);

return false;

}

}


async function setupBackupPassword(){

const p=
prompt(
'Buat password backup Dompet Harry.\n\n' +
'Password ini hanya dibuat SATU KALI.\n' +
'Minimal 10 karakter.\n\n' +
'Simpan password ini di tempat aman.'
);

if(p===null)return null;

if(p.length<10){

alert(
'Password backup minimal 10 karakter.'
);

return null;

}

const q=
prompt(
'Ulangi password backup untuk konfirmasi.'
);

if(q!==p){

alert(
'Password backup tidak cocok.'
);

return null;

}

const verifier=
await createPasswordVerifier(p);

localStorage.setItem(
BACKUP_PASSWORD_KEY,
JSON.stringify(verifier)
);

return p;

}


async function getBackupPassword(){

const stored=
localStorage.getItem(
BACKUP_PASSWORD_KEY
);

if(!stored){

return setupBackupPassword();

}

let record;

try{

record=JSON.parse(stored);

}catch(e){

localStorage.removeItem(
BACKUP_PASSWORD_KEY
);

return setupBackupPassword();

}

const p=
prompt(
'Masukkan password backup Dompet Harry.'
);

if(p===null)return null;

if(p.length<1){

alert(
'Password tidak boleh kosong.'
);

return null;

}

const valid=
await verifyBackupPassword(
p,
record
);

if(!valid){

alert(
'Password backup salah.'
);

return null;

}

return p;

}


async function backupData(){

try{

if(
!window.crypto ||
!crypto.subtle
){

alert(
'Browser ini tidak mendukung enkripsi backup.'
);

return;

}

if(!data.length){

if(
!confirm(
'Belum ada transaksi. Tetap membuat backup kosong?'
)
)return;

}

const password=
await getBackupPassword();

if(password===null)return;


const payload={

app:'Dompet Harry',

format:BACKUP_FORMAT,

version:BACKUP_VERSION,

createdAt:
new Date().toISOString(),

transactionCount:
data.length,

transactions:data

};

const plainText=
JSON.stringify(payload);

const salt=
randomBytes(16);

const iv=
randomBytes(12);

const key=
await deriveBackupKey(
password,
salt
);

const encrypted=
await crypto.subtle.encrypt(

{
name:'AES-GCM',
iv:iv
},

key,

encoder.encode(
plainText
)

);

const backup={

format:BACKUP_FORMAT,

version:BACKUP_VERSION,

algorithm:'AES-256-GCM',

kdf:'PBKDF2-SHA256',

iterations:
PBKDF2_ITERATIONS,

salt:
bytesToBase64(salt),

iv:
bytesToBase64(iv),

data:
bytesToBase64(
new Uint8Array(encrypted)
)

};

const text=
JSON.stringify(
backup,
null,
2
);

const blob=
new Blob(
[text],
{
type:'application/octet-stream'
}
);

const url=
URL.createObjectURL(blob);

const a=
document.createElement('a');

const d=new Date();

const filename=
`Dompet-Harry-Backup-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.dhbackup`;

a.href=url;

a.download=filename;

document.body.appendChild(a);

a.click();

a.remove();

setTimeout(
()=>URL.revokeObjectURL(url),
1000
);

toast(
'Backup terenkripsi berhasil dibuat'
);

}catch(error){

console.error(error);

alert(
'Backup gagal dibuat. Silakan coba lagi.'
);

}

}


async function restoreData(event){

const file=
event.target.files &&
event.target.files[0];

event.target.value='';

if(!file)return;

try{

if(
file.size>25*1024*1024
){

alert(
'File backup terlalu besar.'
);

return;

}

const text=
await file.text();

const backup=
JSON.parse(text);

if(
backup.format!==BACKUP_FORMAT ||
(
backup.version!==1 &&
backup.version!==BACKUP_VERSION
)
){

alert(
'File bukan backup Dompet Harry yang kompatibel.'
);

return;

}

if(
!backup.salt ||
!backup.iv ||
!backup.data
){

alert(
'Struktur file backup tidak valid.'
);

return;

}

const password=
await getBackupPassword();

if(password===null)return;

const salt=
base64ToBytes(backup.salt);

const iv=
base64ToBytes(backup.iv);

const encrypted=
base64ToBytes(backup.data);

const key=
await deriveBackupKey(
password,
salt
);

let decrypted;

try{

decrypted=
await crypto.subtle.decrypt(

{
name:'AES-GCM',
iv:iv
},

key,

encrypted

);

}catch(e){

alert(
'Password salah atau file backup rusak.'
);

return;

}

const restored=
JSON.parse(
decoder.decode(decrypted)
);

if(
restored.app!=='Dompet Harry' ||
restored.format!==BACKUP_FORMAT ||
!Array.isArray(
restored.transactions
)
){

alert(
'Isi backup tidak valid.'
);

return;

}

const count=
restored.transactions.length;

const ok=
confirm(
`Backup berisi ${count} transaksi.\n\n` +
`Restore akan mengganti data transaksi lokal Dompet Harry saat ini.\n\n` +
`Lanjutkan?`
);

if(!ok)return;

const clean=[];

for(
const item of restored.transactions
){

if(
!item ||
typeof item!=='object' ||
!item.date ||
!item.desc ||
!item.type ||
!Number.isFinite(
Number(item.amount)
)
){

continue;

}

if(
item.type!=='debit' &&
item.type!=='credit'
){

continue;

}

clean.push({

id:
item.id ||
(
String(Date.now())+
'-'+
Math.random()
),

date:
String(item.date),

desc:
String(item.desc),

type:
item.type,

cat:
String(
item.cat||
'📦 Lainnya'
),

amount:
Number(item.amount),

created:
Number(item.created)||
Date.now()

});

}

data=clean;

save();

render();

toast(
`Restore berhasil: ${clean.length} transaksi`
);

setTimeout(
()=>{

alert(
`Restore berhasil.\n\n` +
`${clean.length} transaksi telah dimuat kembali ke Dompet Harry.`
);

},
250
);

}catch(error){

console.error(error);

alert(
'Restore gagal. File tidak valid atau rusak.'
);

}

}


/* =========================================================
   PIN 6 DIGIT
   ========================================================= */

const DH_PIN_KEY=
'dompet_harry_pin_hash_v2';


async function dhHash(s){

const b=
await crypto.subtle.digest(
'SHA-256',
new TextEncoder().encode(s)
);

return Array
.from(
new Uint8Array(b)
)
.map(
x=>
x.toString(16)
.padStart(2,'0')
)
.join('');

}


function dhPinValid(p){

return /^\d{6}$/.test(p||'');

}


function dhShowPin(first=false){

document.getElementById('pinTitle')
.textContent=
first
?'Buat PIN 6 Digit'
:'Masukkan PIN';

document.getElementById('pinText')
.textContent=
first
?'Buat PIN 6 digit untuk mengunci Dompet Harry di perangkat ini.'
:'Dompet Harry dikunci. Masukkan PIN 6 digit untuk melanjutkan.';

document.getElementById('pinAction')
.textContent=
first
?'Simpan PIN'
:'Buka Dompet';

document.getElementById('pinChange')
.style.display=
first
?'none'
:'block';

document.getElementById('pinOverlay')
.classList.remove('hidden');

setTimeout(
()=>document.getElementById('pinInput').focus(),
100
);

}


function dhHidePin(){

document.getElementById('pinOverlay')
.classList.add('hidden');

document.getElementById('pinInput').value='';

}


async function pinSetup(){

const saved=
localStorage.getItem(DH_PIN_KEY);

if(saved){

const old=
prompt(
'Masukkan PIN lama 6 digit.'
);

if(
!dhPinValid(old) ||
await dhHash(old)!==saved
){

alert(
'PIN lama salah.'
);

return;

}

}

const p=
prompt(
'Buat PIN baru 6 digit.'
);

if(!dhPinValid(p)){

alert(
'PIN harus tepat 6 digit.'
);

return;

}

const q=
prompt(
'Ulangi PIN baru 6 digit.'
);

if(p!==q){

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


async function dhUnlock(){

const p=
document.getElementById('pinInput')
.value;

if(!dhPinValid(p)){

alert(
'Masukkan PIN tepat 6 digit.'
);

return;

}

const saved=
localStorage.getItem(DH_PIN_KEY);

if(
saved &&
await dhHash(p)===saved
){

dhHidePin();

sessionStorage.setItem(
'dh_unlocked',
'1'
);

}else{

document.getElementById('pinInput')
.value='';

alert(
'PIN salah.'
);

}

}


document
.getElementById('pinAction')
.addEventListener(
'click',
async()=>{

if(
!localStorage.getItem(DH_PIN_KEY)
){

const p=
document.getElementById('pinInput')
.value;

if(!dhPinValid(p)){

alert(
'PIN harus tepat 6 digit.'
);

return;

}

const q=
prompt(
'Ulangi PIN baru 6 digit.'
);

if(p!==q){

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


document
.getElementById('pinInput')
.addEventListener(
'keydown',
e=>{

if(e.key==='Enter')
document
.getElementById('pinAction')
.click();

}
);


document
.getElementById('pinChange')
.addEventListener(
'click',
pinSetup
);


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if(
'serviceWorker' in navigator
){

navigator.serviceWorker
.register('./sw.js')
.catch(()=>{});

}


/* =========================================================
   START
   ========================================================= */

render();

if(
!localStorage.getItem(DH_PIN_KEY)
){

dhShowPin(true);

}else if(
sessionStorage.getItem('dh_unlocked')!=='1'
){

dhShowPin(false);

}
