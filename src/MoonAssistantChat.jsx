import React, { useState, useEffect, useRef } from 'react';

export default function MoonAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  const [watchlist, setWatchlist] = useState([]);
  const [newAsset, setNewAsset] = useState({ name: '', price: '', reason: '' });
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [fileContent, setFileContent] = useState('');

  const messagesEndRef = useRef(null);

  // ระบบดักจับคลิกตัวนักบินอวกาศ
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
      const holdings = window.storage ? window.storage.get('holdings') : null;
      const tradeLogs = window.storage ? window.storage.get('trade-logs') : null;
      const cashLedger = window.storage ? window.storage.get('cash-ledger') : null;
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

  // ใช้ Inline Styles ควบคุมหน้าจอทั้งหมด เพื่อป้องกันปัญหาคลาส Tailwind ไม่คอมไพล์
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 99999,
      backgroundColor: '#02040a',
      display: 'flex',
      flexDirection: 'column',
      color: '#EDF1F5',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* Header เต็มจอ */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>👨‍🚀</span>
          <div>
            <h3 style={{ fontWeight: 600, color: '#fbbf24', fontSize: '15px', margin: 0 }}>ผู้ช่วยนักบินอวกาศ AI</h3>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>สถานะ: เชื่อมต่อพอร์ตพร้อมปฏิบัติการ</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          style={{
            backgroundColor: '#334155',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ← กลับหน้าพอร์ต
        </button>
      </div>

      {/* แถบเมนูด่วน 5 หมวดหลัก */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '8px',
        padding: '10px',
        backgroundColor: 'rgba(3, 7, 18, 0.95)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
        flexShrink: 0
      }}>
        {[
          { key: 'chat', label: '💬 แชททั่วไป' },
          { key: 'health', label: '📊 สุขภาพพอร์ต' },
          { key: 'assets', label: '🪙 สินทรัพย์' },
          { key: 'news', label: '📰 ข่าวสาร' },
          { key: 'watchlist', label: '🎯 Watchlist' },
          { key: 'skills', label: '⚙️ สกิล AI' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              backgroundColor: activeTab === tab.key ? '#fbbf24' : '#1e293b',
              color: activeTab === tab.key ? '#030712' : '#cbd5e1',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* เนื้อหาภายในแท็บ (เต็มจอ) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '700px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'chat' && (
          <>
            {messages.map((msg, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  backgroundColor: msg.sender === 'user' ? '#d97706' : '#1e293b',
                  color: '#fff',
                  borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.sender === 'user' ? '16px' : '4px',
                  border: msg.sender === 'ai' ? '1px solid rgba(56, 189, 248, 0.2)' : 'none'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ backgroundColor: '#1e293b', color: '#fbbf24', padding: '12px 16px', borderRadius: '16px', fontSize: '13px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  👨‍🚀 กำลังคำนวณและวิเคราะห์ข้อมูลในห้วงอวกาศ...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}

        {activeTab === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px', width: '100%', margin: 'auto' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '15px', marginBottom: '6px' }}>📊 เครื่องมือวิเคราะห์สุขภาพพอร์ต</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('deep_analysis', 'วิเคราะห์พอร์ตการลงทุนเชิงลึกให้หน่อยครับ'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              🔍 วิเคราะห์พอร์ตเชิงลึก (จุดแข็ง/ความเสี่ยง/คำแนะนำ)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('portfolio_summary', 'สรุปภาพรวมพอร์ตในเดือนนี้ให้หน่อยครับ'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              📈 สรุปภาพรวมการซื้อขาย กำไร/ขาดทุนประจำเดือน
            </button>
          </div>
        )}

        {activeTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px', width: '100%', margin: 'auto' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '15px', marginBottom: '6px' }}>🪙 วิเคราะห์สินทรัพย์รายหมวด</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์หุ้นไทยในพอร์ตและให้คำแนะนำทีครับ'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              🇹🇭 หุ้นไทย (วิเคราะห์รายตัวในพอร์ต)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์หุ้นต่างประเทศและ DR (เช่น CATL01 จากบริษัทแม่) ให้หน่อยครับ'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              🌐 หุ้นนอก & DR (วิเคราะห์เจาะลึกธุรกิจบริษัทแม่)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์ทิศทางราคาทองคำ แนวรับ แนวต้าน สำหรับเก็งกำไรระยะสั้น'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              🥇 ทองคำ (วิเคราะห์แนวรับ-แนวต้าน เก็งกำไร)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์คริปโตในพอร์ต ทิศทางราคา แนวรับ แนวต้าน สำหรับเก็งกำไร'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              🚀 คริปโตเคอร์เรนซี (เก็งกำไร แนวรับ-แนวต้าน)
            </button>
          </div>
        )}

        {activeTab === 'news' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px', width: '100%', margin: 'auto' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '15px', marginBottom: '6px' }}>📰 ข่าวสารและสถานการณ์ส่งผลต่อพอร์ต</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์ภูมิรัฐศาสตร์โลก (อเมริกา จีน เวียดนาม ไทย) ที่มีผลต่อพอร์ต'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              🌍 ภูมิรัฐศาสตร์โลก (สหรัฐ, จีน, เวียดนาม, ไทย)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์เศรษฐกิจมหภาค โลก-ไทย ที่มีผลต่อพอร์ต'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              📉 เศรษฐกิจโลกและไทย
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'มีข่าวหุ้นรายตัวตัวไหนในพอร์ตที่ต้องแอคชันด่วนไหม'); }} style={{ textAlign: 'left', padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' }}>
              ⚡ ข่าวหุ้นรายตัวที่ต้องแอคชัน
            </button>
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px', width: '100%', margin: 'auto' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '15px' }}>🎯 เรดาร์ตั้งเตือนราคา (Watchlist)</h4>
            <form onSubmit={handleAddWatchlist} style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#1e293b', padding: '14px', borderRadius: '12px', border: '1px solid #334155' }}>
              <input type="text" placeholder="ชื่อสินทรัพย์ (เช่น BTC, PTT)" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} style={{ padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px' }} required />
              <input type="number" placeholder="ราคาเป้าหมายแจ้งเตือน" value={newAsset.price} onChange={(e) => setNewAsset({...newAsset, price: e.target.value})} style={{ padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px' }} required />
              <input type="text" placeholder="เหตุผลที่เฝ้าระวัง" value={newAsset.reason} onChange={(e) => setNewAsset({...newAsset, reason: e.target.value})} style={{ padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px' }} />
              <button type="submit" style={{ padding: '10px', backgroundColor: '#fbbf24', color: '#030712', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>เพิ่มเข้าเรดาร์เตือนภัย</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>รายการที่กำลังเฝ้าระวัง:</span>
              {watchlist.length === 0 ? <p style={{ color: '#64748b', fontSize: '12px' }}>ยังไม่มีรายการเรดาร์</p> : watchlist.map((item, idx) => (
                <div key={idx} style={{ padding: '10px', backgroundColor: '#1e293b', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#fde047', fontSize: '13px' }}>{item.name}</span> <span style={{ fontSize: '12px', color: '#cbd5e1' }}>(เป้า: {item.price})</span>
                    <p style={{ color: '#94a3b8', fontSize: '11px', margin: '2px 0 0 0' }}>{item.reason}</p>
                  </div>
                  <button onClick={() => {
                    const filtered = watchlist.filter((_, i) => i !== idx);
                    setWatchlist(filtered);
                    localStorage.setItem('moon_watchlist', JSON.stringify(filtered));
                  }} style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>ลบ</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px', width: '100%', margin: 'auto' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '15px' }}>⚙️ ปรับแต่งสกิลและกฎระเบียบ AI</h4>
            <div style={{ padding: '14px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: '#cbd5e1', fontSize: '13px' }}>📁 อัปโหลดไฟล์ให้ AI เรียนรู้เพิ่มเติม:</span>
              <input type="file" onChange={handleFileUpload} style={{ color: '#94a3b8', fontSize: '12px' }} />
              {uploadedFileName && <p style={{ color: '#4ade80', fontSize: '12px', margin: 0 }}>โหลดแล้ว: {uploadedFileName}</p>}
            </div>
            <div style={{ padding: '14px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: '#cbd5e1', fontSize: '13px' }}>📝 กำหนด Custom Prompt (กฎกติกา AI):</span>
              <textarea rows="4" placeholder="ระบุสไตล์การตอบ เช่น ขอแบบทางการ หรือเน้นเซฟโซน..." value={customPrompt} onChange={(e) => { setCustomPrompt(e.target.value); localStorage.setItem('moon_custom_prompt', e.target.value); }} style={{ padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', width: '100%' }} />
            </div>
            <button onClick={() => { localStorage.removeItem('moon_chat_history'); setMessages([]); alert('เคลียร์ประวัติแชทเรียบร้อยแล้ว!'); }} style={{ padding: '12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              🗑️ เคลียร์ประวัติแชททั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* ช่องพิมพ์ข้อความด้านล่าง */}
      {activeTab === 'chat' && (
        <div style={{ padding: '12px 16px', backgroundColor: '#0f172a', borderTop: '1px solid rgba(56, 189, 248, 0.2)', flexShrink: 0 }}>
          <form onSubmit={handleSendMessage} style={{ maxWidth: '700px', width: '100%', margin: '0 auto', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)} 
              placeholder="พิมพ์ข้อความคุยกับผู้ช่วยอวกาศ..." 
              style={{ flex: 1, backgroundColor: '#02040a', border: '1px solid #334155', borderRadius: '14px', padding: '12px 16px', fontSize: '14px', color: '#fff', outline: 'none' }}
            />
            <button type="submit" style={{ backgroundColor: '#fbbf24', color: '#030712', fontWeight: 'bold', border: 'none', padding: '0 20px', borderRadius: '14px', cursor: 'pointer', fontSize: '14px' }}>
              ส่ง
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
