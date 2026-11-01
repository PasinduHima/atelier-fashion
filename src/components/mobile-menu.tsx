"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

type MobileMenuProps = {
  navigation: { label: string; href: string }[];
};

/**
 * Menu button plus slide-out drawer, shown below 1440px.
 *
 * The drawer is a native <dialog> opened with showModal(), which puts it in the
 * top layer, makes the rest of the page inert, keeps focus inside, closes on
 * Escape and returns focus to the menu button on close.
 */
export function MobileMenu({ navigation }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    dialogRef.current?.showModal();
    setOpen(true);
  };
  // onClose below syncs state for every way of closing (button, link, Escape, backdrop).
  const close = () => dialogRef.current?.close();

  // The drawer is hidden from 1440px up; close it if the window grows past that
  // so the page isn't left inert behind an invisible modal.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 90rem)");
    const onChange = () => desktop.matches && dialogRef.current?.close();
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <button
        type="button"
        className="btn-icon -ml-3 xl:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={show}
      >
        <MenuIcon />
      </button>

      <dialog
        ref={dialogRef}
        id="site-menu"
        aria-label="Main menu"
        className="drawer xl:hidden"
        onClose={() => setOpen(false)}
        // A click whose target is the dialog itself landed on the ::backdrop.
        onClick={(event) => event.target === event.currentTarget && close()}
      >
        <div className="flex min-h-full flex-col">
          <div className="hairline-b flex h-header items-center px-gutter">
            <button type="button" className="btn-icon -ml-3" aria-label="Close menu" onClick={close}>
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Shop" className="flex flex-col px-gutter py-8">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={close} className="type-title link self-start py-3">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hairline-t mt-auto flex flex-col gap-4 px-gutter py-8">
            <Link href="/account" className="type-eyebrow self-start" onClick={close}>
              My account
            </Link>
            <button type="button" className="type-eyebrow self-start">
              Search
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
