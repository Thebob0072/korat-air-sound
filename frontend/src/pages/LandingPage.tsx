import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, FileText, BarChart2, ArrowRight, Play, Check, ChevronRight,
  Sparkles, Zap, Shield, Users, Receipt, Package, PieChart,
  LayoutDashboard, Menu, X,
} from 'lucide-react';

// ── Data ───────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    tag: 'เฉพาะระบบนี้',
    title: 'ค้นทะเบียนรถ → เปิดบิลทันที',
    desc: 'พิมพ์ทะเบียนรถครั้งเดียว ระบบดึงข้อมูลลูกค้า ประวัติรถ และราคาเดิมให้อัตโนมัติ ไม่ต้องพิมพ์ซ้ำ',
    icon: Car,
    grad: 'from-sky-500/10 to-sky-500/5',
    border: 'border-sky-500/15',
  },
  {
    tag: 'High Resolution',
    title: 'บิลความร้อน 58mm คมชัด',
    desc: 'พิมพ์บิลด้วยเทคโนโลยี Canvas 4x ทำให้ตัวหนังสือ ทศนิยม และ QR code คมชัดกว่าระบบทั่วไปอย่างเห็นได้ชัด',
    icon: FileText,
    grad: 'from-amber-500/10 to-amber-500/5',
    border: 'border-amber-500/15',
  },
  {
    tag: 'Real-time',
    title: 'รายงานยอดขาย live',
    desc: 'ดูยอดวันนี้ เดือนนี้ แยกตามหมวดงาน พร้อมกราฟแนวโน้ม อัพเดทแบบ real-time ไม่ต้องรอสิ้นเดือน',
    icon: BarChart2,
    grad: 'from-violet-500/10 to-violet-500/5',
    border: 'border-violet-500/15',
  },
];

const PLANS = [
  {
    name: 'ฟรี',
    price: '฿0',
    period: '',
    desc: 'สำหรับร้านเริ่มต้น',
    features: ['1 ธุรกิจ', 'บิลไม่จำกัด', '2 ช่าง', 'รายงานพื้นฐาน', 'บิล 58mm'],
    cta: 'เริ่มใช้ฟรี',
    highlight: false,
    badge: '',
  },
  {
    name: 'Pro',
    price: '฿299',
    period: '/เดือน',
    desc: 'สำหรับร้านที่เติบโต',
    features: ['3 ธุรกิจ', 'บิลไม่จำกัด', 'ช่างไม่จำกัด', 'รายงานเต็ม', 'ลูกหนี้เครดิต', 'สแกน QR จ่าย', 'Priority support'],
    cta: 'ทดลองฟรี 30 วัน',
    highlight: true,
    badge: 'ยอดนิยม',
  },
  {
    name: 'Business',
    price: '฿599',
    period: '/เดือน',
    desc: 'สำหรับเครือข่ายหลายสาขา',
    features: ['ไม่จำกัดสาขา', 'ทุกฟีเจอร์ Pro', 'API access', 'Custom receipt', 'Onboarding 1:1', 'SLA 99.9%'],
    cta: 'ติดต่อเรา',
    highlight: false,
    badge: '',
  },
];

const PARTNERS = [
  {
    category: 'ฟิล์มกรองแสง',
    label: 'Premium Partner',
    desc: 'ฟิล์มนิรภัยและฟิล์มกรองแสงคุณภาพสูง ส่วนลดพิเศษ 15% สำหรับร้านในระบบ',
    gradient: 'from-violet-500/8 to-violet-500/3',
    border: 'border-violet-500/12',
    emoji: '🎞️',
  },
  {
    category: 'ประกันรถยนต์',
    label: 'Referral Partner',
    desc: 'แนะนำประกันภัยรถยนต์ให้ลูกค้า รับ commission ต่อกรมธรรม์ สมัครได้ทันที',
    gradient: 'from-emerald-500/8 to-emerald-500/3',
    border: 'border-emerald-500/12',
    emoji: '🛡️',
  },
  {
    category: 'น้ำยาแอร์ & อะไหล่',
    label: 'Supply Partner',
    desc: 'สั่งน้ำยาแอร์ อะไหล่รถ ตรงจากผู้นำเข้า ราคา wholesale ส่งถึงหน้าร้าน',
    gradient: 'from-sky-500/8 to-sky-500/3',
    border: 'border-sky-500/12',
    emoji: '📦',
  },
];

// ── Product Mockup ─────────────────────────────────────────────────────────────

function ProductMockup() {
  return (
    <div className="relative w-full max-w-[720px] mx-auto mt-14">
      <div className="absolute inset-x-12 -bottom-8 h-24 bg-[#E8C547]/6 blur-3xl pointer-events-none" />
      <div className="relative bg-[#161614] rounded-2xl border border-white/[0.07] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.65)]">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-[#0F0F0D]">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          <div className="flex-1 mx-4 h-5 rounded-md bg-white/[0.04] flex items-center justify-center">
            <span className="text-[10px] text-white/20 font-mono select-none">pos.koratpos.app</span>
          </div>
        </div>
        {/* App layout */}
        <div className="flex" style={{ height: 300 }}>
          {/* Sidebar */}
          <div className="w-40 border-r border-white/[0.06] bg-[#0F0F0D] flex flex-col py-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <div className="w-5 h-5 rounded-[5px] bg-[#E8C547] flex items-center justify-center shrink-0">
                <Car className="h-2.5 w-2.5 text-[#1A1814]" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-bold text-white/70 truncate">Korat Air & Sound</span>
            </div>
            {[
              { label: 'ภาพรวม', Icon: PieChart, active: false, badge: 0 },
              { label: 'POS', Icon: LayoutDashboard, active: true, badge: 0 },
              { label: 'ออเดอร์', Icon: Package, active: false, badge: 4 },
              { label: 'ลูกค้า', Icon: Users, active: false, badge: 0 },
              { label: 'สรุปยอด', Icon: BarChart2, active: false, badge: 0 },
            ].map(({ label, Icon, active, badge }) => (
              <div
                key={label}
                className={`flex items-center gap-2 mx-2 px-2 py-1.5 rounded-md text-[11px] mb-0.5 ${active ? 'bg-[#2D2C28] text-white' : 'text-white/30'}`}
              >
                <Icon className="h-3 w-3 shrink-0" strokeWidth={active ? 2 : 1.5} />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="text-[8px] font-bold bg-amber-400 text-white px-1.5 rounded-full">{badge}</span>
                )}
              </div>
            ))}
          </div>

          {/* POS main area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Items */}
            <div className="flex-1 flex flex-col bg-[#161614]">
              <div className="px-3 py-2.5 border-b border-white/[0.06]">
                <div className="h-7 rounded-lg bg-white/[0.04] flex items-center px-3 gap-2">
                  <div className="w-3 h-3 rounded-full border border-white/20" />
                  <span className="text-[10px] text-white/20">ค้นทะเบียน... เช่น &quot;5กก 1234&quot;</span>
                </div>
              </div>
              <div className="flex gap-1.5 px-3 py-2">
                {['ทั้งหมด', 'ค่าแรง', 'ฟิล์ม', 'แอร์'].map((t, i) => (
                  <div
                    key={t}
                    className={`px-2.5 py-1 rounded-full text-[9px] font-medium ${i === 0 ? 'bg-[#2D2C28] text-white' : 'bg-white/[0.04] text-white/30'}`}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 px-3">
                {[
                  ['ติดตั้งฟิล์ม', '2,500'],
                  ['ซ่อมแอร์', '1,200'],
                  ['น้ำยาแอร์', '350'],
                  ['เปลี่ยนผ้าเบรก', '800'],
                  ['ค่าแรงทั่วไป', '500'],
                  ['ฟิล์มกันรอย', '990'],
                ].map(([name, price]) => (
                  <div key={name} className="bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.05]">
                    <p className="text-[9px] text-white/40 leading-tight mb-1">{name}</p>
                    <p className="font-mono text-[10px] font-bold text-white/60">฿{price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill panel */}
            <div className="w-36 border-l border-white/[0.06] bg-[#0F0F0D] flex flex-col shrink-0">
              <div className="bg-[#2D2C28] px-3 py-2.5">
                <p className="text-[9px] text-white/35 font-mono truncate">5กก 1234 · สมชาย ใจดี</p>
                <p className="text-[11px] font-bold text-white mt-0.5 truncate">Korat Air & Sound</p>
              </div>
              <div className="flex-1 px-2.5 py-2 space-y-1.5 overflow-hidden">
                {[['ติดตั้งฟิล์ม', '2,500'], ['น้ำยาแอร์ R134a', '350'], ['ค่าแรง', '300']].map(([name, price]) => (
                  <div key={name} className="bg-white/[0.04] rounded-lg px-2 py-1.5">
                    <p className="text-[8.5px] text-white/40 truncate">{name}</p>
                    <p className="font-mono text-[10px] font-bold text-white/60">฿{price}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] px-2.5 py-2.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-white/25">รวม</span>
                  <span className="font-mono text-[12px] font-black text-[#E8C547]">฿3,150</span>
                </div>
                <div className="bg-[#3B3A36] rounded-xl py-2 text-center cursor-pointer hover:bg-[#4A4845] transition-colors">
                  <p className="text-[9px] font-bold text-white/70">ชำระเงิน</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-5 sm:px-8 bg-[#0C0C0A]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center gap-2.5 flex-1">
        <div className="w-7 h-7 rounded-[8px] bg-[#E8C547] flex items-center justify-center shrink-0">
          <Car className="h-3.5 w-3.5 text-[#1A1814]" strokeWidth={2.5} />
        </div>
        <span className="font-black text-white text-[15px] tracking-tight">
          Korat<span className="text-[#E8C547]">POS</span>
        </span>
      </div>

      <div className="hidden md:flex items-center gap-7">
        {([['#features', 'ฟีเจอร์'], ['#pricing', 'ราคา'], ['#partners', 'พาร์ทเนอร์']] as const).map(([href, label]) => (
          <a key={href} href={href} className="text-sm text-white/40 hover:text-white/80 transition-colors">
            {label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2.5 ml-6">
        <button
          onClick={() => navigate('/select')}
          className="hidden sm:block text-sm text-white/40 hover:text-white/70 transition-colors px-2"
        >
          เข้าสู่ระบบ
        </button>
        <button
          onClick={() => navigate('/signup')}
          className="h-9 px-5 bg-[#E8C547] hover:bg-[#EDD050] text-[#1A1814] text-sm font-bold rounded-xl transition-colors"
        >
          เริ่มใช้ฟรี
        </button>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors"
          aria-label="เมนู"
        >
          {menuOpen ? <X className="h-4 w-4 text-white" /> : <Menu className="h-4 w-4 text-white" />}
        </button>
      </div>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#0C0C0A]/96 backdrop-blur-xl border-b border-white/[0.06] py-2 px-4 md:hidden">
          {[['#features', 'ฟีเจอร์'], ['#pricing', 'ราคา'], ['#partners', 'พาร์ทเนอร์'], ['/select', 'เข้าสู่ระบบ']].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="block py-3 px-3 text-sm text-white/55 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0C0C0A] text-white overflow-x-hidden">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center pt-14 min-h-screen px-5 text-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-5%,rgba(232,197,71,0.06),transparent)] pointer-events-none" />

        <div className="inline-flex items-center gap-2 border border-[#E8C547]/20 bg-[#E8C547]/[0.06] rounded-full px-4 py-1.5 text-[12px] font-semibold text-[#E8C547] mb-7">
          <Sparkles className="h-3 w-3 shrink-0" />
          ออกแบบเฉพาะสำหรับร้านประดับยนต์ไทย
        </div>

        <h1 className="font-black tracking-tight leading-[1.05] mb-6 max-w-3xl" style={{ fontSize: 'clamp(2.5rem,8vw,5rem)' }}>
          บิลคม<span className="text-[#E8C547]">.</span>
          <br />
          ร้านโต<span className="text-white/15">.</span>
        </h1>

        <p className="text-white/40 max-w-lg mx-auto leading-relaxed mb-10" style={{ fontSize: 'clamp(1rem,2.5vw,1.15rem)' }}>
          ระบบ POS สำหรับร้านประดับยนต์ ค้นทะเบียนรถ พิมพ์บิลความร้อน ดูรายงานยอดขาย
          <span className="text-white/60 font-medium"> ทำได้จากมือถือ ทุกที่ ทุกเวลา</span>
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/signup')}
            className="h-12 px-8 bg-[#E8C547] hover:bg-[#EDD050] text-[#1A1814] font-bold rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            ทดลองใช้ฟรี 30 วัน <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/select')}
            className="h-12 px-8 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white rounded-xl transition-all text-sm flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            มีบัญชีแล้ว เข้าสู่ระบบ
          </button>
        </div>
        <p className="text-[11px] text-white/20">ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ทุกเมื่อ · ข้อมูลเป็นของคุณเสมอ</p>

        <ProductMockup />
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-[#111110] py-10">
        <div className="max-w-3xl mx-auto px-5 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { n: '200+', l: 'ร้านค้าที่ใช้งาน' },
            { n: '50K+', l: 'บิลต่อเดือน' },
            { n: '฿500M+', l: 'ยอดผ่านระบบ' },
            { n: '99.9%', l: 'Uptime' },
          ].map(({ n, l }) => (
            <div key={l} className="text-center">
              <p className="font-mono font-black text-[1.65rem] text-[#E8C547] tracking-tight">{n}</p>
              <p className="text-[11px] text-white/30 mt-1 tracking-wide">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold text-[#E8C547] tracking-[0.15em] uppercase mb-3">ฟีเจอร์หลัก</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">สิ่งที่คนอื่นไม่มี</h2>
          <p className="text-white/30 mt-3 text-sm max-w-sm mx-auto leading-relaxed">
            ออกแบบโดยคนที่เข้าใจงานร้านประดับยนต์ ไม่ใช่แค่ระบบ POS ทั่วไป
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {FEATURES.map((f) => (
            <div key={f.title} className={`bg-gradient-to-br ${f.grad} border ${f.border} rounded-2xl p-6`}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-white/55" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold text-[#E8C547] tracking-widest uppercase">{f.tag}</span>
              </div>
              <h3 className="font-bold text-white text-[15px] leading-snug mb-2.5">{f.title}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: 'ระบบลูกค้า CRM' },
            { icon: Receipt, label: 'ลูกหนี้เครดิต' },
            { icon: Zap, label: 'เร็ว ไม่สะดุด' },
            { icon: Shield, label: 'ข้อมูลปลอดภัย' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 bg-white/[0.025] border border-white/[0.06] rounded-xl px-4 py-3">
              <Icon className="h-4 w-4 text-white/25 shrink-0" strokeWidth={1.5} />
              <span className="text-[12px] text-white/45">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-[#111110] border-y border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold text-[#E8C547] tracking-[0.15em] uppercase mb-3">ขั้นตอน</p>
            <h2 className="text-3xl font-black tracking-tight">เริ่มใช้ใน 3 นาที</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              { n: '01', title: 'สมัครฟรี', desc: 'กรอกชื่อร้าน เบอร์โทร เสร็จใน 2 นาที ไม่ต้องใช้บัตรเครดิต' },
              { n: '02', title: 'เพิ่มบริการ', desc: 'เลือก template ร้านประดับยนต์ที่เตรียมไว้ หรือเพิ่มรายการบริการและราคาเอง' },
              { n: '03', title: 'เปิดบิลได้เลย', desc: 'ค้นทะเบียนรถ เพิ่มรายการ กดพิมพ์บิล ใช้ได้จากมือถือทันที' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="sm:text-center">
                <div className="font-mono text-[2.8rem] font-black text-white/[0.05] leading-none mb-3">{n}</div>
                <h3 className="font-bold text-white text-[15px] mb-2">{title}</h3>
                <p className="text-[13px] text-white/35 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold text-[#E8C547] tracking-[0.15em] uppercase mb-3">ราคา</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">เลือกแพลนที่เหมาะกับร้าน</h2>
          <p className="text-white/30 mt-3 text-sm">ทดลองฟรี 30 วัน ทุกแพลน ไม่ต้องใช้บัตรเครดิต</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? 'bg-[#E8C547] text-[#1A1814]'
                  : 'bg-[#111110] border border-white/[0.08]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2D2C28] text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  {plan.badge}
                </div>
              )}
              <p className={`text-[10px] font-semibold tracking-wider uppercase mb-1 ${plan.highlight ? 'text-[#1A1814]/45' : 'text-white/25'}`}>
                {plan.desc}
              </p>
              <p className={`text-xl font-black ${plan.highlight ? 'text-[#1A1814]' : 'text-white'}`}>{plan.name}</p>
              <div className="flex items-baseline gap-1 mb-6 mt-1">
                <span className={`text-3xl font-black font-mono ${plan.highlight ? 'text-[#1A1814]' : 'text-white'}`}>{plan.price}</span>
                {plan.period && (
                  <span className={`text-sm ${plan.highlight ? 'text-[#1A1814]/45' : 'text-white/30'}`}>{plan.period}</span>
                )}
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px]">
                    <Check className={`h-3.5 w-3.5 shrink-0 ${plan.highlight ? 'text-[#1A1814]/55' : 'text-[#E8C547]/55'}`} />
                    <span className={plan.highlight ? 'text-[#1A1814]/75' : 'text-white/50'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup')}
                className={`mt-6 w-full h-11 rounded-xl text-sm font-bold transition-all ${
                  plan.highlight
                    ? 'bg-[#1A1814] text-[#E8C547] hover:bg-[#2D2C28]'
                    : 'bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Partners / Ad ────────────────────────────────────────────────────── */}
      <section id="partners" className="py-20 px-5 bg-[#111110] border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-[11px] font-bold text-[#E8C547] tracking-[0.15em] uppercase mb-2">พาร์ทเนอร์</p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">แบรนด์ที่ร้านคุณต้องการ</h2>
              <p className="text-white/30 mt-2 text-sm">สิทธิพิเศษและส่วนลดสำหรับร้านในระบบ</p>
            </div>
            <span className="text-[10px] text-white/20 border border-white/[0.07] rounded-full px-3 py-1">
              Sponsored
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PARTNERS.map((p) => (
              <div
                key={p.category}
                className={`bg-gradient-to-br ${p.gradient} border ${p.border} rounded-2xl p-5 cursor-pointer hover:border-white/15 transition-colors`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-[10px] text-white/20 bg-white/[0.04] rounded-full px-2 py-0.5 leading-5">{p.label}</span>
                </div>
                <h3 className="font-bold text-white text-[15px] mb-2">{p.category}</h3>
                <p className="text-[12px] text-white/35 leading-relaxed">{p.desc}</p>
                <div className="flex items-center gap-1 text-[11px] text-white/20 mt-4 hover:text-white/40 transition-colors">
                  <span>ดูรายละเอียด</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-white/18 mt-8">
            ร้านค้าในระบบได้รับสิทธิพิเศษจากพาร์ทเนอร์ ·{' '}
            <span className="underline cursor-pointer hover:text-white/35 transition-colors">สนใจเป็นพาร์ทเนอร์</span>
          </p>
        </div>
      </section>

      {/* ── Roadmap teaser ───────────────────────────────────────────────────── */}
      <section className="py-20 px-5 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold text-[#E8C547] tracking-[0.15em] uppercase mb-3">Roadmap</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">กำลังมาเร็วๆ นี้</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { emoji: '🔐', label: 'Login ผ่าน Google', sub: 'Phase 1' },
            { emoji: '📲', label: 'ส่งบิลทาง Line', sub: 'Phase 2' },
            { emoji: '🛒', label: 'Marketplace อะไหล่', sub: 'Phase 2' },
            { emoji: '🤖', label: 'AI วิเคราะห์ยอดขาย', sub: 'Phase 3' },
          ].map(({ emoji, label, sub }) => (
            <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-5 text-center">
              <div className="text-2xl mb-2.5">{emoji}</div>
              <p className="text-[12px] text-white/50 leading-snug">{label}</p>
              <p className="text-[10px] text-[#E8C547]/40 mt-1.5 font-semibold">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-5 text-center overflow-hidden border-t border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,rgba(232,197,71,0.04),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <h2 className="font-black tracking-tight mb-4" style={{ fontSize: 'clamp(2rem,6vw,3.5rem)' }}>
          เริ่มใช้ได้เลยวันนี้
          <br />
          <span className="text-[#E8C547]">ฟรี 30 วัน</span>
        </h2>
        <p className="text-white/25 text-sm mb-10 max-w-xs mx-auto leading-relaxed">
          ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ทุกเวลา
          <br />
          ข้อมูลทั้งหมดเป็นของคุณเสมอ
        </p>
        <button
          onClick={() => navigate('/signup')}
          className="h-14 px-10 bg-[#E8C547] hover:bg-[#EDD050] text-[#1A1814] font-black text-[15px] rounded-2xl transition-colors flex items-center gap-3 mx-auto"
        >
          สมัครใช้งานฟรี <ArrowRight className="h-5 w-5" />
        </button>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10 px-5 bg-[#0C0C0A]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[7px] bg-[#E8C547] flex items-center justify-center shrink-0">
              <Car className="h-3 w-3 text-[#1A1814]" strokeWidth={2.5} />
            </div>
            <span className="font-black text-white text-sm tracking-tight">
              Korat<span className="text-[#E8C547]">POS</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {['นโยบายความเป็นส่วนตัว', 'เงื่อนไขการใช้งาน', 'ติดต่อเรา'].map((label) => (
              <a key={label} href="#" className="text-[12px] text-white/22 hover:text-white/45 transition-colors">
                {label}
              </a>
            ))}
          </div>
          <p className="text-[12px] text-white/18">© 2026 KoratPOS · Made in Thailand</p>
        </div>
      </footer>
    </div>
  );
}
