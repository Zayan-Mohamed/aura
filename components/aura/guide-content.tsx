"use client";

import * as React from "react";
import Link from "next/link";
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
  ImagePlus,
  BookmarkCheck,
  Network,
  Crown,
} from "lucide-react";
import { AuraMark } from "./aura-mark";
import { TIER_ICONS } from "./tier-badge";
import { AuroraBackground, Reveal, Stagger, StaggerItem } from "./fx";
import { TIERS } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------- data */

const FEATURES = [
  {
    icon: ShoppingBasket,
    title: "Everything, not just gifts",
    body: "Groceries, electronics, fashion, home and daily essentials - plus gifts - across Kapruka's 125,000+ products.",
  },
  {
    icon: ShieldCheck,
    title: "Delivery confidence",
    body: "Aura checks every item against real delivery to your city before you fall for it, and quietly hides what can't arrive fresh.",
  },
  {
    icon: ImagePlus,
    title: "Search by photo",
    body: "Saw something you love? Sign in and snap a photo - Aura finds the closest real products on Kapruka by how they actually look.",
  },
  {
    icon: Languages,
    title: "Sinhala, Tamil, English - your way",
    body: "Type in English, Sinhala or Tamil - in script or romanized (Singlish / Tanglish). Aura detects it and replies in kind.",
  },
  {
    icon: ShoppingCart,
    title: "Multi-item baskets",
    body: "Build a cart across the conversation - add a card to the cake - and check out in one go.",
  },
  {
    icon: Gift,
    title: "Gifting done right",
    body: "Reads the occasion, picks tastefully, suggests a note card, and pivots if something can't arrive in time.",
  },
  {
    icon: CreditCard,
    title: "Secure click-to-pay",
    body: "Generates a real 60-minute Kapruka checkout link - guest checkout, no account needed.",
  },
  {
    icon: BookmarkCheck,
    title: "Accounts & saved chats",
    body: "Sign in with email or Google to save your profile, basket and every conversation - pick up on any device.",
  },
  {
    icon: Crown,
    title: "Aura Prestige tiers",
    body: "Every order you complete lifts you up a private ladder - unlocking perks from a memory vault to priority delivery, and eventually a concierge that shops for you.",
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
    body: "It cross-checks your city and date, so you only see what can actually reach you - fresh and on time.",
  },
  {
    title: "Confirm and pay securely",
    body: "Aura confirms the details, then hands you a secure click-to-pay link. That's it.",
  },
];

const TIPS = [
  "Save your city in the menu (top-right) so delivery checks run from your very first message.",
  "Be natural - “something nice for my sister's birthday, around Rs 5,000.”",
  "Try Sinhala or Tanglish - “mata Rs 10,000 ට යට හොඳ headphone එකක් ඕන.”",
  "Sign in to unlock search-by-photo and to keep your chats, basket and orders.",
  "Paid for an order? Share the order number from your email - Aura tracks it and lifts your Aura Prestige tier.",
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

function MiniProduct({
  name,
  price,
  badge,
  match,
}: {
  name: string;
  price: string;
  badge?: string;
  match?: string;
}) {
  return (
    <div className="w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-[4/5] bg-gradient-to-br from-muted to-secondary">
        {badge && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-jade/14 px-1.5 py-0.5 text-[0.6rem] font-medium text-jade backdrop-blur">
            <ShieldCheck className="size-2.5" /> {badge}
          </span>
        )}
        {match && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-gold/15 px-1.5 py-0.5 text-[0.6rem] font-medium text-gold backdrop-blur">
            <Sparkles className="size-2.5" /> {match}
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

function DemoCard({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-background/60 p-4 shadow-sm sm:p-5">
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
      <AuroraBackground />

      {/* Top bar */}
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to Aura
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/tech"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Network className="size-3.5" /> How it&rsquo;s built
            </Link>
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-card ring-1 ring-border">
                <AuraMark className="size-4" />
              </div>
              <span className="font-heading text-base text-foreground">Aura</span>
            </div>
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
              where it’s going - it finds it, makes sure it can reach you, and checks you out.
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
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <StaggerItem key={f.title} lift>
                <div className="h-full rounded-2xl border border-border bg-card/70 p-5 transition-colors hover:border-gold/40">
                  <div className="grid size-10 place-items-center rounded-xl bg-gold/12">
                    <f.icon className="size-5 text-gold" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-card-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Search by photo highlight */}
        <section className="py-12">
          <Reveal>
            <div className="grid grid-cols-1 gap-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-gold/[0.08] via-card/40 to-jade/[0.06] p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gold/12 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-widest text-gold">
                  <Sparkles className="size-3" /> New
                </span>
                <h2 className="font-heading mt-3 text-2xl text-foreground sm:text-3xl">
                  Search by photo
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Sign in, tap the photo icon and upload a picture of something you saw - a cake, a
                  dress, a gadget. Aura reads the image and ranks the closest-looking real products
                  on Kapruka, so you can find it (or something better) and have it delivered.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/85"
                >
                  Try it <ArrowRight className="size-4" />
                </Link>
              </div>

              {/* mini visual: photo → matches */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="grid aspect-square w-24 shrink-0 place-items-center rounded-2xl border border-border bg-gradient-to-br from-rose/15 to-gold/10 sm:w-28">
                  <ImagePlus className="size-7 text-muted-foreground" />
                </div>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground/50" />
                <div className="flex gap-2.5 overflow-hidden">
                  <MiniProduct name="Pastel Ribbon Cake" price="Rs 5,770" match="92%" />
                  <MiniProduct name="Floral Drip Gateau" price="Rs 6,400" match="88%" />
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Aura Prestige — curiosity hook */}
        <section className="py-6">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-gold/[0.1] via-card/40 to-rose/[0.06] p-6 sm:p-8">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-md">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gold/12 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-widest text-gold">
                    <Crown className="size-3" /> Prestige
                  </span>
                  <h2 className="font-heading mt-3 text-2xl text-foreground sm:text-3xl">
                    The more you shop, the more Aura does
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Every order you complete quietly lifts you up a private ladder. Silver unlocks a
                    concierge that watches your calendar and nudges you before the date. Gold keeps
                    delivery confidence on by default, so you only ever see what truly arrives.
                    Diamond lets you hand Aura a budget and a date and walk away. And the elite{" "}
                    <span className="font-semibold text-foreground">Aura</span> tier? That one we&rsquo;ll
                    let you discover. Your status is waiting at the top of every chat.
                  </p>
                </div>

                {/* Ladder teaser */}
                <div className="grid w-full grid-cols-5 gap-2 lg:max-w-sm">
                  {TIERS.map((t, i) => {
                    const Icon = TIER_ICONS[t.id];
                    const top = i === TIERS.length - 1;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background/60 px-1 py-3 text-center",
                          top && "ring-1 ring-gold/40",
                        )}
                      >
                        <span className={cn("grid size-8 place-items-center rounded-lg ring-1 ring-inset", t.color.chip, t.color.ring)}>
                          <Icon className="size-4" />
                        </span>
                        <span className={cn("text-[0.7rem] font-semibold leading-none", t.color.text)}>{t.name}</span>
                        <span className="text-[0.6rem] text-muted-foreground">
                          {t.minOrders === 0 ? "Start" : `${t.minOrders}+`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* How it works */}
        <section className="py-6">
          <Reveal>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">How it works</h2>
          </Reveal>
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <StaggerItem key={s.title} lift>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-card/70 p-5">
                  <span className="font-heading text-3xl text-gold/70">{i + 1}</span>
                  <h3 className="mt-2 text-base font-semibold text-card-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Demos */}
        <section className="py-12">
          <Reveal>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">See it in action</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              A couple of real-feeling conversations - the cards, carousels and delivery checks
              all appear right inside the chat.
            </p>
          </Reveal>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Reveal>
              <DemoCard caption="Everyday shopping">
                <UserBubble>Need good wireless headphones, delivered to Colombo</UserBubble>
                <AuraBubble>Patta - here are a few that comfortably reach Colombo. 🎧</AuraBubble>
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
                  thiyenawa  message ekak add karannada?
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
        <section className="py-6">
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
          <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-gold/10 via-rose/5 to-jade/10 px-6 py-12 text-center sm:px-10 sm:py-16">
            <h2 className="font-heading text-3xl text-foreground sm:text-4xl">Ready when you are.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Groceries, gadgets or a thoughtful gift - start a conversation and watch it come
              together.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/85"
              >
                Start shopping <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/tech"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Network className="size-4" /> How it’s built
              </Link>
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
