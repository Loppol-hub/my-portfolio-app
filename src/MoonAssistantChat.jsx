import React, { useState, useEffect, useRef } from 'react';

export default function MoonAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [assetSubView, setAssetSubView] = useState(null); 
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);

  const [watchlist, setWatchlist] = useState([]);
  const [newAsset, setNewAsset] = useState({ name: '', condition: '<=', price: '', reason: '' });
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [fileContent, setFileContent] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const importFileRef = useRef(null);

  // ฟังก์ชันตรวจสอบราคา Watchlist โดยดึงจาก API ภายนอกโดยตรง
  const checkWatchlistAlerts = async (currentWatchlist) => {
    if (!currentWatchlist || currentWatchlist.length === 0) return;
    try {
      const response = await fetch('https://portfolio-price-backend.vercel.app/api/prices');
      const data = await response.json();
      
      let priceMap = {};
      if (Array.isArray(data)) {
        data.forEach(item => {
          const key = String(item.symbol || item.ticker || item.name || '').trim().toUpperCase();
          const val = parseFloat(item.price || item.currentPrice || 0);
          if (key) priceMap[key] = val;
        });
      } else if (data && typeof data === 'object') {
        Object.keys(data).forEach(k => {
          priceMap[k.trim().toUpperCase()] = parseFloat(data[k]);
        });
      }

      let triggeredAlerts = [];
      const updatedWatchlist = currentWatchlist.map(item => {
        const itemName = String(item.name || '').trim().toUpperCase();
        const currentPrice = priceMap[itemName] || 0;
        
        if (currentPrice > 0) {
          const targetPrice = parseFloat(item.price || 0);
          const condition = item.condition || '<=';

          let isConditionMet = false;
          if (condition === '<=' && currentPrice <= targetPrice) {
            isConditionMet = true;
          } else if (condition === '>=' && currentPrice >= targetPrice) {
            isConditionMet = true;
          }

          if (isConditionMet && !item.alerted) {
            triggeredAlerts.push(`🚨 แจ้งเตือน Watchlist: สินทรัพย์ [${item.name}] ราคาปัจจุบันอยู่ที่ ${currentPrice} (${condition} ${targetPrice}) ${item.reason ? `เหตุผล: ${item.reason}` : ''}`);
            return { ...item, alerted: true };
          }
        }
        return item;
      });

      if (triggeredAlerts.length > 0) {
        setMessages(prev => [
          ...prev,
          ...triggeredAlerts.map(alertText => ({ sender: 'ai', text: alertText }))
        ]);
        setWatchlist(updatedWatchlist);
        localStorage.setItem('moon_watchlist', JSON.stringify(updatedWatchlist));
      }
    } catch (err) {
      // ป้องกัน Error เงียบๆ ไม่ให้เว็บพัง
    }
  };

  useEffect(() => {
    const fetchHoldingsAsync = async () => {
      try {
        if (window.storage && typeof window.storage.get === 'function') {
          const r = await window.storage.get('holdings', false);
          if (r && r.value) {
            const parsed = JSON.parse(r.value);
            if (Array.isArray(parsed)) {
              setPortfolioHoldings(parsed);
              return;
            }
          }
        }
        const stored = localStorage.getItem('holdings');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setPortfolioHoldings(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
    };

    if (isOpen) {
      fetchHoldingsAsync();
      const currentWL = JSON.parse(localStorage.getItem('moon_watchlist') || '[]');
      checkWatchlistAlerts(currentWL);
    }
  }, [isOpen]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleMouseDown = (e) => {
      startX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
      startY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    };

    const handleMouseUp = (e) => {
      const endX = e.clientX || (e.changedTouches ? e.changedTouches[0].clientX : 0);
      const endY = e.clientY || (e.changedTouches ? e.changedTouches[0].clientY : 0);
      const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

      if (distance < 5) {
        setIsOpen(true);
      }
    };

    const astronautEl = document.querySelector('.moon-float');
    if (astronautEl) {
      astronautEl.addEventListener('mousedown', handleMouseDown);
      astronautEl.addEventListener('mouseup', handleMouseUp);
      astronautEl.addEventListener('touchstart', handleMouseDown);
      astronautEl.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      if (astronautEl) {
        astronautEl.removeEventListener('mousedown', handleMouseDown);
        astronautEl.removeEventListener('mouseup', handleMouseUp);
        astronautEl.removeEventListener('touchstart', handleMouseDown);
        astronautEl.removeEventListener('touchend', handleMouseUp);
      }
    };
  }, []);

  useEffect(() => {
    const savedChat = localStorage.getItem('moon_chat_history');
    const savedTime = localStorage.getItem('moon_chat_timestamp');
    const now = new Date().getTime();

    if (savedChat && savedTime) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (now - parseInt(savedTime) < thirtyDays) {
        setMessages(JSON.parse(savedChat));
      } else {
        localStorage.removeItem('moon_chat_history');
        localStorage.removeItem('moon_chat_timestamp');
      }
    }

    const savedWatchlist = localStorage.getItem('moon_watchlist');
    if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));

    const savedPrompt = localStorage.getItem('moon_custom_prompt');
    if (savedPrompt) setCustomPrompt(savedPrompt);

    checkFirstOpenToday();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('moon_chat_history', JSON.stringify(messages));
      localStorage.setItem('moon_chat_timestamp', new Date().getTime().toString());
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkFirstOpenToday = async () => {
    const lastGreeting = localStorage.getItem('moon_last_greeting');
    const today = new Date().toDateString();

    if (lastGreeting !== today) {
      localStorage.setItem('moon_last_greeting', today);
      await triggerBackendAction('greeting', 'สวัสดีครับผู้การ! เปิดระบบผู้ช่วยเรียบร้อยแล้ว รายงานสถานะพอร์ตสั้นๆ ให้ฟังหน่อยครับ');
    }
  };

  const getPortfolioData = () => {
    try {
      const holdings = portfolioHoldings.length > 0 ? portfolioHoldings : (localStorage.getItem('holdings') ? JSON.parse(localStorage.getItem('holdings')) : null);
      const tradeLogs = localStorage.getItem('trade-logs') ? JSON.parse(localStorage.getItem('trade-logs')) : null;
      const cashLedger = localStorage.getItem('cash-ledger') ? JSON.parse(localStorage.getItem('cash-ledger')) : null;
      return { holdings, tradeLogs, cashLedger };
    } catch (e) {
      return { note: 'ไม่สามารถดึงข้อมูล Storage โดยตรงได้' };
    }
  };

  const triggerBackendAction = async (actionType, customText = '') => {
    setLoading(true);
    const portfolio = getPortfolioData();
    const backendUrl = (window.storage && window.storage.get('backend-url')) || '/api/apianalyze';

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          portfolio,
          userMessage: customText || inputMessage,
          customPrompt,
          fileContent
        }),
      });

      const data = await response.json();
      const aiReply = data.analysis || 'สัญญาณขาดหาย ไม่ได้รับข้อมูลจากฐานทัพครับ';

      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: customText || inputMessage || `[เรียกใช้งานหมวด: ${actionType}]` },
        { sender: 'ai', text: aiReply }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ AI หลังบ้านครับ' }
      ]);
    } finally {
      setLoading(false);
      setInputMessage('');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() && !fileContent) return;
    triggerBackendAction('chat');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `📁 แนบไฟล์/รูปภาพ "${file.name}" เรียบร้อยแล้ว พิมพ์ข้อความสั่งการต่อได้เลยครับ!` }
      ]);
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleAddWatchlist = (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.price) return;
    const updated = [...watchlist, { ...newAsset, name: newAsset.name.toUpperCase(), alerted: false }];
    setWatchlist(updated);
    localStorage.setItem('moon_watchlist', JSON.stringify(updated));
    setNewAsset({ name: '', condition: '<=', price: '', reason: '' });
    setMessages((prev) => [
      ...prev,
      { sender: 'ai', text: `🎯 ตั้งระบบเรดาร์ติดตามราคา ${newAsset.name.toUpperCase()} (${newAsset.condition} ${newAsset.price}) เรียบร้อยครับ!` }
    ]);
  };

  const handleExportData = () => {
    const backupData = {
      chat_history: JSON.parse(localStorage.getItem('moon_chat_history') || '[]'),
      watchlist: JSON.parse(localStorage.getItem('moon_watchlist') || '[]'),
      custom_prompt: localStorage.getItem('moon_custom_prompt') || ''
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moon-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.chat_history) {
          localStorage.setItem('moon_chat_history', JSON.stringify(parsed.chat_history));
          setMessages(parsed.chat_history);
        }
        if (parsed.watchlist) {
          localStorage.setItem('moon_watchlist', JSON.stringify(parsed.watchlist));
          setWatchlist(parsed.watchlist);
        }
        if (parsed.custom_prompt !== undefined) {
          localStorage.setItem('moon_custom_prompt', parsed.custom_prompt);
          setCustomPrompt(parsed.custom_prompt);
        }
        alert('นำเข้าข้อมูลสำเร็จเรียบร้อยครับ!');
      } catch (err) {
        alert('ไฟล์ไม่ถูกต้อง หรือรูปแบบ JSON เสียหาย');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const thStocks = portfolioHoldings.filter(h => h && h.type === 'th_stock' && h.instrumentType !== 'dr');
  const globalStocks = portfolioHoldings.filter(h => h && (h.type === 'foreign_stock' || h.instrumentType === 'dr'));
  const cryptoStocks = portfolioHoldings.filter(h => h && h.type === 'crypto');

  const formatStockLabel = (stock) => {
    const name = String(stock.name || '').trim();
    const ticker = String(stock.ticker || '').trim();
    
    if (!ticker) return name.toUpperCase();
    if (!name) return ticker.toUpperCase();
    
    if (name.toLowerCase() === ticker.toLowerCase()) {
      return ticker.toUpperCase();
    }
    if (name.toLowerCase().includes(ticker.toLowerCase())) {
      return name.toUpperCase();
    }
    
    return `${name} (${ticker})`.toUpperCase();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      zIndex: 99999,
      backgroundColor: '#030712',
      display: 'flex',
      flexDirection: 'column',
      color: '#EDF1F5',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* Header มินิมอล */}
      <div style={{
        padding: '14px 18px',
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px'
            }}
            title="เมนู"
          >
            ☰
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400, letterSpacing: '0.3px' }}>สถานะ</span>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#34d399',
              boxShadow: '0 0 6px #34d399',
              display: 'inline-block'
            }} />
          </div>
        </div>

        <button 
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'color 0.2s'
          }}
          title="ปิด"
        >
          ✕
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: '60px',
            left: '18px',
            backgroundColor: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 100,
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            minWidth: '160px'
          }}>
            {[
              { key: 'chat', label: 'แชททั่วไป' },
              { key: 'health', label: 'สุขภาพพอร์ต' },
              { key: 'assets', label: 'สินทรัพย์' },
              { key: 'news', label: 'ข่าวสาร' },
              { key: 'watchlist', label: 'Watchlist' },
              { key: 'settings', label: 'ตั้งค่า' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setMenuOpen(false); setAssetSubView(null); }}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: activeTab === tab.key ? 500 : 400,
                  backgroundColor: activeTab === tab.key ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                  color: activeTab === tab.key ? '#fbbf24' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* เนื้อหาภายในแท็บ */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        maxWidth: '700px',
        width: '100%',
        margin: '0 auto'
      }}>
        {activeTab === 'chat' && (
          <>
            {messages.map((msg, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  backgroundColor: msg.sender === 'user' ? '#d97706' : '#111827',
                  color: '#fff',
                  borderBottomRightRadius: msg.sender === 'user' ? '4px' : '14px',
                  borderBottomLeftRadius: msg.sender === 'user' ? '14px' : '4px',
                  border: msg.sender === 'ai' ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ backgroundColor: '#111827', color: '#fbbf24', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  กำลังประมวลผล...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}

        {activeTab === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%', maxWidth: '500px' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>สุขภาพพอร์ต</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('deep_analysis', 'วิเคราะห์พอร์ตการลงทุนเชิงลึกให้หน่อยครับ'); }} style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              วิเคราะห์พอร์ตเชิงลึก
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('portfolio_summary', 'สรุปภาพรวมพอร์ตในเดือนนี้ให้หน่อยครับ'); }} style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              สรุปภาพรวมประจำเดือน
            </button>
          </div>
        )}

        {activeTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%', maxWidth: '500px' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>วิเคราะห์สินทรัพย์</h4>

            {assetSubView === 'th' ? (
              <>
                <button onClick={() => setAssetSubView(null)} style={{ textAlign: 'left', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px 0', marginBottom: '4px' }}>
                  ← กลับ
                </button>
                <span style={{ fontSize: '12.5px', color: '#fbbf24', marginBottom: '4px' }}>เลือกหุ้นไทยในพอร์ต ({thStocks.length}):</span>
                {thStocks.length === 0 ? (
                  <span style={{ fontSize: '13px', color: '#64748b' }}>ไม่มีหุ้นไทยในพอร์ต</span>
                ) : (
                  thStocks.map((stock, idx) => {
                    const labelText = formatStockLabel(stock);
                    return (
                      <button 
                        key={stock.id || idx} 
                        onClick={() => { 
                          setActiveTab('chat'); 
                          setAssetSubView(null);
                          triggerBackendAction('asset_analysis', `วิเคราะห์หุ้นไทย ${labelText} ในพอร์ตให้หน่อยครับ`); 
                        }} 
                        style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}
                      >
                        {labelText}
                      </button>
                    );
                  })
                )}
              </>
            ) : assetSubView === 'global' ? (
              <>
                <button onClick={() => setAssetSubView(null)} style={{ textAlign: 'left', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px 0', marginBottom: '4px' }}>
                  ← กลับ
                </button>
                <span style={{ fontSize: '12.5px', color: '#fbbf24', marginBottom: '4px' }}>เลือกหุ้นนอก & DR ในพอร์ต ({globalStocks.length}):</span>
                {globalStocks.length === 0 ? (
                  <span style={{ fontSize: '13px', color: '#64748b' }}>ไม่มีหุ้นนอก/DR ในพอร์ต</span>
                ) : (
                  globalStocks.map((stock, idx) => {
                    const labelText = formatStockLabel(stock);
                    return (
                      <button 
                        key={stock.id || idx} 
                        onClick={() => { 
                          setActiveTab('chat'); 
                          setAssetSubView(null);
                          triggerBackendAction('asset_analysis', `วิเคราะห์หุ้นต่างประเทศหรือ DR ${labelText} ในพอร์ตให้หน่อยครับ`); 
                        }} 
                        style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}
                      >
                        {labelText}
                      </button>
                    );
                  })
                )}
              </>
            ) : assetSubView === 'crypto' ? (
              <>
                <button onClick={() => setAssetSubView(null)} style={{ textAlign: 'left', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px 0', marginBottom: '4px' }}>
                  ← กลับ
                </button>
                <span style={{ fontSize: '12.5px', color: '#fbbf24', marginBottom: '4px' }}>เลือกคริปโตในพอร์ต ({cryptoStocks.length}):</span>
                {cryptoStocks.length === 0 ? (
                  <span style={{ fontSize: '13px', color: '#64748b' }}>ไม่มีคริปโตในพอร์ต</span>
                ) : (
                  cryptoStocks.map((stock, idx) => {
                    const labelText = formatStockLabel(stock);
                    return (
                      <button 
                        key={stock.id || idx} 
                        onClick={() => { 
                          setActiveTab('chat'); 
                          setAssetSubView(null);
                          triggerBackendAction('asset_analysis', `วิเคราะห์คริปโต ${labelText} ในพอร์ตให้หน่อยครับ`); 
                        }} 
                        style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}
                      >
                        {labelText}
                      </button>
                    );
                  })
                )}
              </>
            ) : (
              <>
                <button onClick={() => setAssetSubView('th')} style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
                  หุ้นไทย ({thStocks.length})
                </button>
                <button onClick={() => setAssetSubView('global')} style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
                  หุ้นนอก & DR ({globalStocks.length})
                </button>
                <button onClick={() => setAssetSubView('crypto')} style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
                  คริปโตเคอร์เรนซี ({cryptoStocks.length})
                </button>
                <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์ทิศทางราคาทองคำ'); }} style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
                  ทองคำ
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'news' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%', maxWidth: '500px' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>ข่าวสารพอร์ต</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์ภูมิรัฐศาสตร์โลกที่มีผลต่อพอร์ต'); }} style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              ภูมิรัฐศาสตร์โลก
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์เศรษฐกิจมหภาค โลก-ไทย'); }} style={{ textAlign: 'left', width: '100%', padding: '12px 16px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              เศรษฐกิจมหภาค
            </button>
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', width: '100%', maxWidth: '500px' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500 }}>Watchlist</h4>
            <form onSubmit={handleAddWatchlist} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'transparent', padding: '0', width: '100%' }}>
              <input 
                type="text" 
                placeholder="ชื่อสินทรัพย์ (เช่น BTC)" 
                value={newAsset.name} 
                onChange={(e) => setNewAsset({...newAsset, name: e.target.value.toUpperCase()})} 
                style={{ padding: '10px 12px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', width: '100%' }} 
                required 
              />
              
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <select 
                  value={newAsset.condition} 
                  onChange={(e) => setNewAsset({...newAsset, condition: e.target.value})}
                  style={{ padding: '10px 8px', backgroundColor: '#030712', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fbbf24', fontSize: '13px' }}
                >
                  <option value="<=">&le; (น้อยกว่า/เท่ากับ)</option>
                  <option value=">=">&ge; (มากกว่า/เท่ากับ)</option>
                </select>
                <input 
                  type="number" 
                  placeholder="ราคาเป้าหมาย" 
                  value={newAsset.price} 
                  onChange={(e) => setNewAsset({...newAsset, price: e.target.value})} 
                  style={{ flex: 1, padding: '10px 12px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px' }} 
                  required 
                />
              </div>

              <input 
                type="text" 
                placeholder="เหตุผล (เช่น แนวรับสำคัญ)" 
                value={newAsset.reason} 
                onChange={(e) => setNewAsset({...newAsset, reason: e.target.value})} 
                style={{ padding: '10px 12px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', width: '100%' }} 
              />
              <button type="submit" style={{ padding: '10px', backgroundColor: 'transparent', color: '#fbbf24', fontWeight: 600, border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', width: '100%' }}>เพิ่มรายการ</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', width: '100%', marginTop: '6px' }}>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>รายการเฝ้าระวัง:</span>
              {watchlist.length === 0 ? <p style={{ color: '#64748b', fontSize: '12px' }}>ยังไม่มีรายการ</p> : watchlist.map((item, idx) => (
                <div key={idx} style={{ padding: '10px 12px', backgroundColor: 'transparent', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)', width: '100%', gap: '8px' }}>
                  <div style={{ fontSize: '12.5px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    <span style={{ fontWeight: 600, color: '#fde047' }}>{item.name}</span>
                    <span style={{ color: '#94a3b8', marginLeft: '6px' }}>({item.condition || '<='} {item.price})</span>
                    {item.reason && <span style={{ color: '#94a3b8', marginLeft: '6px' }}>- {item.reason}</span>}
                  </div>
                  <button onClick={() => {
                    const filtered = watchlist.filter((_, i) => i !== idx);
                    setWatchlist(filtered);
                    localStorage.setItem('moon_watchlist', JSON.stringify(filtered));
                  }} style={{ color: '#fca5a5', background: 'transparent', border: 'none', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>ลบ</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', width: '100%', maxWidth: '500px' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500 }}>ตั้งค่า</h4>
            <div style={{ padding: '12px', width: '100%', backgroundColor: 'transparent', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ color: '#cbd5e1', fontSize: '12.5px' }}>อัปโหลดไฟล์ข้อมูล:</span>
              <input type="file" onChange={handleFileSelect} style={{ color: '#94a3b8', fontSize: '12px' }} />
              {uploadedFileName && <p style={{ color: '#4ade80', fontSize: '12px', margin: 0 }}>{uploadedFileName}</p>}
            </div>
            <div style={{ padding: '12px', width: '100%', backgroundColor: 'transparent', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ color: '#cbd5e1', fontSize: '12.5px' }}>Custom Prompt:</span>
              <textarea rows="3" placeholder="ระบุสไตล์การตอบ..." value={customPrompt} onChange={(e) => { setCustomPrompt(e.target.value); localStorage.setItem('moon_custom_prompt', e.target.value); }} style={{ padding: '10px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button onClick={handleExportData} style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                ส่งออกข้อมูล
              </button>
              <button onClick={() => importFileRef.current?.click()} style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                นำเข้าข้อมูล
              </button>
              <input type="file" ref={importFileRef} onChange={handleImportData} style={{ display: 'none' }} accept=".json" />
            </div>

            <button onClick={() => { 
              localStorage.removeItem('moon_chat_history'); 
              localStorage.removeItem('moon_watchlist');
              setMessages([]); 
              setWatchlist([]);
              alert('เคลียร์ประวัติแชทและ Watchlist เรียบร้อยแล้ว!'); 
            }} style={{ padding: '10px 14px', backgroundColor: 'transparent', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', width: '100%' }}>
              เคลียร์ประวัติแชททั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* ช่องพิมพ์ข้อความด้านล่าง พร้อมปุ่ม + แนบไฟล์/รูปภาพ */}
      {activeTab === 'chat' && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          flexShrink: 0
        }}>
          <form onSubmit={handleSendMessage} style={{ maxWidth: '700px', width: '100%', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }} 
              accept="image/*,.pdf,.txt,.csv"
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fbbf24',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '20px',
                flexShrink: 0
              }}
              title="แนบรูปหรือไฟล์"
            >
              +
            </button>

            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)} 
              placeholder={uploadedFileName ? `แนบไฟล์ (${uploadedFileName}) แล้ว...` : "พิมพ์ข้อความ..."} 
              style={{
                flex: 1,
                backgroundColor: '#030712',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13.5px',
                color: '#fff',
                outline: 'none'
              }}
            />
            
            <button type="submit" style={{
              backgroundColor: '#fbbf24',
              color: '#030712',
              fontWeight: 600,
              border: 'none',
              padding: '0 16px',
              height: '40px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13.5px',
              flexShrink: 0
            }}>
              ส่ง
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
