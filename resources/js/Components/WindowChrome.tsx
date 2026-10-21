const LIGHTS = ['bg-[#ff5f57]', 'bg-[#febc2e]', 'bg-[#28c840]'];

export function TrafficLights() {
    return (
        <div className="flex gap-2" aria-hidden="true">
            {LIGHTS.map((color) => (
                <span key={color} className={`h-3 w-3 rounded-full ${color} ring-1 ring-black/5`} />
            ))}
        </div>
    );
}
