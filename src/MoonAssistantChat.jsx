import React, { useState, useEffect, useRef } from 'react';

export default function MoonAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [watchlist, setWatchlist] = useState([]);
  const [newAsset, setNewAsset] = useState({ name: '', price: '', reason: '' });
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [fileContent, setFileContent] = useState('');

  const messagesEndRef = useRef(null);

  // ดึงข้อมูลหุ้นจริงจากพอร์ตใน localStorage มาแสดง
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  useEffect(() => {
    try {
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
      const holdings = localStorage.getItem('holdings') ? JSON.parse(localStorage.getItem('holdings')) : null;
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
    if (!inputMessage.trim()) return;
    triggerBackendAction('chat');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `📁 โหลดไฟล์ "${file.name}" เข้าสู่ระบบความจำ AI เรียบร้อยแล้วครับ!` }
      ]);
    };
    reader.readAsText(file);
  };

  const handleAddWatchlist = (e) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.price) return;
    const updated = [...watchlist, newAsset];
    setWatchlist(updated);
    localStorage.setItem('moon_watchlist', JSON.stringify(updated));
    setNewAsset({ name: '', price: '', reason: '' });
    setMessages((prev) => [
      ...prev,
      { sender: 'ai', text: `🎯 ตั้งระบบเรดาร์ติดตามราคา ${newAsset.name} ที่ราคา ${newAsset.price} เรียบร้อยครับ!` }
    ]);
  };

  if (!isOpen) return null;

  // กรองหุ้นไทยจากพอร์ต
  const thStocks = portfolioHoldings.filter(h => h && h.type === 'th_stock');
  // กรองหุ้นนอก / DR / ETF จากพอร์ต
  const globalStocks = portfolioHoldings.filter(h => h && (h.type === 'foreign_stock' || h.instrumentType === 'dr' || h.instrumentType === 'etf'));

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
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
        {/* ซ้าย: ปุ่ม 3 ขีด + ข้อความสถานะพร้อมจุดไฟต่อท้าย */}
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
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>สถานะ</span>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#34d399', // เขียว (พร้อม) หรือ #fca5a5 (แดง)
              boxShadow: '0 0 6px #34d399',
              display: 'inline-block'
            }} />
          </div>
        </div>

        {/* ขวา: ปุ่มกากบาท (X) ปิดหน้าจอ */}
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
            fontSize: '16px'
          }}
          title="ปิด"
        >
          ✕
        </button>

        {/* เมนูดรอปดาวน์ (ซ้ายบนใต้ปุ่ม 3 ขีด) */}
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
              { key: 'skills', label: 'สกิล AI' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setMenuOpen(false); }}
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

      {/* เนื้อหาภายในแท็บ (จัดวางชิดขวาบน/มินิมอล ไม่มีพื้นหลังเทาแข็งๆ) */}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', width: '100%' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500, marginBottom: '4px', alignSelf: 'flex-end' }}>สุขภาพพอร์ต</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('deep_analysis', 'วิเคราะห์พอร์ตการลงทุนเชิงลึกให้หน่อยครับ'); }} style={{ textAlign: 'right', padding: '10px 14px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
              วิเคราะห์พอร์ตเชิงลึก
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('portfolio_summary', 'สรุปภาพรวมพอร์ตในเดือนนี้ให้หน่อยครับ'); }} style={{ textAlign: 'right', padding: '10px 14px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
              สรุปภาพรวมกำไร/ขาดทุนประจำเดือน
            </button>
          </div>
        )}

        {activeTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', width: '100%' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>วิเคราะห์สินทรัพย์</h4>
            
            {/* หุ้นไทย */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', width: '100%' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>🇹🇭 หุ้นไทยในพอร์ต:</span>
              {thStocks.length === 0 ? (
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>ไม่มีหุ้นไทยในพอร์ต</span>
              ) : (
                thStocks.map(stock => (
                  <button key={stock.id} onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', `วิเคราะห์หุ้นไทย ${stock.name} (${stock.ticker || 'ไม่มี Ticker'}) ในพอร์ตให้หน่อยครับ`); }} style={{ textAlign: 'right', padding: '8px 12px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    {stock.name} ({stock.ticker || 'หุ้นไทย'})
                  </button>
                ))
              )}
            </div>

            {/* หุ้นนอก / DR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', width: '100%', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>🌐 หุ้นนอก & DR ในพอร์ต:</span>
              {globalStocks.length === 0 ? (
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>ไม่มีหุ้นนอก/DR ในพอร์ต</span>
              ) : (
                globalStocks.map(stock => (
                  <button key={stock.id} onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', `วิเคราะห์หุ้นต่างประเทศหรือ DR ${stock.name} (${stock.ticker || ''}) ให้หน่อยครับ`); }} style={{ textAlign: 'right', padding: '8px 12px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    {stock.name} ({stock.ticker || 'หุ้นนอก'})
                  </button>
                ))
              )}
            </div>

            {/* หมวดอื่นๆ */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', width: '100%', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>🥇 สินทรัพย์อื่นๆ:</span>
              <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์ทิศทางราคาทองคำ แนวรับ แนวต้าน'); }} style={{ textAlign: 'right', padding: '8px 12px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                ทองคำ (แนวรับ-แนวต้าน)
              </button>
              <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์คริปโตในพอร์ต ทิศทางราคา'); }} style={{ textAlign: 'right', padding: '8px 12px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                คริปโตเคอร์เรนซี
              </button>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', width: '100%' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>ข่าวสารพอร์ต</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์ภูมิรัฐศาสตร์โลกที่มีผลต่อพอร์ต'); }} style={{ textAlign: 'right', padding: '10px 14px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              ภูมิรัฐศาสตร์โลก
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์เศรษฐกิจมหภาค โลก-ไทย'); }} style={{ textAlign: 'right', padding: '10px 14px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              เศรษฐกิจมหภาค
            </button>
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', width: '100%' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500 }}>Watchlist</h4>
            <form onSubmit={handleAddWatchlist} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '350px' }}>
              <input type="text" placeholder="ชื่อสินทรัพย์ (เช่น BTC)" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} style={{ padding: '8px 10px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px', textAlign: 'right' }} required />
              <input type="number" placeholder="ราคาเป้าหมาย" value={newAsset.price} onChange={(e) => setNewAsset({...newAsset, price: e.target.value})} style={{ padding: '8px 10px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px', textAlign: 'right' }} required />
              <input type="text" placeholder="เหตุผล" value={newAsset.reason} onChange={(e) => setNewAsset({...newAsset, reason: e.target.value})} style={{ padding: '8px 10px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px', textAlign: 'right' }} />
              <button type="submit" style={{ padding: '8px', backgroundColor: 'transparent', color: '#fbbf24', fontWeight: 600, border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>เพิ่มรายการ</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', width: '100%', marginTop: '6px' }}>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>รายการเฝ้าระวัง:</span>
              {watchlist.length === 0 ? <p style={{ color: '#64748b', fontSize: '12px' }}>ยังไม่มีรายการ</p> : watchlist.map((item, idx) => (
                <div key={idx} style={{ padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '350px' }}>
                  <button onClick={() => {
                    const filtered = watchlist.filter((_, i) => i !== idx);
                    setWatchlist(filtered);
                    localStorage.setItem('moon_watchlist', JSON.stringify(filtered));
                  }} style={{ color: '#fca5a5', background: 'transparent', border: 'none', fontSize: '11px', cursor: 'pointer' }}>ลบ</button>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 500, color: '#fde047', fontSize: '13px' }}>{item.name}</span> <span style={{ fontSize: '12px', color: '#cbd5e1' }}>(เป้า: {item.price})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', width: '100%' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 500 }}>สกิล AI</h4>
            <div style={{ padding: '12px', width: '100%', maxWidth: '350px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <span style={{ color: '#cbd5e1', fontSize: '12.5px' }}>อัปโหลดไฟล์ข้อมูล:</span>
              <input type="file" onChange={handleFileUpload} style={{ color: '#94a3b8', fontSize: '12px' }} />
              {uploadedFileName && <p style={{ color: '#4ade80', fontSize: '12px', margin: 0 }}>{uploadedFileName}</p>}
            </div>
            <div style={{ padding: '12px', width: '100%', maxWidth: '350px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <span style={{ color: '#cbd5e1', fontSize: '12.5px' }}>Custom Prompt:</span>
              <textarea rows="3" placeholder="ระบุสไตล์การตอบ..." value={customPrompt} onChange={(e) => { setCustomPrompt(e.target.value); localStorage.setItem('moon_custom_prompt', e.target.value); }} style={{ padding: '8px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px', width: '100%', textAlign: 'right' }} />
            </div>
            <button onClick={() => { localStorage.removeItem('moon_chat_history'); setMessages([]); alert('เคลียร์ประวัติแชทเรียบร้อยแล้ว!'); }} style={{ padding: '10px 14px', backgroundColor: 'transparent', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              เคลียร์ประวัติแชททั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* ช่องพิมพ์ข้อความด้านล่าง */}
      {activeTab === 'chat' && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          flexShrink: 0
        }}>
          <form onSubmit={handleSendMessage} style={{ maxWidth: '700px', width: '100%', margin: '0 auto', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)} 
              placeholder="พิมพ์ข้อความ..." 
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
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13.5px'
            }}>
              ส่ง
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
