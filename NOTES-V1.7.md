# Notes de version 1.7

Cette version reprend la base du projet et conserve les fonctions existantes.

## Améliorations
- Parcours formulaire plus explicite avec état de chargement et gestion des erreurs.
- Refus explicite d’un doublon actif afin d’éviter une double demande identique.
- Statut « terminée » visible dans les compteurs et les actions du tableau de bord.
- Protection des exports CSV contre les cellules interprétées comme des formules par les tableurs.
- Maintien du site bilingue, du design vert forêt/ivoire/or doux, du tableau de bord privé, des filtres, du report, du calendrier, des sauvegardes et des exports.

## Résultats de vérification
- `npm run check` : réussi.
- `npm test` : 8/8 tests d’intégration réussis.

## Limites inchangées
- WhatsApp s’ouvre avec un texte préparé ; l’utilisateur doit appuyer sur Envoyer.
- Les demandes sont enregistrées par le serveur seulement si le site est servi depuis ce serveur.
- Pas de synchronisation cloud automatique, pas de notification WhatsApp automatique et pas de déploiement public inclus.
- Avant la mise en ligne : hébergement HTTPS, stockage persistant, sauvegardes, politique de confidentialité et audit de sécurité.
