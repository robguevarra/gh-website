import Image from "next/image"
import Link from "next/link"

interface LogoProps {
  size?: "small" | "medium" | "large"
}

export function Logo({ size = "medium" }: LogoProps) {
  const sizes = {
    small: { width: 30, height: 30, textSize: "text-lg" },
    medium: { width: 40, height: 40, textSize: "text-xl" },
    large: { width: 60, height: 60, textSize: "text-2xl" },
  }

  const { width, height, textSize } = sizes[size]

  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1Im7VvOInboRBkUWf9TSXbYMLYrtII.png"
        alt="Graceful Homeschooling Logo"
        width={width}
        height={height}
        className="h-auto"
      />
      <span className={`${textSize} font-serif tracking-tight text-[#5d4037]`}>Graceful Homeschooling</span>
    </Link>
  )
}

