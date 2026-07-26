export default function ChefMascot() {
  return (
    <svg viewBox="0 0 320 380" className="w-full h-full max-w-[320px]" xmlns="http://www.w3.org/2000/svg">
      {/* body / apron */}
      <path d="M95 210 C95 190 120 178 160 178 C200 178 225 190 225 210 L235 355 C235 368 224 378 210 378 L110 378 C96 378 85 368 85 355 Z" fill="#fdfaf6" />
      {/* apron buttons */}
      {[228, 258, 288, 318].map((y) => (
        <circle key={y} cx="160" cy={y} r="4" fill="#e8590c" />
      ))}
      {/* sleeves */}
      <rect x="60" y="195" width="42" height="95" rx="21" fill="#fdfaf6" />
      <rect x="218" y="195" width="42" height="95" rx="21" fill="#fdfaf6" />
      {/* hands */}
      <circle cx="81" cy="298" r="15" fill="#f2c39a" />
      <circle cx="239" cy="298" r="15" fill="#f2c39a" />
      {/* neckerchief */}
      <path d="M130 182 L160 208 L190 182 Z" fill="#e8590c" />
      {/* neck */}
      <rect x="145" y="150" width="30" height="35" rx="10" fill="#f2c39a" />
      {/* head */}
      <ellipse cx="160" cy="120" rx="52" ry="50" fill="#f2c39a" />
      {/* ears */}
      <circle cx="112" cy="122" r="10" fill="#f2c39a" />
      <circle cx="208" cy="122" r="10" fill="#f2c39a" />
      {/* mustache */}
      <path d="M120 140 Q140 155 160 142 Q180 155 200 140 Q188 132 160 132 Q132 132 120 140 Z" fill="#3a2a1a" />
      {/* eyes */}
      <circle cx="138" cy="112" r="4.5" fill="#3a2a1a" />
      <circle cx="182" cy="112" r="4.5" fill="#3a2a1a" />
      {/* smile */}
      <path d="M148 152 Q160 160 172 152" stroke="#8b4a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* chef hat band */}
      <rect x="118" y="82" width="84" height="20" rx="10" fill="#fdfaf6" />
      {/* chef hat puff */}
      <path d="M112 88 C100 40 148 28 160 55 C172 28 220 40 208 88 C208 70 190 62 160 62 C130 62 112 70 112 88 Z" fill="#fdfaf6" />
    </svg>
  );
}
