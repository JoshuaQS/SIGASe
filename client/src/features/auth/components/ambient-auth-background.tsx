const AURORA_LAYERS = [
  'bg-[radial-gradient(circle_at_18%_20%,hsl(var(--primary)/0.14),transparent_32%)]',
  'bg-[radial-gradient(circle_at_82%_22%,hsl(var(--primary)/0.10),transparent_28%)]',
  'bg-[radial-gradient(circle_at_78%_78%,hsl(var(--primary)/0.12),transparent_30%)]',
  'bg-[radial-gradient(circle_at_24%_82%,hsl(var(--primary)/0.08),transparent_28%)]',
  'bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.05),transparent_38%)]',
] as const;

const GLOW_BLOBS = [
  {
    position: '-left-40 -top-40',
    size: 'h-[32rem] w-[32rem]',
    tone: 'bg-primary/17',
  },
  {
    position: 'right-[-8rem] top-[22%]',
    size: 'h-[26rem] w-[26rem]',
    tone: 'bg-primary/15',
  },
  {
    position: 'bottom-[-10rem] left-[28%]',
    size: 'h-[28rem] w-[28rem]',
    tone: 'bg-primary/13',
  },
  {
    position: 'left-[12%] top-[52%]',
    size: 'h-[18rem] w-[18rem]',
    tone: 'bg-primary/13',
  },
  {
    position: 'right-[18%] bottom-[16%]',
    size: 'h-[14rem] w-[14rem]',
    tone: 'bg-primary/15',
  },
] as const;

const BUBBLES = [
  {
    position: 'left-[10%] top-[16%]',
    size: 'h-24 w-24',
    tone: 'bg-primary/18',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float',
  },
  {
    position: 'left-[18%] top-[34%]',
    size: 'h-16 w-16',
    tone: 'bg-primary/16',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float-reverse',
  },
  {
    position: 'left-[24%] bottom-[18%]',
    size: 'h-20 w-20',
    tone: 'bg-primary/16',
    blur: 'blur-3xl',
    animation: 'animate-bubble-float-delayed',
  },
  {
    position: 'left-[36%] top-[14%]',
    size: 'h-12 w-12',
    tone: 'bg-primary/18',
    blur: 'blur-xl',
    animation: 'animate-bubble-float-slow',
  },
  {
    position: 'left-[42%] bottom-[12%]',
    size: 'h-14 w-14',
    tone: 'bg-primary/16',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float-reverse',
  },
  {
    position: 'right-[14%] top-[18%]',
    size: 'h-24 w-24',
    tone: 'bg-primary/18',
    blur: 'blur-3xl',
    animation: 'animate-bubble-float-slow',
  },
  {
    position: 'right-[10%] top-[38%]',
    size: 'h-16 w-16',
    tone: 'bg-primary/16',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float',
  },
  {
    position: 'right-[22%] bottom-[16%]',
    size: 'h-20 w-20',
    tone: 'bg-primary/18',
    blur: 'blur-3xl',
    animation: 'animate-bubble-float-delayed',
  },
  {
    position: 'right-[34%] top-[24%]',
    size: 'h-12 w-12',
    tone: 'bg-primary/16',
    blur: 'blur-xl',
    animation: 'animate-bubble-float-reverse',
  },
  {
    position: 'right-[40%] bottom-[22%]',
    size: 'h-14 w-14',
    tone: 'bg-primary/16',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float-slow',
  },
] as const;

const SMALL_BUBBLES = [
  {
    position: 'left-[12%] top-[28%]',
    size: 'h-12 w-12',
    tone: 'bg-primary/12',
    blur: 'blur-xl',
    animation: 'animate-bubble-float-delayed',
  },
  {
    position: 'left-[28%] bottom-[24%]',
    size: 'h-14 w-14',
    tone: 'bg-primary/14',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float-reverse',
  },
  {
    position: 'left-[40%] top-[22%]',
    size: 'h-12 w-12',
    tone: 'bg-primary/12',
    blur: 'blur-xl',
    animation: 'animate-bubble-float-slow',
  },
  {
    position: 'left-[46%] bottom-[18%]',
    size: 'h-14 w-14',
    tone: 'bg-primary/12',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float',
  },
  {
    position: 'right-[16%] top-[26%]',
    size: 'h-12 w-12',
    tone: 'bg-primary/12',
    blur: 'blur-xl',
    animation: 'animate-bubble-float-reverse',
  },
  {
    position: 'right-[28%] bottom-[20%]',
    size: 'h-14 w-14',
    tone: 'bg-primary/14',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float-delayed',
  },
  {
    position: 'right-[42%] top-[48%]',
    size: 'h-12 w-12',
    tone: 'bg-primary/12',
    blur: 'blur-xl',
    animation: 'animate-bubble-float-slow',
  },
  {
    position: 'right-[34%] top-[58%]',
    size: 'h-14 w-14',
    tone: 'bg-primary/12',
    blur: 'blur-2xl',
    animation: 'animate-bubble-float',
  },
] as const;

/** Misma capa decorativa que en la pantalla de autenticación (aurora, blobs, burbujas, viñeta, puntos). */
export function AmbientAuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 min-h-dvh">
      {AURORA_LAYERS.map((layerClass) => (
        <div key={layerClass} className={`absolute inset-0 ${layerClass}`} />
      ))}

      {GLOW_BLOBS.map((blob) => (
        <div
          key={`${blob.position}-${blob.size}`}
          className={`absolute rounded-full ${blob.position} ${blob.size} ${blob.tone} blur-3xl`}
        />
      ))}

      {BUBBLES.map((bubble) => (
        <div
          key={`${bubble.position}-${bubble.size}`}
          className={`absolute rounded-full ${bubble.position} ${bubble.size} ${bubble.blur} ${bubble.animation}`}
        >
          <div className={`h-full w-full rounded-full ${bubble.tone}`} />
        </div>
      ))}

      {SMALL_BUBBLES.map((bubble) => (
        <div
          key={`${bubble.position}-${bubble.size}`}
          className={`absolute rounded-full ${bubble.position} ${bubble.size} ${bubble.blur} ${bubble.animation}`}
        >
          <div className={`h-full w-full rounded-full ${bubble.tone}`} />
        </div>
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--background)/0),hsl(var(--background)/0.18)_58%,hsl(var(--background)/0.34)_100%)]" />

      <div
        className="absolute inset-0 opacity-[0.05] text-foreground"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--background)/0.05),hsl(var(--background)/0.1)_45%,hsl(var(--background)/0.04)_78%,transparent)]" />
    </div>
  );
}
