"use client";
import { useRouter } from "next/navigation";

/** Sort menu for the catalogue: changes the URL as soon as an option is picked. */
export default function SortSelect({ value, query, options }: { value: string; query: string; options: { id: string; name: string }[] }) {
  const router = useRouter();
  return (
    <label className="sort">
      Sort
      <select
        className="select"
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(query);
          if (e.target.value === "popular") p.delete("sort");
          else p.set("sort", e.target.value);
          const qs = p.toString();
          router.push("/projects" + (qs ? "?" + qs : ""), { scroll: false });
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
