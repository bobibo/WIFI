const express = require('express');
const wifi = require('node-wifi');
const app = express();
const port = 3000;

// Initialisation du module (obligatoire avant utilisation)
wifi.init({
  iface: null // Interface réseau, null signifie utiliser l'interface par défaut
});

// Objet pour garder une trace des SSID déjà affichés
let displayedSSIDs = {};

// Fonction pour évaluer la qualité du réseau
function getNetworkQuality(signalLevel) {
  if (signalLevel >= -50) {
    return "Excellent";
  } else if (signalLevel >= -60) {
    return "Bon";
  } else if (signalLevel >= -70) {
    return "Moyen";
  } else if (signalLevel >= -88) {
    return "Faible";
  } else if (signalLevel < -88) { // Mettons la limite à -80 dBm (vous pouvez ajuster selon votre préférence)
    return "Très faible";
  } else {
    return "Inconnu"; // Pour les valeurs de signalLevel négatives non couvertes par les conditions ci-dessus
  }
}

// Fonction pour scanner les réseaux Wi-Fi disponibles
function scanWiFi() {
  return new Promise((resolve, reject) => {
    wifi.scan((error, networks) => {
      if (error) {
        reject(error);
      } else {
        const wifiList = networks.filter(network => {
          // Vérifier si le SSID n'a pas déjà été affiché
          if (!displayedSSIDs[network.ssid]) {
            displayedSSIDs[network.ssid] = true; // Marquer le SSID comme affiché
            return true;
          }
          return false;
        }).map(network => ({
          ssid: network.ssid,
          signal_level: network.signal_level,
          quality: getNetworkQuality(network.signal_level)
        }));
        resolve(wifiList);
      }
    });
  });
}

// Route pour servir la page HTML avec les réseaux Wi-Fi
app.get('/', (req, res) => {
  displayedSSIDs = {}; // Vider la liste des SSID déjà affichés à chaque nouvelle requête
  scanWiFi()
    .then(wifiList => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réseaux Wi-Fi disponibles</title>
          <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
          <h1>Réseaux Wi-Fi disponibles :</h1>
          <ul id="wifiList">
            ${wifiList.map(network => `<li class="signal-${network.quality.toLowerCase()}">SSID : ${network.ssid}, Signal : ${network.signal_level} dBm, Qualité : ${network.quality}</li>`).join('')}
          </ul>
          <script>
            const displayedSSIDs = ${JSON.stringify(displayedSSIDs)}; // Récupère les SSID déjà affichés depuis le serveur
          </script>
        </body>
        </html>
      `;
      res.send(html);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Une erreur est survenue lors du scan des réseaux Wi-Fi');
    });
});

// Définition de la route pour servir le fichier CSS
app.get('/styles.css', (req, res) => {
  res.sendFile(__dirname + '/styles.css');
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur en cours d'écoute sur http://localhost:${port}`);
});
