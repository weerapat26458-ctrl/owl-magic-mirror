'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'react-qr-code'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Display() {
  const [photo, setPhoto] = useState<any>(null)

  useEffect(() => {
    fetchLatest()
    const channel = supabase
      .channel('photos')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'photos'
      }, (payload) => setPhoto(payload.new))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchLatest() {
    const { data } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) setPhoto(data)
  }

  const parallaxUrl = photo
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/view/${photo.filename}`
    : null

  return (
    <main className="flex h-screen bg-black text-white items-center justify-center gap-20">
      {photo ? (
        <>
          <div className="flex flex-col items-center gap-6">
            <img
              src={photo.url}
              className="w-[480px] h-[480px] object-cover rounded-2xl shadow-2xl"
            />
            <p className="text-3xl font-bold">✨ ชุดของคุณพร้อมแล้ว!</p>
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-4 rounded-2xl">
              <QRCode value={parallaxUrl!} size={220} />
            </div>
            <p className="text-xl text-gray-300">สแกนเพื่อรับรูปกลับบ้าน 📱</p>
          </div>
        </>
      ) : (
        <p className="text-4xl animate-pulse">🎭 มายืนหน้ากล้องได้เลย!</p>
      )}
    </main>
  )
}