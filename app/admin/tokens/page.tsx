'use client';

import { useState, useEffect, useCallback } from 'react';

interface Token {
  id: string;
  tokenNumber: number;
  patientName: string;
  phone: string;
  city: string;
  status: 'WAITING' | 'CALLED' | 'COMPLETED';
  createdAt: string;
}

export default function TokenManagementPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [calling, setCalling] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch(`/api/tokens?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchTokens();
    // Refresh every 30s (was 15s). OPD queue updates aren't latency-critical
    // — receptionist sees new tokens within half a minute, which matches
    // typical patient walk-up cadence. Doubling the interval cuts request
    // load on this page in half.
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  const waitingTokens = tokens.filter((t) => t.status === 'WAITING');
  const calledToken = tokens.find((t) => t.status === 'CALLED');
  const completedTokens = tokens.filter((t) => t.status === 'COMPLETED');

  const nowServing = calledToken?.tokenNumber ?? '--';

  const handleCallNext = async () => {
    setCalling(true);
    try {
      const res = await fetch('/api/tokens/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });
      if (res.ok) {
        await fetchTokens();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to call next token');
      }
    } catch (err) {
      console.error('Error calling next token:', err);
      alert('Failed to call next token');
    } finally {
      setCalling(false);
    }
  };

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('Patient name is required');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          date: today,
        }),
      });
      if (res.ok) {
        setPatientName('');
        setPhone('');
        setCity('');
        await fetchTokens();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to add token');
      }
    } catch (err) {
      console.error('Error adding token:', err);
      alert('Failed to add token');
    } finally {
      setAdding(false);
    }
  };

  const openDisplay = () => {
    window.open('/admin/tokens/display', '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', fontSize: '18px', color: '#666' }}>
        Loading tokens...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#1a1a2e' }}>OPD Token Management</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>{formatDate(today)}</p>
        </div>
        <button
          onClick={openDisplay}
          style={{
            padding: '10px 20px',
            background: '#6c5ce7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Display Screen
        </button>
      </div>

      {/* NOW SERVING Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          color: '#fff',
          marginBottom: '24px',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
        }}
      >
        <p style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '3px', opacity: 0.9 }}>
          Now Serving
        </p>
        <p style={{ fontSize: '80px', fontWeight: '800', margin: '0 0 8px 0', lineHeight: 1 }}>
          {nowServing}
        </p>
        {calledToken && (
          <p style={{ fontSize: '18px', margin: '8px 0 0 0', opacity: 0.9 }}>
            {calledToken.patientName}
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, background: '#fff3cd', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#856404' }}>{waitingTokens.length}</p>
          <p style={{ fontSize: '13px', color: '#856404', margin: '4px 0 0 0' }}>Waiting</p>
        </div>
        <div style={{ flex: 1, background: '#d4edda', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#155724' }}>{completedTokens.length}</p>
          <p style={{ fontSize: '13px', color: '#155724', margin: '4px 0 0 0' }}>Completed</p>
        </div>
        <div style={{ flex: 1, background: '#d1ecf1', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#0c5460' }}>{tokens.length}</p>
          <p style={{ fontSize: '13px', color: '#0c5460', margin: '4px 0 0 0' }}>Total</p>
        </div>
      </div>

      {/* Call Next + Add Token Row */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {/* Call Next */}
        <div style={{ flex: '0 0 auto' }}>
          <button
            onClick={handleCallNext}
            disabled={calling || waitingTokens.length === 0}
            style={{
              padding: '16px 40px',
              background: waitingTokens.length === 0 ? '#ccc' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: waitingTokens.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              fontWeight: '700',
              boxShadow: waitingTokens.length === 0 ? 'none' : '0 4px 15px rgba(40, 167, 69, 0.3)',
              height: '100%',
              minHeight: '60px',
            }}
          >
            {calling ? 'Calling...' : 'Call Next Token'}
          </button>
        </div>

        {/* Add Token Form */}
        <form
          onSubmit={handleAddToken}
          style={{
            flex: 1,
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
          }}
        >
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
              Patient Name *
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
              placeholder="Enter patient name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            style={{
              padding: '10px 24px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: adding ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            {adding ? 'Adding...' : 'Add Token'}
          </button>
        </form>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Waiting Queue */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#856404', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Waiting Queue
            <span style={{ background: '#fff3cd', color: '#856404', padding: '2px 10px', borderRadius: '20px', fontSize: '13px' }}>
              {waitingTokens.length}
            </span>
          </h2>
          {waitingTokens.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>No patients waiting</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {waitingTokens.map((token) => (
                <div
                  key={token.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '24px',
                      fontWeight: '800',
                      flexShrink: 0,
                    }}
                  >
                    {token.tokenNumber}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#1a1a2e' }}>{token.patientName}</p>
                    {token.phone && <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0 0' }}>{token.phone}</p>}
                    {token.city && <p style={{ fontSize: '13px', color: '#888', margin: '2px 0 0 0' }}>{token.city}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#155724', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Completed
            <span style={{ background: '#d4edda', color: '#155724', padding: '2px 10px', borderRadius: '20px', fontSize: '13px' }}>
              {completedTokens.length}
            </span>
          </h2>
          {completedTokens.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>No completed tokens yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completedTokens.map((token) => (
                <div
                  key={token.id}
                  style={{
                    background: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: '#28a745',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '24px',
                      fontWeight: '800',
                      flexShrink: 0,
                    }}
                  >
                    {token.tokenNumber}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#155724' }}>{token.patientName}</p>
                    {token.phone && <p style={{ fontSize: '13px', color: '#1e7e34', margin: '2px 0 0 0' }}>{token.phone}</p>}
                    {token.city && <p style={{ fontSize: '13px', color: '#1e7e34', margin: '2px 0 0 0' }}>{token.city}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
