import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-40 w-full flex items-center justify-center">
      <Image
        src="/jadlogo.png"
        fill
        alt="JAD Logo"
        role="presentation"
        className="object-contain object-center"
        sizes="300px"
      />
    </div>
  );
}
