const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

let signalements = [
  { id: 1, type: 'Dechets sauvages', zone: 'Dakar Plateau', statut: 'En attente', date: '2025-06-20' },
  { id: 2, type: 'Deversement illegal', zone: 'Pikine', statut: 'Traite', date: '2025-06-19' },
  { id: 3, type: 'Pollution air', zone: 'Guediawaye', statut: 'En cours', date: '2025-06-18' },
  { id: 4, type: 'Dechets sauvages', zone: 'Rufisque', statut: 'En attente', date: '2025-06-17' },
  { id: 5, type: 'Eau contaminee', zone: 'Thies', statut: 'Traite', date: '2025-06-16' },
];

const users = [
  { id: 1, username: 'admin', password: 'ecosen2025', role: 'admin' },
  { id: 2, username: 'operateur', password: 'op1234', role: 'operateur' },
];

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username, role: user.role, exp: Date.now() + 86400000 })).toString('base64');
  return 'ecosen.' + payload + '.ok';
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch(e) { return null; }
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token manquant' });
  const token = header.split(' ')[1];
  const user = verifyToken(token);
  if (!user) return res.status(403).json({ error: 'Token invalide' });
  req.user = user;
  next();
}

app.post('/api/login', function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const user = users.find(function(u) { return u.username === username && u.password === password; });
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });
  const token = createToken(user);
  res.json({ token: token, username: user.username, role: user.role });
});

app.get('/api/stats', auth, function(req, res) {
  const total = signalements.length;
  const enAttente = signalements.filter(function(s) { return s.statut === 'En attente'; }).length;
  const traites = signalements.filter(function(s) { return s.statut === 'Traite'; }).length;
  const enCours = signalements.filter(function(s) { return s.statut === 'En cours'; }).length;
  const taux = Math.round((traites / total) * 100);
  const zones = [...new Set(signalements.map(function(s) { return s.zone; }))].length;
  res.json({ signalements: total, zones_critiques: zones, taux_collecte: taux + '%', en_attente: enAttente, en_cours: enCours, traites: traites });
});

app.get('/stats', function(req, res) {
  res.json({ signalements: 120, zones_critiques: 5, taux_collecte: '78%' });
});

app.get('/api/signalements', auth, function(req, res) {
  res.json(signalements);
});

app.post('/api/signalements', auth, function(req, res) {
  const type = req.body.type;
  const zone = req.body.zone;
  if (!type || !zone) return res.status(400).json({ error: 'Type et zone requis' });
  const nouveau = { id: signalements.length + 1, type: type, zone: zone, statut: 'En attente', date: new Date().toISOString().split('T')[0] };
  signalements.push(nouveau);
  res.status(201).json(nouveau);
});

app.put('/api/signalements/:id', auth, function(req, res) {
  const id = parseInt(req.params.id);
  const s = signalements.find(function(s) { return s.id === id; });
  if (!s) return res.status(404).json({ error: 'Non trouve' });
  s.statut = req.body.statut || s.statut;
  res.json(s);
});

app.delete('/api/signalements/:id', auth, function(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });
  const id = parseInt(req.params.id);
  const idx = signalements.findIndex(function(s) { return s.id === id; });
  if (idx === -1) return res.status(404).json({ error: 'Non trouve' });
  signalements.splice(idx, 1);
  res.json({ message: 'Supprime' });
});

app.get('/', function(req, res) {
  res.send('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>EcoSen</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;background:#0A0F0D;color:#E8F5EE;min-height:100vh;}#login-screen{display:flex;align-items:center;justify-content:center;min-height:100vh;}.login-box{background:#111A15;border:1px solid #1E3024;border-radius:16px;padding:48px 40px;width:100%;max-width:400px;}h1{font-size:28px;font-weight:700;margin-bottom:24px;}.logo{color:#00C98D;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;}label{display:block;font-size:12px;color:#7BA891;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;margin-top:16px;}input{width:100%;background:#182218;border:1px solid #1E3024;border-radius:8px;padding:12px 16px;color:#E8F5EE;font-size:15px;outline:none;}.btn{width:100%;background:#00C98D;color:#000;border:none;border-radius:8px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-top:20px;}.btn:hover{background:#00A573;}.erreur{color:#FF7A45;font-size:13px;margin-top:12px;display:none;text-align:center;}.hint{color:#7BA891;font-size:12px;text-align:center;margin-top:16px;}#app{display:none;}.topbar{display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:60px;background:#111A15;border-bottom:1px solid #1E3024;}.logo2{font-size:18px;font-weight:700;}.logo2 span{color:#00C98D;}.user{display:flex;align-items:center;gap:12px;font-size:14px;color:#7BA891;}.badge{background:#182218;border:1px solid #1E3024;border-radius:20px;padding:4px 12px;font-size:12px;color:#00C98D;font-weight:600;}.btn-out{background:none;border:1px solid #1E3024;border-radius:8px;color:#7BA891;padding:6px 14px;font-size:13px;cursor:pointer;}.main{padding:32px;max-width:1200px;margin:0 auto;}.titre{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#7BA891;margin-bottom:16px;}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:40px;}.card{background:#111A15;border:1px solid #1E3024;border-radius:12px;padding:24px 20px;border-top:2px solid #00C98D;}.card.or{border-top-color:#FF7A45;}.card.bl{border-top-color:#4A9EFF;}.card-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#7BA891;margin-bottom:12px;}.card-val{font-size:36px;font-weight:700;color:#00C98D;}.card-val.or{color:#FF7A45;}.card-val.bl{color:#4A9EFF;}.form-box{background:#111A15;border:1px solid #1E3024;border-radius:12px;padding:24px;margin-bottom:32px;}.form-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;}.form-row label{margin-top:0;}.form-row input{flex:1;min-width:160px;}.btn-add{background:#00C98D;color:#000;border:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;}.table-box{background:#111A15;border:1px solid #1E3024;border-radius:12px;overflow:hidden;}.table-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #1E3024;}table{width:100%;border-collapse:collapse;}thead th{text-align:left;padding:12px 24px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7BA891;border-bottom:1px solid #1E3024;}tbody tr{border-bottom:1px solid #1E3024;}tbody tr:last-child{border-bottom:none;}tbody tr:hover{background:#182218;}tbody td{padding:14px 24px;font-size:14px;}.statut{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;}.att{background:rgba(255,122,69,0.15);color:#FF7A45;}.cou{background:rgba(74,158,255,0.15);color:#4A9EFF;}.tra{background:rgba(0,201,141,0.15);color:#00C98D;}.btn-a{background:none;border:1px solid #1E3024;border-radius:6px;color:#7BA891;padding:4px 10px;font-size:12px;cursor:pointer;margin-right:4px;}.btn-a:hover{border-color:#00C98D;color:#00C98D;}.btn-s:hover{border-color:#FF7A45;color:#FF7A45;}.btn-ref{background:none;border:1px solid #1E3024;border-radius:8px;color:#7BA891;padding:8px 16px;font-size:13px;cursor:pointer;}.toast{position:fixed;bottom:32px;right:32px;background:#111A15;border:1px solid #00C98D;border-radius:10px;padding:14px 20px;font-size:14px;color:#00C98D;opacity:0;transition:all 0.3s;pointer-events:none;z-index:1000;}.toast.show{opacity:1;}</style></head><body><div id="login-screen"><div class="login-box"><div class="logo">EcoSen</div><h1>Connexion</h1><label>Identifiant</label><input type="text" id="u" placeholder="admin"><label>Mot de passe</label><input type="password" id="p" placeholder="ecosen2025"><button class="btn" onclick="login()">Se connecter</button><div class="erreur" id="err">Identifiants incorrects</div><div class="hint">admin / ecosen2025</div></div></div><div id="app"><div class="topbar"><div class="logo2">Eco<span>Sen</span></div><div class="user"><span id="tuser"></span><span class="badge" id="trole"></span><button class="btn-out" onclick="logout()">Deconnexion</button></div></div><div class="main"><div class="titre">Vue densemble</div><div class="grid"><div class="card"><div class="card-label">Signalements</div><div class="card-val" id="s1">-</div></div><div class="card or"><div class="card-label">En attente</div><div class="card-val or" id="s2">-</div></div><div class="card bl"><div class="card-label">En cours</div><div class="card-val bl" id="s3">-</div></div><div class="card"><div class="card-label">Traites</div><div class="card-val" id="s4">-</div></div><div class="card"><div class="card-label">Zones</div><div class="card-val" id="s5">-</div></div><div class="card"><div class="card-label">Taux collecte</div><div class="card-val" id="s6">-</div></div></div><div class="titre">Nouveau signalement</div><div class="form-box"><div class="form-row"><div><label>Type</label><input type="text" id="itype" placeholder="Dechets sauvages"></div><div><label>Zone</label><input type="text" id="izone" placeholder="Dakar Plateau"></div><button class="btn-add" onclick="ajouter()">+ Ajouter</button></div></div><div class="table-box"><div class="table-head"><div class="titre" style="margin:0">Signalements</div><button class="btn-ref" onclick="load()">> Actualiser</button></div><table><thead><tr><th>#</th><th>Type</th><th>Zone</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead><tbody id="tbody"><tr><td colspan="6" style="text-align:center;padding:48px;color:#7BA891">Chargement...</td></tr></tbody></table></div></div></div><div class="toast" id="toast"></div><script>var TOKEN=localStorage.getItem("et");var ROLE=localStorage.getItem("er");var USER=localStorage.getItem("eu");if(TOKEN)showApp();function login(){var u=document.getElementById("u").value;var p=document.getElementById("p").value;fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})}).then(function(r){return r.json();}).then(function(d){if(d.error){document.getElementById("err").style.display="block";return;}TOKEN=d.token;ROLE=d.role;USER=d.username;localStorage.setItem("et",TOKEN);localStorage.setItem("er",ROLE);localStorage.setItem("eu",USER);document.getElementById("err").style.display="none";showApp();}).catch(function(){document.getElementById("err").style.display="block";});}function showApp(){document.getElementById("login-screen").style.display="none";document.getElementById("app").style.display="block";document.getElementById("tuser").textContent=USER||"";document.getElementById("trole").textContent=ROLE||"";load();}function logout(){localStorage.clear();TOKEN=null;document.getElementById("login-screen").style.display="flex";document.getElementById("app").style.display="none";}function load(){fetch("/api/stats",{headers:{Authorization:"Bearer "+TOKEN}}).then(function(r){return r.json();}).then(function(d){document.getElementById("s1").textContent=d.signalements;document.getElementById("s2").textContent=d.en_attente;document.getElementById("s3").textContent=d.en_cours;document.getElementById("s4").textContent=d.traites;document.getElementById("s5").textContent=d.zones_critiques;document.getElementById("s6").textContent=d.taux_collecte;});fetch("/api/signalements",{headers:{Authorization:"Bearer "+TOKEN}}).then(function(r){return r.json();}).then(function(data){var tb=document.getElementById("tbody");if(!data.length){tb.innerHTML="<tr><td colspan=6 style=text-align:center;padding:48px;color:#7BA891>Aucun signalement</td></tr>";return;}tb.innerHTML=data.map(function(s){var cls=s.statut==="En attente"?"att":s.statut==="En cours"?"cou":"tra";var del=ROLE==="admin"?"<button class=\\"btn-a btn-s\\" onclick=\\"suppr("+s.id+")\\">Suppr.</button>":"";return "<tr><td style=color:#7BA891;font-size:12px>"+s.id+"</td><td>"+s.type+"</td><td>"+s.zone+"</td><td style=color:#7BA891;font-size:13px>"+s.date+"</td><td><span class=\\"statut "+cls+"\\">"+s.statut+"</span></td><td><button class=\\"btn-a\\" onclick=\\"statut("+s.id+",\'En cours\')\\">En cours</button><button class=\\"btn-a\\" onclick=\\"statut("+s.id+",\'Traite\')\\">Traite</button>"+del+"</td></tr>";}).join("");});}function ajouter(){var type=document.getElementById("itype").value;var zone=document.getElementById("izone").value;if(!type||!zone){toast("Remplis le type et la zone");return;}fetch("/api/signalements",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+TOKEN},body:JSON.stringify({type:type,zone:zone})}).then(function(){document.getElementById("itype").value="";document.getElementById("izone").value="";toast("Signalement ajoute!");load();});}function statut(id,s){fetch("/api/signalements/"+id,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+TOKEN},body:JSON.stringify({statut:s})}).then(function(){toast("Statut mis a jour!");load();});}function suppr(id){if(!confirm("Supprimer?"))return;fetch("/api/signalements/"+id,{method:"DELETE",headers:{Authorization:"Bearer "+TOKEN}}).then(function(){toast("Supprime!");load();});}function toast(msg){var t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(function(){t.classList.remove("show");},2500);}document.addEventListener("keydown",function(e){if(e.key==="Enter")login();});<\/script></body></html>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('');
  console.log('  Serveur EcoSen demarre!');
  console.log('  http://localhost:' + PORT);
  console.log('');
  console.log('  admin / ecosen2025');
  console.log('  operateur / op1234');
  console.log('');
});
