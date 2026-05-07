export default function MaterialBalanceBar({ materialAdvantage, scale = 5 }) {
  const barHeight = Math.max(
    5,
    Math.min(95, 50 - materialAdvantage * scale),
  );

  return (
    <div className="relative z-0 my-[52px] mr-[-4px] hidden w-8 flex-shrink-0 flex-col overflow-hidden rounded-l-md border-y-4 border-l-4 border-[#282828] bg-[#ffffff] md:flex">
      <div
        className="w-full bg-[#404040] transition-all duration-500 ease-in-out"
        style={{ height: `${barHeight}%` }}
      />
      <span
        className={`absolute left-0 right-0 text-center text-[10px] font-bold ${
          materialAdvantage >= 0
            ? "bottom-1 text-[#404040]"
            : "top-1 text-[#ffffff]"
        }`}
      >
        {materialAdvantage === 0
          ? "0.0"
          : materialAdvantage > 0
            ? `+${materialAdvantage}`
            : materialAdvantage}
      </span>
    </div>
  );
}
