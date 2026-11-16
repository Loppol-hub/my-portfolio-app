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

  // ควบคุมการซ่อน/แสดงหน้าจอพอร์ตหลัก (pf-root) อัตโนมัติ
  useEffect(() => {
    const pfRoot = document.querySelector('.pf-root');
    if (isOpen) {
      if (pfRoot) pfRoot.style.display = 'none';
      window.scrollTo(0, 0);
    } else {
      if (pfRoot) pfRoot.style.display = 'block';
    }
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 bg-[#02040a] flex flex-col text-slate-100 h-screen w-screen overflow-hidden">
      
      {/* Header เต็มจอ */}
      <div className="px-4 py-3 bg-slate-800/85 border-b border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">👨‍🚀</span>
          <div>
            <h3 className="font-semibold text-amber-400 text-base">ผู้ช่วยนักบินอวกาศ AI</h3>
            <p className="text-xs text-slate-400">สถานะ: เชื่อมต่อพอร์ตพร้อมปฏิบัติการ</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow"
        >
          ← กลับหน้าพอร์ต
        </button>
      </div>

      {/* แถบเมนูด่วน 5 หมวดหลัก */}
      <div className="flex overflow-x-auto space-x-2 p-2.5 bg-slate-950/90 border-b border-slate-800 text-xs shrink-0 scrollbar-none">
        <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${activeTab === 'chat' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800/80 text-slate-300'}`}>💬 แชททั่วไป</button>
        <button onClick={() => setActiveTab('health')} className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${activeTab === 'health' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800/80 text-slate-300'}`}>📊 สุขภาพพอร์ต</button>
        <button onClick={() => setActiveTab('assets')} className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${activeTab === 'assets' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800/80 text-slate-300'}`}>🪙 สินทรัพย์</button>
        <button onClick={() => setActiveTab('news')} className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${activeTab === 'news' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800/80 text-slate-300'}`}>📰 ข่าวสาร</button>
        <button onClick={() => setActiveTab('watchlist')} className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${activeTab === 'watchlist' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800/80 text-slate-300'}`}>🎯 Watchlist</button>
        <button onClick={() => setActiveTab('skills')} className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${activeTab === 'skills' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800/80 text-slate-300'}`}>⚙️ สกิล AI</button>
      </div>

      {/* เนื้อหาภายในแท็บ (เต็มจอ) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-3xl w-full mx-auto">
        {activeTab === 'chat' && (
          <>
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-sm sm:text-base leading-relaxed ${msg.sender === 'user' ? 'bg-amber-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none shadow'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-amber-400 p-3.5 rounded-2xl text-xs sm:text-sm animate-pulse border border-slate-700">
                  👨‍🚀 กำลังคำนวณและวิเคราะห์ข้อมูลในห้วงอวกาศ...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}

        {activeTab === 'health' && (
          <div className="space-y-3 max-w-xl mx-auto pt-4">
            <h4 className="font-semibold text-amber-400 text-base mb-2">📊 เครื่องมือวิเคราะห์สุขภาพพอร์ต</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('deep_analysis', 'วิเคราะห์พอร์ตการลงทุนเชิงลึกให้หน่อยครับ'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              🔍 วิเคราะห์พอร์ตเชิงลึก (จุดแข็ง/ความเสี่ยง/คำแนะนำ)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('portfolio_summary', 'สรุปภาพรวมพอร์ตในเดือนนี้ให้หน่อยครับ'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              📈 สรุปภาพรวมการซื้อขาย กำไร/ขาดทุนประจำเดือน
            </button>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-3 max-w-xl mx-auto pt-4">
            <h4 className="font-semibold text-amber-400 text-base mb-2">🪙 วิเคราะห์สินทรัพย์รายหมวด</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์หุ้นไทยในพอร์ตและให้คำแนะนำทีครับ'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              🇹🇭 หุ้นไทย (วิเคราะห์รายตัวในพอร์ต)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์หุ้นต่างประเทศและ DR (เช่น CATL01 จากบริษัทแม่) ให้หน่อยครับ'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              🌐 หุ้นนอก & DR (วิเคราะห์เจาะลึกธุรกิจบริษัทแม่)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์ทิศทางราคาทองคำ แนวรับ แนวต้าน สำหรับเก็งกำไรระยะสั้น'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              🥇 ทองคำ (วิเคราะห์แนวรับ-แนวต้าน เก็งกำไร)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์คริปโตในพอร์ต ทิศทางราคา แนวรับ แนวต้าน สำหรับเก็งกำไร'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              🚀 คริปโตเคอร์เรนซี (เก็งกำไร แนวรับ-แนวต้าน)
            </button>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-3 max-w-xl mx-auto pt-4">
            <h4 className="font-semibold text-amber-400 text-base mb-2">📰 ข่าวสารและสถานการณ์ส่งผลต่อพอร์ต</h4>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์ภูมิรัฐศาสตร์โลก (อเมริกา จีน เวียดนาม ไทย) ที่มีผลต่อพอร์ต'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              🌍 ภูมิรัฐศาสตร์โลก (สหรัฐ, จีน, เวียดนาม, ไทย)
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์เศรษฐกิจมหภาค โลก-ไทย ที่มีผลต่อพอร์ต'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              📉 เศรษฐกิจโลกและไทย
            </button>
            <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'มีข่าวหุ้นรายตัวตัวไหนในพอร์ตที่ต้องแอคชันด่วนไหม'); }} className="w-full text-left p-4 bg-slate-800/90 hover:bg-slate-800 rounded-2xl border border-slate-700 text-sm sm:text-base transition shadow">
              ⚡ ข่าวหุ้นรายตัวที่ต้องแอคชัน
            </button>
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="space-y-4 max-w-xl mx-auto pt-4">
            <h4 className="font-semibold text-amber-400 text-base">🎯 เรดาร์ตั้งเตือนราคา (Watchlist)</h4>
            <form onSubmit={handleAddWatchlist} className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700 shadow">
              <input 
                type="text" placeholder="ชื่อสินทรัพย์ (เช่น BTC, PTT)" value={newAsset.name} 
                onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} 
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm" required 
              />
              <input 
                type="number" placeholder="ราคาเป้าหมายแจ้งเตือน" value={newAsset.price} 
                onChange={(e) => setNewAsset({...newAsset, price: e.target.value})} 
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm" required 
              />
              <input 
                type="text" placeholder="เหตุผลที่เฝ้าระวัง" value={newAsset.reason} 
                onChange={(e) => setNewAsset({...newAsset, reason: e.target.value})} 
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm" 
              />
              <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition">เพิ่มเข้าเรดาร์เตือนภัย</button>
            </form>

            <div className="space-y-2">
              <span className="text-slate-400 font-semibold text-sm">รายการที่กำลังเฝ้าระวัง:</span>
              {watchlist.length === 0 ? <p className="text-slate-500 text-sm">ยังไม่มีรายการเรดาร์</p> : watchlist.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-800 rounded-xl flex justify-between items-center text-sm border border-slate-700/50">
                  <div>
                    <span className="font-bold text-amber-300">{item.name}</span> (เป้า: {item.price})
                    <p className="text-slate-400 text-xs mt-0.5">{item.reason}</p>
                  </div>
                  <button onClick={() => {
                    const filtered = watchlist.filter((_, i) => i !== idx);
                    setWatchlist(filtered);
                    localStorage.setItem('moon_watchlist', JSON.stringify(filtered));
                  }} className="text-red-400 text-xs px-2 py-1 bg-red-500/10 rounded-lg hover:bg-red-500/20">ลบ</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-4 max-w-xl mx-auto pt-4">
            <h4 className="font-semibold text-amber-400 text-base">⚙️ ปรับแต่งสกิลและกฎระเบียบ AI</h4>
            
            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-2.5 shadow">
              <span className="font-semibold text-slate-300 text-sm">📁 อัปโหลดไฟล์ให้ AI เรียนรู้เพิ่มเติม:</span>
              <input type="file" onChange={handleFileUpload} className="w-full text-slate-400 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-amber-500 file:text-slate-950 file:font-bold file:cursor-pointer" />
              {uploadedFileName && <p className="text-green-400 text-xs">โหลดแล้ว: {uploadedFileName}</p>}
            </div>

            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-2.5 shadow">
              <span className="font-semibold text-slate-300 text-sm">📝 กำหนด Custom Prompt (กฎกติกา AI):</span>
              <textarea 
                rows="4" placeholder="ระบุสไตล์การตอบ เช่น ขอแบบทางการ หรือเน้นเซฟโซน..." 
                value={customPrompt} 
                onChange={(e) => {
                  setCustomPrompt(e.target.value);
                  localStorage.setItem('moon_custom_prompt', e.target.value);
                }}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <button 
              onClick={() => {
                localStorage.removeItem('moon_chat_history');
                setMessages([]);
                alert('เคลียร์ประวัติแชทเรียบร้อยแล้ว!');
              }} 
              className="w-full py-3 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition shadow"
            >
              🗑️ เคลียร์ประวัติแชททั้งหมด
            </button>
          </div>
        )}

      </div>

      {/* ช่องพิมพ์ข้อความด้านล่าง (แสดงเฉพาะตอนอยู่หน้า Chat) */}
      {activeTab === 'chat' && (
        <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800 shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl w-full mx-auto flex gap-2">
            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)} 
              placeholder="พิมพ์ข้อความคุยกับผู้ช่วยอวกาศ..." 
              className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm sm:text-base text-white focus:outline-none focus:border-amber-500 shadow-inner"
            />
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-2xl text-sm sm:text-base transition shadow">
              ส่ง
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
