'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const COSTUMES = [
  { id: 'chef',     label: '🎮 Esport',     color: 'from-purple-500 to-pink-500' },
  { id: 'nurse',    label: '👨‍⚕️ Doctor',    color: 'from-blue-400 to-cyan-500' },
  { id: 'engineer', label: '💻 Programmer', color: 'from-green-500 to-emerald-600' },
  { id: 'pilot',    label: '🚀 Astronaut',  color: 'from-gray-500 to-slate-700' },
]

type Step = 'select' | 'countdown' | 'processing' | 'done'

export default function Kiosk() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  // เปิด Webcam
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
  }, [])

  // Countdown แล้วถ่าย
  useEffect(() => {
    if (step !== 'countdown') return
    if (countdown === 0) { capturePhoto(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown])

  function startCountdown(costumeId: string) {
    setSelected(costumeId)
    setCountdown(3)
    setStep('countdown')
  }

  async function capturePhoto() {
    setStep('processing')
    const video = videoRef.current!
    const canvas = canvasRef.current!
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const filename = `source_${Date.now()}.jpg`

      // อัปโหลดรูปหน้าขึ้น Supabase
      await supabase.storage.from('owl-faces').upload(
        `sources/${filename}`, blob, { contentType: 'image/jpeg' }
      )

      // บันทึก job ลง DB ให้ Python ดึงไปทำ
      await supabase.table('jobs').insert({
        source_filename: filename,
        costume_id: selected,
        status: 'pending'
      }).execute()

      // รอผลลัพธ์จาก Supabase Realtime
      const channel = supabase.channel('job-result')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `source_filename=eq.${filename}`
        }, (payload) => {
          if (payload.new.status === 'done') {
            setPhotoUrl(payload.new.result_url)
            setStep('done')
            supabase.removeChannel(channel)
          }
        }).subscribe()
    }, 'image/jpeg')
  }

  function reset() {
    setStep('select')
    setSelected(null)
    setPhotoUrl(null)
    setCountdown(3)
  }

  return (
    <main className="flex flex-col h-screen bg-black text-white items-center justify-center gap-6 p-6">

      {/* Webcam Preview */}
      <video
        ref={videoRef} autoPlay muted playsInline
        className="rounded-2xl shadow-2xl"
        style={{ width: 480, height: 360, objectFit: 'cover', display: step === 'done' ? 'none' : 'block' }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* STEP 1: เลือกชุด */}
      {step === 'select' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl font-bold">🎭 เลือกชุดที่อยากใส่!</p>
          <div className="grid grid-cols-2 gap-4">
            {COSTUMES.map(c => (
              <button
                key={c.id}
                onClick={() => startCountdown(c.id)}
                className={`bg-gradient-to-br ${c.color} px-8 py-4 rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-transform`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Countdown */}
      {step === 'countdown' && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xl">📸 เตรียมตัว...</p>
          <p className="text-9xl font-black text-yellow-400 animate-ping">
            {countdown}
          </p>
        </div>
      )}

      {/* STEP 3: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-3xl animate-pulse">✨ กำลังสร้างชุดให้คุณ...</p>
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* STEP 4: Done */}
      {step === 'done' && photoUrl && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl font-bold">🎉 พร้อมแล้ว!</p>
          <img src={photoUrl} className="w-80 h-80 object-cover rounded-2xl shadow-2xl" />
          <button
            onClick={reset}
            className="px-8 py-3 bg-purple-500 rounded-full text-lg font-bold"
          >
            🔄 ถ่ายอีกครั้ง
          </button>
        </div>
      )}

    </main>
  )
}