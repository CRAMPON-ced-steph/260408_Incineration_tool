/* eslint-disable react/prop-types */
import React from 'react';
import { getAuthTranslations } from './auth_traduction';
import { getLanguageCode } from '../F_Gestion_Langues/Fonction_Traduction';

const formatDate = (date) => {
  try { return new Date(date).toISOString().split('T')[0]; } catch { return '—'; }
};

function EmailManagementModal({ onClose, currentEmails, gsheetEditUrl }) {
  const langCode = getLanguageCode(localStorage.getItem('selectedLanguage') || 'fr');
  const t = getAuthTranslations(langCode);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        width: '700px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>{t.managementTitle}</h2>

        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#E3F2FD', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#1565C0' }}>
            {t.gsheetInfo}
          </span>
          <a
            href={gsheetEditUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              backgroundColor: '#1976D2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              fontSize: '14px'
            }}
          >
            {t.openGsheet}
          </a>
        </div>

        <h3>{t.authorizedUsers} ({currentEmails.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>{t.colEmail}</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>{t.colValidUntil}</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>{t.colSource}</th>
            </tr>
          </thead>
          <tbody>
            {currentEmails.map((item, index) => (
              <tr key={index}>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{item.email}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{formatDate(item.validUntil)}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#888', fontSize: '13px' }}>
                  {item.permanent ? t.srcPermanent : item.addedBy === 'gsheet' ? t.srcGsheet : t.srcTemporary}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', backgroundColor: '#607D8B', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailManagementModal;
