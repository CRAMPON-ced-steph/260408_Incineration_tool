// src/E_Gestion_acces/ListeEmailAccess.js
// Fichier de configuration pour les emails autorisés

export const EMAILS_CONFIG = {
  // Emails permanents (ne peuvent pas être supprimés via l'interface)
  PERMANENT_EMAILS: [
    {
      email: "Cr@ph@el_2014!!",
      validUntil: "2099-12-31",
      permanent: true,
      addedBy: "system",
      addedDate: "2024-01-01"
    }
  ],

  // Configuration par défaut pour les nouveaux emails
  DEFAULT_CONFIG: {
    validityPeriodMonths: 6, // Durée par défaut en mois
    autoCleanup: true, // Nettoyer automatiquement les emails expirés
    maxEmails: 50 // Nombre maximum d'emails autorisés
  }
};

// Version du fichier de configuration (pour la compatibilité)
export const CONFIG_VERSION = "1.0.0";
