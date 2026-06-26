const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

// Connexion MySQL
const pool = mysql.createPool(process.env.MYSQL_URL);

// Créer les tables au démarrage
async function initialiserDB() {
  const conn = await pool.getConnection();
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nom_utilisateur VARCHAR(100) NOT NULL UNIQUE,
      mot_de_passe VARCHAR(255) NOT NULL,
      role ENUM('admin', 'operateur', 'citoyen') DEFAULT 'citoyen',
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS signalements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      zone VARCHAR(100) NOT NULL,
      statut ENUM('En attente', 'En cours', 'Traite') DEFAULT 'En attente',
      date DATE NOT NULL,
      utilisateur_id INT,
      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
    )
  `);

  // Insérer admin par défaut si pas encore créé
  const [rows] = await conn.execute("SELECT * FROM utilisateurs WHERE nom_utilisateur = 'admin'");
  if (rows.length === 0) {
    await conn.execute(
      "INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe, role) VALUES (?, ?, ?)",
      ['admin', 'ecosen2025', 'admin']
    );
    await conn.execute(
      "INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe, role) VALUES (?, ?, ?)",
      ['operateur', 'op1234', 'operateur']
    );

    // Insérer signalements de démo
    const signalements = [
      ['Dechets sauvages', 'Dakar Plateau', 'En attente', '2025-06-20'],
      ['Deversement illegal', 'Pikine', 'Traite', '2025-06-19'],
      ['Pollution air', 'Guediawaye', 'En cours', '2025-06-18'],
      ['Dechets sauvages', 'Rufisque', 'En attente', '2025-06-17'],
      ['Eau contaminee', 'Thies', 'Traite', '2025-06-16'],
    ];
    for (const s of signalements) {
      await conn.execute(
        "INSERT INTO signalements (type, zone, statut, date) VALUES (?, ?, ?, ?)",
        s
      );
    }
  }

  conn.release();
  console.log('✅ Base de données initialisée');
}

// Fonctions JWT simples
function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    username: user.nom_utilisateur,
    role: user.role,
    exp: Date.now() + 86400000
  })).toString('base64');
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

// ===== ROUTES =====

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.execute(
    "SELECT * FROM utilisateurs WHERE nom_utilisateur = ? AND mot_de_passe = ?",
    [username, password]
  );
  if (rows.length === 0) return res.status(401).json({ error: 'Identifiants incorrects' });
  const user = rows[0];
  const token = createToken(user);
  res.json({ token, username: user.nom_utilisateur, role: user.role });
});

// Stats
app.get('/api/stats', auth, async (req, res) => {
  const [total] = await pool.execute("SELECT COUNT(*) as total FROM signalements");
  const [enAttente] = await pool.execute("SELECT COUNT(*) as nb FROM signalements WHERE statut = 'En attente'");
  const [traites] = await pool.execute("SELECT COUNT(*) as nb FROM signalements WHERE statut = 'Traite'");
  const [enCours] = await pool.execute("SELECT COUNT(*) as nb FROM signalements WHERE statut = 'En cours'");
  const t = total[0].total;
  res.json({
    total: t,
    enAttente: enAttente[0].nb,
    traites: traites[0].nb,
    enCours: enCours[0].nb,
    tauxTraitement: t > 0 ? Math.round((traites[0].nb / t) * 100) : 0
  });
});

// Liste signalements
app.get('/api/signalements', auth, async (req, res) => {
  const [rows] = await pool.execute("SELECT * FROM signalements ORDER BY date DESC");
  res.json(rows);
});

// Ajouter signalement
app.post('/api/signalements', auth, async (req, res) => {
  const { type, zone, statut, date } = req.body;
  const [result] = await pool.execute(
    "INSERT INTO signalements (type, zone, statut, date) VALUES (?, ?, ?, ?)",
    [type, zone, statut || 'En attente', date]
  );
  res.json({ id: result.insertId, message: 'Signalement ajouté' });
});

// Mettre à jour statut
app.put('/api/signalements/:id', auth, async (req, res) => {
  const { statut } = req.body;
  await pool.execute(
    "UPDATE signalements SET statut = ? WHERE id = ?",
    [statut, req.params.id]
  );
  res.json({ message: 'Statut mis à jour' });
});

// Supprimer signalement
app.delete('/api/signalements/:id', auth, async (req, res) => {
  await pool.execute("DELETE FROM signalements WHERE id = ?", [req.params.id]);
  res.json({ message: 'Signalement supprimé' });
});

// Liste utilisateurs
app.get('/api/utilisateurs', auth, async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, nom_utilisateur, role, date_creation FROM utilisateurs"
  );
  res.json(rows);
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: '✅ EcoSen API en ligne', version: '2.0' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await initialiserDB();
  console.log(`🚀 EcoSen démarré sur le port ${PORT}`);
});
