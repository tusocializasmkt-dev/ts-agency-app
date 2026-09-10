export default function RouteLoadingFallback() {
  return <div role="status" aria-live="polite" className="flex min-h-48 w-full items-center justify-center px-4 py-12 text-sm font-medium text-zinc-500">
    <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-black" aria-hidden="true" />
    Carregando página...
  </div>;
}
