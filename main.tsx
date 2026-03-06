@import "tailwindcss";

body {
  @apply bg-zinc-950 text-zinc-100 min-h-screen transition-colors duration-500;
  background-image: radial-gradient(circle at 50% 0%, #18181b 0%, #09090b 100%);
}

body.light-mode {
  background-image: none;
  @apply bg-zinc-100 text-zinc-900;
}

