"use client";
import { useEffect } from "react";

/** After placing an order the browser can land at the bottom of the new page; this brings the welcome message into view. */
export default function ScrollTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);
  return null;
}
