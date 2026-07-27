/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import AccessRequestModal from './AccessRequestModal';
import { getAuthTranslations } from './auth_traduction';
import { getLanguageCode } from '../F_Gestion_Langues/Fonction_Traduction';

function EmailVerification({ onAuthorize, authorizedEmails = [] }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [showAccessRequest, setShowAccessRequest] = useState(false);

  const langCode = getLanguageCode(localStorage.getItem('selectedLanguage') || 'fr');
  const t = getAuthTranslations(langCode);

  const handleSubmit = (e) => {
    e.preventDefault();

    const authorizedEmail = authorizedEmails.find(
      auth => auth.email === email && new Date() <= auth.validUntil
    );

    if (authorizedEmail) {
      localStorage.setItem("authorizedEmail", email);
      localStorage.setItem("authorizedEmailValidUntil", authorizedEmail.validUntil.toISOString());
      onAuthorize(true, email);
    } else {
      setError(t.accessDenied);
    }
  };

  const toggleEmailVisibility = () => {
    setShowEmail(!showEmail);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>{t.restrictedAccess}</h2>
        <form onSubmit={handleSubmit} style={{ marginTop: '10px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <input
              type={showEmail ? "text" : "password"}
              placeholder={t.enterEmail}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              style={{
                padding: '8px',
                paddingRight: '30px',
                borderRadius: '4px',
                border: error ? '1px solid red' : '1px solid #ccc',
                width: '250px'
              }}
              required
            />
            <span
              onClick={toggleEmailVisibility}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {showEmail ? '👁️' : '👁️‍🗨️'}
            </span>
          </div>
          <button
            type="submit"
            style={{
              marginLeft: '10px',
              padding: '8px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {t.verify}
          </button>
        </form>

        {error && (
          <p style={{ color: 'red', marginTop: '10px' }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
            {t.noAccess}
          </p>
          <button
            onClick={() => setShowAccessRequest(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {t.requestAccess}
          </button>
        </div>
      </div>

      {showAccessRequest && (
        <AccessRequestModal onClose={() => setShowAccessRequest(false)} />
      )}
    </div>
  );
}

export default EmailVerification;
