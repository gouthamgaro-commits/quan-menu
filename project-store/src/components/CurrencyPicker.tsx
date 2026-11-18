"use client";
import { useRouter } from "next/navigation";

/** "Prices also in: $ USD" — remembered in a cookie so the server can show approximate prices. */
export default function CurrencyPicker({ value, options }: { value: string; options: { code: string; label: string }[] }) {
  const router = useRouter();
  return (
    <label className="cur-pick">
      🌍 also show prices in
      <select
        value={value}
        onChange={(e) => {
          document.cookie = `cur=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.code === "INR" ? "₹ INR only" : o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
