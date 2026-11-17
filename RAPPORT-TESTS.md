# Rapport de vérification — Camara Moussa Tradipraticien v1.5

Date de vérification : 3 novembre 2026

## Résultats exécutés

- `npm run check` : réussi — vérification syntaxique de `server.js`, `public/app.js`, `public/admin-auth.js` et `public/admin-dashboard.js`.
- `npm test` : réussi — 8/8 vérifications d'intégration automatisées.

## Scénarios couverts par les 8 tests

1. L'API de statut répond.
2. La création du compte responsable fonctionne.
3. Une demande de rendez-vous valide est enregistrée.
4. Une demande active en doublon pour le même nom, la même date, le même moment et le même mode de contact est refusée.
5. Une date de calendrier impossible est rejetée.
6. Le report de la date et du moment est enregistré.
7. Le changement de statut est enregistré.
8. Le tableau de bord API relit le rendez-vous avec les nouvelles valeurs.

## Limites

Les tests ont été exécutés localement dans un environnement Node.js isolé, avec des données temporaires. Ils ne constituent pas un test sur iPhone, ni un test de déploiement Internet, ni un audit de sécurité complet. Aucun rendez-vous réel n'a été utilisé. Le stockage reste dans `private-data/` et doit être configuré sur un volume persistant avant tout usage en ligne.
