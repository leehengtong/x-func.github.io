import Image from 'next/image'

export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        src="/resource/icon.png"
        alt="x-func logo"
        width={40}
        height={40}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  )
}

