// hp bar interface
interface HPBarProps {
    hp: number;
    alive: boolean;
    ringColor: string;
    centerTextColorClass: string;
}

// function for updating hp bar
export default function HPBar({
    hp,
    alive,
    ringColor,
    centerTextColorClass,
}: HPBarProps) {
    const hpPercent = Math.max(0, Math.min(100, hp));
    return (
        <div
            className="relative h-9 w-9 shrink-0 rounded-full"
            style={{
                background: `conic-gradient(${ringColor} ${hpPercent}%, rgb(148 163 184) ${hpPercent}% 100%)`,
          
            }}

        >
            <div
                className={`absolute inset-0.75 flex items-center justify-center rounded-full bg-white text-[10px] font-semibold dark:bg-slate-900 ${centerTextColorClass}`}
            >
                {alive ? hp : "D"}
            </div>
        </div>
    )
}
