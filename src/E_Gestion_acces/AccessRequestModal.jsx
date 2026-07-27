import React, { useState } from 'react';
import { getAuthTranslations } from './auth_traduction';
import { getLanguageCode } from '../F_Gestion_Langues/Fonction_Traduction';

function AccessRequestModal({ onClose, adminEmail = "cedric.crampon@gmail.com" }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const langCode = getLanguageCode(localStorage.getItem('selectedLanguage') || 'fr');
  const t = getAuthTranslations(langCode);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError(t.validEmail);
      return;
    }

    const subject = encodeURIComponent(t.mailSubject);
    const body = encodeURIComponent(
      `${t.mailGreeting}\n\n` +
      `${t.mailBody1}\n\n` +
      `${t.mailMyEmail} ${email}\n\n` +
      `${t.mailMessage} ${message || t.mailNoMessage}\n\n` +
      `${t.mailThanks}\n\n` +
      `${t.mailRegards}`
    );

    const mailtoLink = `mailto:${adminEmail}?subject=${subject}&body=${body}`;

    try {
      window.location.href = mailtoLink;
      setSuccess(t.requestPrepared);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError(`${t.emailErrorPrefix}${adminEmail}${t.emailErrorSuffix}`);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        width: '500px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2>{t.requestTitle}</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          {t.requestDesc}
        </p>

        <form onSubmit={handleSubmitRequest}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {t.yourEmail}
            </label>
            <input
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: error ? '1px solid red' : '1px solid #ccc',
                fontSize: '14px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {t.messageLabel}
            </label>
            <textarea
              placeholder={t.messagePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'red', marginBottom: '15px', fontSize: '14px' }}>
              {error}
            </p>
          )}

          {success && (
            <p style={{ color: 'green', marginBottom: '15px', fontSize: '14px' }}>
              {success}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#607D8B',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t.send}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccessRequestModal;
