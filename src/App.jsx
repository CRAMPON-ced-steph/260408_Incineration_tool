import React, { useState, useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import des composants
import Flow from './Main_FLOW';

//import Flow from './Main_MultiFlow';

import EmailManagementModal from './E_Gestion_acces/EmailManagementModal';
import EmailVerification from './E_Gestion_acces/EmailVerification';

// Import du fichier de configuration des emails
import { EMAILS_CONFIG } from './E_Gestion_acces/ListeEmailAccess';

// Import du service OPEX
import { writeDefaultsToStorage, initFromStorage } from './A_Transverse_fonction/opexDataService';

const adminEmail = "Cr@ph@el_2014!!";

// Apps Script comme source des emails autorisés (sheet Drive privé)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzr3xGh0uqUppPuEf_2btR5oXQBe2SSFt4F2Ll-byCXF_JfvJSRQ8Z-617xUN5RzYvH/exec";
const POLL_INTERVAL_MS = 60_000; // re-synchronisation avec le sheet toutes les 60 s
export const GSHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/1051SBIOjr-ccUZJs8QezQTv8FfvIh3Oj1Aent2enPjQ/edit`;

// Emails permanents (fallback si le script est inaccessible)
const PERMANENT_AUTHORIZED_EMAILS = EMAILS_CONFIG.PERMANENT_EMAILS.map(email => ({
  ...email,
  validUntil: new Date(email.validUntil)
}));

// Parse la réponse JSON du Apps Script
const parseSheetJSON = (data) => {
  if (!Array.isArray(data)) return [];
  return data
    .filter(obj => obj.email && String(obj.email).includes('@'))
    .map(obj => ({
      email: String(obj.email).trim(),
      validUntil: new Date(obj.validUntil || '2099-12-31'),
      permanent: obj.permanent === true || obj.permanent === 'true' || obj.permanent === 'TRUE',
      addedBy: obj.addedBy || 'gsheet'
    }));
};

// Fetch JSONP — contourne le CORS d'Apps Script
const fetchJsonp = (url) => new Promise((resolve, reject) => {
  const cbName = '__gscb_' + Date.now();
  const script = document.createElement('script');
  const timer = setTimeout(() => {
    delete window[cbName];
    document.body.removeChild(script);
    reject(new Error('JSONP timeout'));
  }, 10000);
  window[cbName] = (data) => {
    clearTimeout(timer);
    delete window[cbName];
    document.body.removeChild(script);
    resolve(data);
  };
  script.onerror = () => {
    clearTimeout(timer);
    delete window[cbName];
    document.body.removeChild(script);
    reject(new Error('Script load error'));
  };
  script.src = `${url}?callback=${cbName}`;
  document.body.appendChild(script);
});

// Source de vérité = permanents + sheet uniquement (pas de cache localStorage)
const getAuthorizedEmails = (sheetEmails = []) => {
  return [...PERMANENT_AUTHORIZED_EMAILS, ...sheetEmails];
};


function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showEmailManagement, setShowEmailManagement] = useState(false);
  const [sheetEmails, setSheetEmails] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(true);
  const [authorizedEmails, setAuthorizedEmails] = useState(() => getAuthorizedEmails([]));
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("authorizedEmail") || "");

  // Refs pour lire les valeurs courantes dans le callback du polling
  const isAuthorizedRef = useRef(isAuthorized);
  const currentUserRef  = useRef(currentUser);
  useEffect(() => { isAuthorizedRef.current = isAuthorized; }, [isAuthorized]);
  useEffect(() => { currentUserRef.current  = currentUser;  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem("authorizedEmail");
    localStorage.removeItem("authorizedEmailValidUntil");
    setIsAuthorized(false);
    setCurrentUser("");
  };

  // Fetch initial + polling toutes les 60 s
  useEffect(() => {
    const fetchSheetEmails = async () => {
      try {
        const data   = await fetchJsonp(APPS_SCRIPT_URL);
        const parsed = parseSheetJSON(data);
        const emails = getAuthorizedEmails(parsed);
        setSheetEmails(parsed);
        setAuthorizedEmails(emails);

        // Re-valider l'utilisateur connecté à chaque synchronisation
        if (isAuthorizedRef.current && currentUserRef.current) {
          const stillValid = emails.find(
            e => e.email === currentUserRef.current && new Date() <= new Date(e.validUntil)
          );
          if (!stillValid) {
            // Email supprimé ou expiré dans le sheet → déconnexion immédiate
            handleLogout();
          }
        }
      } catch (err) {
        console.warn("Apps Script inaccessible, mode dégradé (emails permanents uniquement):", err.message);
        setAuthorizedEmails(getAuthorizedEmails([]));
      } finally {
        setSheetLoading(false);
      }
    };

    fetchSheetEmails();
    const interval = setInterval(fetchSheetEmails, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-login après chargement initial du sheet
  useEffect(() => {
    if (sheetLoading) return;
    const savedEmail      = localStorage.getItem("authorizedEmail");
    const savedValidUntil = localStorage.getItem("authorizedEmailValidUntil");

    if (savedEmail && savedValidUntil) {
      const match = authorizedEmails.find(
        auth => auth.email === savedEmail && new Date() <= new Date(savedValidUntil)
      );
      if (match) {
        setIsAuthorized(true);
        setCurrentUser(savedEmail);
      } else {
        localStorage.removeItem("authorizedEmail");
        localStorage.removeItem("authorizedEmailValidUntil");
      }
    }
  }, [sheetLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize OPEX defaults on component mount
  useEffect(() => {
    writeDefaultsToStorage(); // écrit les valeurs par défaut si absentes
    initFromStorage();        // charge le service depuis localStorage
  }, []);

  const handleAuthorize = (authorized, email = "") => {
    setIsAuthorized(authorized);
    if (authorized && email) {
      setCurrentUser(email);
    }
  };

  if (sheetLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '12px', color: '#666' }}>
        <div style={{ fontSize: '16px' }}>Chargement des accès...</div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      {isAuthorized ? (
        <>
          <Flow
            currentUser={currentUser}
            adminEmail={adminEmail}
            authorizedEmails={authorizedEmails}
            onUpdateEmails={setAuthorizedEmails}
            onShowEmailManagement={() => setShowEmailManagement(true)}
            onLogout={handleLogout}
          />

          {showEmailManagement && (
            <EmailManagementModal
              onClose={() => setShowEmailManagement(false)}
              currentEmails={authorizedEmails}
              gsheetEditUrl={GSHEET_EDIT_URL}
            />
          )}
        </>
      ) : (
        <EmailVerification onAuthorize={handleAuthorize} authorizedEmails={authorizedEmails} />
      )}
    </ReactFlowProvider>
  );
}

export default App;