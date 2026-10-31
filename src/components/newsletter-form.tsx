"use client";

import { useState, type FormEvent } from "react";

/** Newsletter sign-up. Not connected to a backend yet; it only confirms locally. */
export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="type-body" role="status">
        Thank you. You&apos;ll hear from us soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:flex-row md:items-end">
      <label className="flex-1">
        <span className="sr-only">Email address</span>
        <input type="email" name="email" required placeholder="Email address" className="field" autoComplete="email" />
      </label>
      <button type="submit" className="btn btn-primary btn-block">
        Subscribe
      </button>
    </form>
  );
}
