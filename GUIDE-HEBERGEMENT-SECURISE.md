# Guide de mise en ligne sécurisée

## Avant publication
- Utiliser un serveur privé maintenu et un domaine contrôlé par le responsable.
- Mettre Node.js à jour et exécuter le service avec un compte système non privilégié.
- Garder `private-data/` en dehors du dossier public et limiter les permissions.
- Mettre le service derrière un reverse proxy HTTPS (Nginx ou Caddy) avec certificat TLS.
- Ajouter une politique de sauvegarde chiffrée et tester une restauration.
- Ne jamais publier les fichiers `private-data/admin.json` et `private-data/appointments.json`.

## Configuration
Le serveur écoute par défaut sur `127.0.0.1:3000`. En production, conserver cette écoute locale et configurer le reverse proxy pour transmettre le trafic HTTPS vers ce port. N'expose pas le port 3000 directement à Internet.

## Limites à connaître
Cette archive ne provisionne pas de serveur cloud, de domaine ni de certificat. La fonction de rappel WhatsApp ouvre un message à envoyer manuellement; l'envoi automatique nécessiterait l'API officielle WhatsApp Business et des identifiants protégés côté serveur.
