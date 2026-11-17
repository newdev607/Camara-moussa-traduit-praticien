# Camara Moussa, Tradipraticien — version 1.7

Site vitrine bilingue (français/anglais), responsive, avec formulaire de rendez-vous et espace privé de gestion. Cette version conserve les fonctions précédentes et renforce le parcours de demande et le suivi des rendez-vous.

## Nouveautés de la version 1.7
- Formulaire de rendez-vous plus clair : bouton désactivé pendant l’enregistrement, indication de progression et messages distincts en cas de succès, de doublon ou d’échec serveur.
- Une demande enregistrée sur le serveur est ensuite préparée dans WhatsApp ; la personne doit encore appuyer sur « Envoyer ». Le rendez-vous n’est jamais confirmé automatiquement.
- Gestion du statut « terminée » dans l’espace privé, avec compteur et action dédiée.
- Export CSV renforcé contre l’injection de formules dans les tableurs.
- Conservation du design vert forêt, ivoire et or doux, du site bilingue, des filtres, de la recherche, du calendrier, des reports, des sauvegardes et des exports.

## Lancer dans Termux
```bash
node server.js
```
Puis ouvrir `http://127.0.0.1:3000`.

## Créer le compte responsable
1. Ouvre `http://127.0.0.1:3000/admin`.
2. À la première visite, crée un identifiant et un mot de passe de **12 caractères minimum**.
3. Garde ces identifiants privés. Le mot de passe est stocké sous forme de dérivé cryptographique, pas en clair.
4. Une fois connecté, le tableau de bord est à `/admin/dashboard`.

## Fonctionnalités de l’espace privé
- Voir les demandes de rendez-vous envoyées depuis le formulaire du site.
- Marquer une demande comme « confirmée », « refusée » ou « en attente ».
- Déconnexion et session à durée limitée.
- Données stockées localement dans `private-data/appointments.json`; compte dans `private-data/admin.json`.
- Les fichiers privés sont exclus du dépôt Git et reçoivent des permissions restrictives quand le système le permet.

## Limites importantes
- **Cette version fonctionne localement sur le téléphone qui exécute Termux.** Comme le serveur écoute sur `127.0.0.1`, ton père ne peut pas encore se connecter à distance depuis un autre téléphone. Pour cela, il faudra héberger le site sur un serveur HTTPS public et utiliser un stockage persistant sécurisé.
- Les demandes envoyées par WhatsApp ne sont pas automatiquement importées : seules les demandes envoyées depuis le formulaire lorsque le serveur peut répondre sont enregistrées.
- Les demandes stockées localement ne sont pas synchronisées entre appareils et ne sont pas sauvegardées dans le cloud. Fais des sauvegardes protégées de `private-data/`.
- Ce prototype n’est pas encore un service public prêt à héberger : avant mise en ligne, ajouter HTTPS, protection contre les abus, sauvegardes, politique de confidentialité et tests de sécurité.
- Ne collecte pas de détails médicaux dans le formulaire. Le site ne pose pas de diagnostic et ne promet aucune guérison. Les maladies graves et les symptômes urgents nécessitent une évaluation médicale qualifiée.

## Coordonnées affichées
WhatsApp : +225 05 46 35 11 82  
Téléphone : +225 07 97 32 87 31  
Abidjan, Abobo PK 18, derrière le pont, carrefour Diallo.


## Tableau de bord mis à jour (v1.3.0)

Le tableau de bord privé comprend des compteurs par statut, une recherche par nom, des filtres par statut et date souhaitée, des liens WhatsApp et appel du centre, la modification du statut, un export CSV compatible avec Excel et l'impression du tableau en PDF via la fonction d'impression du navigateur. Les exports contiennent les demandes filtrées uniquement.

Les demandes sont stockées localement dans `private-data/`. Le serveur écoute par défaut sur `127.0.0.1` : l'espace privé n'est donc accessible que depuis le même appareil. Ne publiez pas ce serveur sur Internet sans mise en place d'un hébergement HTTPS et d'une configuration de sécurité adaptée.


## Version 1.4 — nouveautés
- Tableau de bord avec recherche, filtres, compteurs, liens WhatsApp/appel, export CSV compatible Excel et impression PDF.
- Vue calendrier quotidienne et configuration des horaires du centre.
- Changement de mot de passe (12 caractères minimum).
- Sauvegarde JSON téléchargeable et restauration contrôlée des rendez-vous/horaires.
- Données privées dans `private-data/`, protégées par permissions restrictives sur les systèmes compatibles.

## Installation Android / Termux
1. Installer Node.js : `pkg install nodejs`
2. Extraire ce ZIP dans un dossier privé de Termux.
3. Entrer dans le dossier contenant `server.js`.
4. Lancer `node server.js`.
5. Ouvrir `http://127.0.0.1:3000`, puis `http://127.0.0.1:3000/admin`.
6. À la première ouverture, créer un compte responsable avec un mot de passe unique d'au moins 12 caractères.

Aucune dépendance npm externe n'est requise. Ne partage pas `private-data/admin.json`, `private-data/appointments.json` ou les sauvegardes.

## Sauvegarde et restauration
Dans le tableau de bord, utilise « Télécharger une sauvegarde » régulièrement et conserve le JSON dans un emplacement privé. La restauration remplace les rendez-vous et horaires actuels : télécharge d'abord une sauvegarde récente.

## WhatsApp et rappels
Les boutons ouvrent WhatsApp avec un message prérempli ou l'application téléphone. L'envoi reste manuel : le site ne peut pas envoyer automatiquement des messages WhatsApp ni des rappels en arrière-plan sans intégration officielle et service hébergé.

## Hébergement HTTPS
Le projet écoute par défaut sur `127.0.0.1` pour éviter d'exposer le serveur directement sur le réseau. Pour l'accès à distance, déploie-le sur un serveur privé maintenu, derrière un reverse proxy HTTPS (par exemple Nginx/Caddy) et conserve `private-data/` hors du répertoire public. Configure les sauvegardes chiffrées, les mises à jour du système et un domaine HTTPS. Ne publie pas le serveur Node directement sur Internet, ne partage pas les clés ou mots de passe et teste la restauration avant d'utiliser les données réelles.

Cette archive prépare le projet pour un hébergement sécurisé mais ne crée pas à elle seule un compte d'hébergement, un nom de domaine ou un certificat TLS.


## Version 1.5 — gestion avancée des rendez-vous
- Report d'une demande depuis l'espace responsable : modification de la date et du moment souhaités, avec confirmation avant enregistrement.
- Détection des doublons actifs pour le même nom, la même date, le même moment et le même mode de contact, côté serveur. Les demandes refusées ou terminées ne bloquent pas une nouvelle demande.
- Filtre « Terminées » ajouté au tableau de bord.
- Validation renforcée des dates réelles (ex. une date impossible est rejetée).
- Les demandes ne sont pas automatiquement confirmées lors d'un report ; il faut prévenir le patient séparément.

### Notes de test
Le ZIP contient un script `npm run check` qui vérifie la syntaxe JavaScript. Cette vérification ne remplace pas un test complet de déploiement. Le stockage des rendez-vous reste dans `private-data/` et nécessite un volume persistant sur l'hébergement choisi.


## Vérifications effectuées pour la version 1.7
- `npm run check` : réussi (vérification de syntaxe des fichiers JavaScript).
- `npm test` : réussi, 8 tests d’intégration sur 8.
- Ces vérifications ne constituent pas un audit de sécurité et ne prouvent pas qu’un hébergement public est opérationnel.

## Avant toute mise en ligne
Le ZIP ne déploie pas le site et ne crée ni hébergement ni nom de domaine. Pour un accès depuis plusieurs téléphones, il faudra un hébergement HTTPS correctement configuré, un stockage persistant et des sauvegardes. Le serveur écoute par défaut sur `127.0.0.1` : ne le publie pas directement sur Internet.
