import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Car, Eye, EyeOff, ArrowRight, ChevronLeft } from 'lucide-react';

type Mode = 'signup' | 'login';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signup');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ shop: '', email: '', password: '' });

  const isLogin = mode === 'login';

  function handleField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Placeholder — wire to backend auth when Phase 1 is ready
    navigate('/select');
  }

  return (
    <div className="min-h-screen bg-[#0C0C0A] flex">
      {/* ── Left panel: branding ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#111110] border-r border-white/[0.06] p-10">
        <div>
          <Link to="/landing" className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 rounded-[9px] bg-[#E8C547] flex items-center justify-center shrink-0">
              <Car className="h-4 w-4 text-[#1A1814]" strokeWidth={2.5} />
            </div>
            <span className="font-black text-white text-[16px] tracking-tight">
              Korat<span className="text-[#E8C547]">POS</span>
            </span>
          </Link>

          <p className="text-[11px] font-bold text-[#E8C547] tracking-[0.15em] uppercase mb-4">ทำไมต้อง KoratPOS</p>
          <div className="space-y-5">
            {[
              { title: 'ค้นทะเบียนรถ → เปิดบิลทันที', desc: 'ไม่ต้องพิมพ์ชื่อลูกค้าซ้ำ ระบบดึงข้อมูลให้อัตโนมัติ' },
              { title: 'บิล 58mm คมชัด 4x', desc: 'เทคโนโลยี Canvas rendering ที่ทำให้บิลคมกว่าทั่วไป' },
              { title: 'รายงาน real-time', desc: 'รู้ยอดวันนี้ทันที ไม่ต้องรอสิ้นเดือน' },
              { title: 'ใช้ได้จากมือถือ', desc: 'เปิดได้ทุกอุปกรณ์ ไม่ต้องลงแอป' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-1 bg-[#E8C547]/20 rounded-full shrink-0 mt-0.5" style={{ alignSelf: 'stretch' }} />
                <div>
                  <p className="text-[13px] font-semibold text-white/80">{title}</p>
                  <p className="text-[12px] text-white/30 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-[13px] text-white/60 leading-relaxed italic">
            "ก่อนใช้ KoratPOS ต้องพิมพ์ชื่อลูกค้าทุกครั้ง ตอนนี้ค้นทะเบียนปุ๊บ ข้อมูลออกเลย ประหยัดเวลาไปมาก"
          </p>
          <div className="flex items-center gap-2.5 mt-4">
            <div className="w-8 h-8 rounded-full bg-[#3B3A36] flex items-center justify-center text-[12px] font-bold text-white/60">
              ส
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/55">สมชาย วงศ์ประดับ</p>
              <p className="text-[11px] text-white/25">ร้านประดับยนต์ โคราช</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Back link (mobile) */}
        <div className="w-full max-w-[400px] mb-8">
          <Link to="/landing" className="inline-flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/55 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            กลับหน้าหลัก
          </Link>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Logo (mobile only) */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-[8px] bg-[#E8C547] flex items-center justify-center shrink-0">
              <Car className="h-3.5 w-3.5 text-[#1A1814]" strokeWidth={2.5} />
            </div>
            <span className="font-black text-white text-[15px] tracking-tight">
              Korat<span className="text-[#E8C547]">POS</span>
            </span>
          </div>

          <h1 className="text-[1.6rem] font-black text-white tracking-tight mb-1">
            {isLogin ? 'ยินดีต้อนรับกลับ' : 'เริ่มต้นฟรี 30 วัน'}
          </h1>
          <p className="text-sm text-white/35 mb-8">
            {isLogin
              ? 'เข้าสู่ระบบเพื่อจัดการร้านของคุณ'
              : 'ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ทุกเมื่อ'}
          </p>

          {/* Google button — primary */}
          <button
            type="button"
            className="w-full h-12 bg-white hover:bg-white/90 text-[#1A1917] font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-3 shadow-sm mb-5"
          >
            <GoogleIcon />
            {isLogin ? 'เข้าสู่ระบบด้วย Google' : 'สมัครด้วย Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[11px] text-white/25 font-medium">หรือใช้ email</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Email / pass form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className="block text-[12px] font-medium text-white/45 mb-1.5">ชื่อร้าน</label>
                <input
                  type="text"
                  value={form.shop}
                  onChange={(e) => handleField('shop', e.target.value)}
                  placeholder="เช่น Korat Air & Sound"
                  className="w-full h-11 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/25 focus:border-[#E8C547]/40 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-white/45 mb-1.5">อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleField('email', e.target.value)}
                placeholder="your@email.com"
                className="w-full h-11 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/25 focus:border-[#E8C547]/40 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-white/45">รหัสผ่าน</label>
                {isLogin && (
                  <button type="button" className="text-[11px] text-[#E8C547]/60 hover:text-[#E8C547] transition-colors">
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => handleField('password', e.target.value)}
                  placeholder={isLogin ? '••••••••' : 'อย่างน้อย 8 ตัวอักษร'}
                  className="w-full h-11 bg-white/[0.05] border border-white/[0.1] rounded-xl pl-4 pr-11 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/25 focus:border-[#E8C547]/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  aria-label={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-[#E8C547] hover:bg-[#EDD050] text-[#1A1814] font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {isLogin ? 'เข้าสู่ระบบ' : 'สร้างบัญชีฟรี'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-[12px] text-white/30 mt-6">
            {isLogin ? 'ยังไม่มีบัญชี?' : 'มีบัญชีแล้ว?'}{' '}
            <button
              onClick={() => setMode(isLogin ? 'signup' : 'login')}
              className="text-white/60 hover:text-white font-medium transition-colors"
            >
              {isLogin ? 'สมัครใช้งานฟรี' : 'เข้าสู่ระบบ'}
            </button>
          </p>

          {/* Terms */}
          {!isLogin && (
            <p className="text-center text-[11px] text-white/18 mt-4 leading-relaxed">
              การสมัครถือว่าคุณยอมรับ{' '}
              <a href="#" className="underline hover:text-white/35 transition-colors">เงื่อนไขการใช้งาน</a>
              {' '}และ{' '}
              <a href="#" className="underline hover:text-white/35 transition-colors">นโยบายความเป็นส่วนตัว</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
