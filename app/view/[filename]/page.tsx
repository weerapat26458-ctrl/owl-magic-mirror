'use client'
import { useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

export default function ParallaxView() {
  const { filename } = useParams()
  const cardRef = useRef<HTMLDivElement>(null)

  const imageUrl = filename
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/owl-faces/${filename}`
    : null

  useEffect(() => {
    const handleMotion = (e: DeviceOrientationEvent) => {
      if (!cardRef.current) return
      const x = Math.max(-20, Math.min(20, (e.beta  || 0) - 40)) / 20
      const y = Math.max(-20, Math.min(20,  e.gamma || 0))        / 20
      cardRef.current.style.transform =
        `perspective(600px) rotateX(${-x * 15}deg) rotateY(${y * 15}deg) scale(1.05)`
    }
    window.addEventListener('deviceorientation', handleMotion)
    return () => window.removeEventListener('deviceorientation', handleMotion)
  }, [])

  return (
    <main className="flex flex-col h-screen bg-gradient-to-b from-purple-900 to-black items-center justify-center gap-6">
      <p className="text-white text-xl font-bold">✨ Magic Mirror @ OWL</p>
      <div
        ref={cardRef}
        className="transition-transform duration-100 ease-out rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: 320, height: 320 }}
      >
        {imageUrl && (
          <img src={imageUrl} className="w-full h-full object-cover" />
        )}
      </div>
      <p className="text-white text-sm opacity-50">เอียงมือถือเพื่อดูเอฟเฟกต์ 3D ✨</p>
    </main>
  )
}