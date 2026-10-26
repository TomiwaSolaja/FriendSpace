import Image from "next/image";

export function Avatar({ name, photoId, className = "" }: { name: string; photoId?: string; className?: string }) {
  if (photoId) {
    return (
      <div className={`relative overflow-hidden bg-sand ${className}`}>
        <Image src={`/api/photos/${photoId}`} alt={`${name}'s photo`} fill unoptimized className="object-cover" />
      </div>
    );
  }
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return (
    <div className={`flex items-center justify-center text-white ${className}`} style={{ background: `hsl(${hue} 32% 36%)` }}>
      <span className="font-serif text-6xl">{name.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}
