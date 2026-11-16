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

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-lg h-[85vh] sm:h-[600px] bg-slate-900/95 border border-amber-500/35 rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl text-slate-100 overflow-hidden">
            
            <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">👨‍🚀</span>
                <div>
                  <h3 className="font-semibold text-amber-400 text-sm">ผู้ช่วยนักบินอวกาศ AI</h3>
                  <p className="text-xs text-slate-400">สถานะ: เชื่อมต่อพอร์ตพร้อมปฏิบัติการ</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="flex overflow-x-auto space-x-2 p-2 bg-slate-950/60 border-b border-slate-800 text-xs shrink-0 scrollbar-none">
              <button onClick={() => setActiveTab('chat')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${activeTab === 'chat' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>💬 แชททั่วไป</button>
              <button onClick={() => setActiveTab('health')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${activeTab === 'health' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>📊 สุขภาพพอร์ต</button>
              <button onClick={() => setActiveTab('assets')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${activeTab === 'assets' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>🪙 สินทรัพย์</button>
              <button onClick={() => setActiveTab('news')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${activeTab === 'news' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>📰 ข่าวสาร</button>
              <button onClick={() => setActiveTab('watchlist')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${activeTab === 'watchlist' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>🎯 Watchlist</button>
              <button onClick={() => setActiveTab('skills')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${activeTab === 'skills' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>⚙️ สกิล AI</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeTab === 'chat' && (
                <>
                  {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-amber-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 text-amber-400 p-3 rounded-2xl text-xs animate-pulse">
                        👨‍🚀 กำลังคำนวณและวิเคราะห์ข้อมูลในห้วงอวกาศ...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}

              {activeTab === 'health' && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-amber-400 text-sm">📊 เครื่องมือวิเคราะห์สุขภาพพอร์ต</h4>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('deep_analysis', 'วิเคราะห์พอร์ตการลงทุนเชิงลึกให้หน่อยครับ'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    🔍 วิเคราะห์พอร์ตเชิงลึก (จุดแข็ง/ความเสี่ยง/คำแนะนำ)
                  </button>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('portfolio_summary', 'สรุปภาพรวมพอร์ตในเดือนนี้ให้หน่อยครับ'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    📈 สรุปภาพรวมการซื้อขาย กำไร/ขาดทุนประจำเดือน
                  </button>
                </div>
              )}

              {activeTab === 'assets' && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-amber-400 text-sm">🪙 วิเคราะห์สินทรัพย์รายหมวด</h4>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์หุ้นไทยในพอร์ตและให้คำแนะนำทีครับ'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    🇹🇭 หุ้นไทย (วิเคราะห์รายตัวในพอร์ต)
                  </button>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์หุ้นต่างประเทศและ DR (เช่น CATL01 จากบริษัทแม่) ให้หน่อยครับ'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    🌐 หุ้นนอก & DR (วิเคราะห์เจาะลึกธุรกิจบริษัทแม่)
                  </button>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์ทิศทางราคาทองคำ แนวรับ แนวต้าน สำหรับเก็งกำไรระยะสั้น'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    🥇 ทองคำ (วิเคราะห์แนวรับ-แนวต้าน เก็งกำไร)
                  </button>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('asset_analysis', 'วิเคราะห์คริปโตในพอร์ต ทิศทางราคา แนวรับ แนวต้าน สำหรับเก็งกำไร'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    🚀 คริปโตเคอร์เรนซี (เก็งกำไร แนวรับ-แนวต้าน)
                  </button>
                </div>
              )}

              {activeTab === 'news' && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-amber-400 text-sm">📰 ข่าวสารและสถานการณ์ส่งผลต่อพอร์ต</h4>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์ภูมิรัฐศาสตร์โลก (อเมริกา จีน เวียดนาม ไทย) ที่มีผลต่อพอร์ต'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    🌍 ภูมิรัฐศาสตร์โลก (สหรัฐ, จีน, เวียดนาม, ไทย)
                  </button>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'วิเคราะห์เศรษฐกิจมหภาค โลก-ไทย ที่มีผลต่อพอร์ต'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    📉 เศรษฐกิจโลกและไทย
                  </button>
                  <button onClick={() => { setActiveTab('chat'); triggerBackendAction('news_analysis', 'มีข่าวหุ้นรายตัวตัวไหนในพอร์ตที่ต้องแอคชันด่วนไหม'); }} className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-sm transition">
                    ⚡ ข่าวหุ้นรายตัวที่ต้องแอคชัน
                  </button>
                </div>
              )}

              {activeTab === 'watchlist' && (
                <div className="space-y-3 text-xs">
                  <h4 className="font-semibold text-amber-400 text-sm">🎯 เรดาร์ตั้งเตือนราคา (Watchlist)</h4>
                  <form onSubmit={handleAddWatchlist} className="space-y-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                    <input 
                      type="text" placeholder="ชื่อสินทรัพย์ (เช่น BTC, PTT)" value={newAsset.name} 
                      onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} 
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white" required 
                    />
                    <input 
                      type="number" placeholder="ราคาเป้าหมายแจ้งเตือน" value={newAsset.price} 
                      onChange={(e) => setNewAsset({...newAsset, price: e.target.value})} 
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white" required 
                    />
                    <input 
                      type="text" placeholder="เหตุผลที่เฝ้าระวัง" value={newAsset.reason} 
                      onChange={(e) => setNewAsset({...newAsset, reason: e.target.value})} 
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                    />
                    <button type="submit" className="w-full py-2 bg-amber-500 text-slate-950 font-bold rounded-lg">เพิ่มเข้าเรดาร์เตือนภัย</button>
                  </form>

                  <div className="space-y-2">
                    <span className="text-slate-400 font-semibold">รายการที่กำลังเฝ้าระวัง:</span>
                    {watchlist.length === 0 ? <p className="text-slate-500">ยังไม่มีรายการเรดาร์</p> : watchlist.map((item, idx) => (
                      <div key={idx} className="p-2 bg-slate-800 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="font-bold text-amber-300">{item.name}</span> (เป้า: {item.price})
                          <p className="text-slate-400">{item.reason}</p>
                        </div>
                        <button onClick={() => {
                          const filtered = watchlist.filter((_, i) => i !== idx);
                          setWatchlist(filtered);
                          localStorage.setItem('moon_watchlist', JSON.stringify(filtered));
                        }} className="text-red-400 text-xs">ลบ</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="space-y-3 text-xs">
                  <h4 className="font-semibold text-amber-400 text-sm">⚙️ ปรับแต่งสกิลและกฎระเบียบ AI</h4>
                  
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                    <span className="font-semibold text-slate-300">📁 อัปโหลดไฟล์ให้ AI เรียนรู้เพิ่มเติม:</span>
                    <input type="file" onChange={handleFileUpload} className="w-full text-slate-400 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-slate-950 file:font-bold" />
                    {uploadedFileName && <p className="text-green-400">โหลดแล้ว: {uploadedFileName}</p>}
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                    <span className="font-semibold text-slate-300">📝 กำหนด Custom Prompt (กฎกติกา AI):</span>
                    <textarea 
                      rows="3" placeholder="ระบุสไตล์การตอบ เช่น ขอแบบทางการ หรือเน้นเซฟโซน..." 
                      value={customPrompt} 
                      onChange={(e) => {
                        setCustomPrompt(e.target.value);
                        localStorage.setItem('moon_custom_prompt', e.target.value);
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      localStorage.removeItem('moon_chat_history');
                      setMessages([]);
                      alert('เคลียร์ประวัติแชทเรียบร้อยแล้ว!');
                    }} 
                    className="w-full py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold"
                  >
                    🗑️ เคลียร์ประวัติแชททั้งหมด
                  </button>
                </div>
              )}

            </div>

            {activeTab === 'chat' && (
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-800/80 border-t border-slate-700 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={inputMessage} 
                  onChange={(e) => setInputMessage(e.target.value)} 
                  placeholder="พิมพ์ข้อความคุยกับผู้ช่วยอวกาศ..." 
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition">
                  ส่ง
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}
