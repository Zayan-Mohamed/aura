"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBasket,
  ShieldCheck,
  Languages,
  ShoppingCart,
  Gift,
  CreditCard,
  MapPin,
  Sparkles,
} from "lucide-react";
import { AuraMark } from "./aura-mark";

/* ---------------------------------------------------------------- helpers */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------- data */

const FEATURES = [
  {
    icon: ShoppingBasket,
    title: "Everything, not just gifts",
    body: "Groceries, electronics, fashion, home and daily essentials — plus gifts — across Kapruka's 125,000+ products.",
  },
  {
    icon: ShieldCheck,
    title: "Delivery confidence",
    body: "Aura checks every item against real delivery to your city before you fall for it, and quietly hides what can't arrive fresh.",
  },
  {
    icon: Languages,
    title: "Sinhala, Tanglish or English",
    body: "Chat however you're comfortable — “mata one headphone ekak” works just as well. Aura replies in kind.",
  },
  {
    icon: ShoppingCart,
    title: "Multi-item baskets",
    body: "Build a cart across the conversation — add a card to the cake — and check out in one go.",
  },
  {
    icon: Gift,
    title: "Gifting done right",
    body: "Reads the occasion, picks tastefully, suggests a note card, and pivots if something can't arrive in time.",
  },
  {
    icon: CreditCard,
    title: "Secure click-to-pay",
    body: "Generates a real 60-minute Kapruka checkout link — guest checkout, no account needed.",
  },
];

const STEPS = [
  {
    title: "Tell Aura what you need",
    body: "“Headphones under Rs 20,000”, or “send amma a cake in Kandy on Saturday.” Plain language is enough.",
  },
  {
    title: "Browse beautiful, live results",
    body: "Aura searches Kapruka in real time and streams visual cards. Swipe, compare, ask for cheaper or more.",
  },
  {
    title: "Delivery is checked up front",
    body: "It cross-checks your city and date, so you only see what can actually reach you — fresh and on time.",
  },
  {
    title: "Confirm and pay securely",
    body: "Aura confirms the details, then hands you a secure click-to-pay link. That's it.",
  },
];

const TIPS = [
  "Save your city in the menu (top-right) so delivery checks run from your very first message.",
  "Be natural — “something nice for my sister's birthday, around Rs 5,000.”",
  "Try Sinhala or Tanglish — “mata Rs 10,000 ට යට හොඳ headphone එකක් ඕන.”",
  "Ask follow-ups — “cheaper”, “show more”, or “does it reach Galle by Friday?”",
];

/* ----------------------------------------------------------- demo bubbles */

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-sm text-background">
      {children}
    </div>
  );
}

function AuraBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gold/12 ring-1 ring-gold/20">
        <AuraMark className="size-4" />
      </div>
      <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-card px-3.5 py-2 text-sm text-card-foreground shadow-sm ring-1 ring-border">
        {children}
      </div>
    </div>
  );
}

function MiniProduct({ name, price, badge }: { name: string; price: string; badge?: string }) {
  return (
    <div className="w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-[4/5] bg-gradient-to-br from-muted to-secondary">
        {badge && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-jade/14 px-1.5 py-0.5 text-[0.6rem] font-medium text-jade backdrop-blur">
            <ShieldCheck className="size-2.5" /> {badge}
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-[0.7rem] font-medium leading-tight text-card-foreground">{name}</p>
        <p className="tnum mt-1 text-xs font-semibold text-card-foreground">{price}</p>
      </div>
    </div>
  );
}

function DeliveryChip({ city, date }: { city: string; date: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-jade/25 bg-jade/[0.06] px-2.5 py-1.5 text-xs">
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <MapPin className="size-3 text-jade" /> {city} · {date}
      </span>
      <span className="inline-flex items-center gap-1 text-jade">
        <ShieldCheck className="size-3" /> all arrive fresh
      </span>
    </div>
  );
}

function DemoCard({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-background/60 p-4 shadow-sm sm:p-5">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground">
        <Sparkles className="size-3 text-gold" /> {caption}
      </span>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export function GuideContent() {
  return (
    <div className="relative min-h-dvh">
      {/* full-bleed warm glow */}
      <div className="aura-radial pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh]" />

      {/* Top bar */}
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to Aura
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-card ring-1 ring-border">
              <AuraMark className="size-4" />
            </div>
            <span className="font-heading text-base text-foreground">Aura</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        {/* Hero */}
        <section className="py-14 text-center sm:py-20">
          <Reveal className="flex flex-col items-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
              <AuraMark className="size-9" />
            </div>
            <h1 className="font-heading mt-6 text-balance text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Your shopping concierge for Sri Lanka
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
              Aura turns shopping on Kapruka into a conversation. Tell it what you need and
              where it’s going — it finds it, makes sure it can reach you, and checks you out.
              No forms, no endless scrolling.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground transition-all hover:brightness-105 active:translate-y-px"
            >
              Start shopping <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </section>

        {/* Features */}
        <section className="py-6">
          <Reveal>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">What Aura can do</h2>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-border bg-card/70 p-5 transition-colors hover:border-gold/40">
                  <div className="grid size-10 place-items-center rounded-xl bg-gold/12">
                    <f.icon className="size-5 text-gold" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-card-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-14">
          <Reveal>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">How it works</h2>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-card/70 p-5">
                  <span className="font-heading text-3xl text-gold/70">{i + 1}</span>
                  <h3 className="mt-2 text-base font-semibold text-card-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Demos */}
        <section className="py-6">
          <Reveal>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">See it in action</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              A couple of real-feeling conversations — the cards, carousels and delivery checks
              all appear right inside the chat.
            </p>
          </Reveal>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Reveal>
              <DemoCard caption="Everyday shopping">
                <UserBubble>Need good wireless headphones, delivered to Colombo</UserBubble>
                <AuraBubble>Patta — here are a few that comfortably reach Colombo. 🎧</AuraBubble>
                <DeliveryChip city="Colombo" date="Tue" />
                <div className="flex gap-2.5 overflow-hidden">
                  <MiniProduct name="Sony WH-1000XM5" price="Rs 91,000" badge="Delivers Tue" />
                  <MiniProduct name="Anker Soundcore H30i" price="Rs 13,000" badge="Delivers Tue" />
                  <MiniProduct name="JBL Tune 520BT" price="Rs 11,850" badge="Delivers Tue" />
                </div>
              </DemoCard>
            </Reveal>

            <Reveal delay={0.08}>
              <DemoCard caption="Gifting · Tanglish">
                <UserBubble>Mata amma ge birthday ekata cake ekak ona, Kandy ekata</UserBubble>
                <AuraBubble>
                  Aiyo lovely 🎂 Kandy ekata Saturday delivery na issue. Mehema fresh cakes
                  thiyenawa — message ekak add karannada?
                </AuraBubble>
                <DeliveryChip city="Kandy" date="Sat" />
                <div className="flex gap-2.5 overflow-hidden">
                  <MiniProduct name="Ribbon Birthday Cake" price="Rs 5,770" badge="Fresh" />
                  <MiniProduct name="Chocolate Gateau" price="Rs 6,500" badge="Fresh" />
                  <MiniProduct name="Fruit Fantasy Cake" price="Rs 5,950" badge="Fresh" />
                </div>
              </DemoCard>
            </Reveal>
          </div>
        </section>

        {/* Tips */}
        <section className="py-14">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card/70 p-6 sm:p-8">
              <h2 className="font-heading text-2xl text-foreground sm:text-3xl">
                Get the best out of Aura
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {TIPS.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* Final CTA */}
        <Reveal>
          <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-gold/10 via-rose/5 to-jade/10 px-6 py-12 text-center sm:px-10 sm:py-16">
            <h2 className="font-heading text-3xl text-foreground sm:text-4xl">Ready when you are.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Groceries, gadgets or a thoughtful gift — start a conversation and watch it come
              together.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/85"
            >
              Start shopping <ArrowRight className="size-4" />
            </Link>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
