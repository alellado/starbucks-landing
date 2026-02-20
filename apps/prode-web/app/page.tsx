import Link from "next/link";

export default function HomePage() {
  return (
    <section className="-mx-4 -mt-8 overflow-hidden rounded-b-[2rem] bg-[radial-gradient(circle_at_10%_20%,#0f2f66_0%,transparent_28%),radial-gradient(circle_at_75%_30%,#0c7f73_0%,transparent_23%),linear-gradient(120deg,#07142f_0%,#081e47_45%,#061534_100%)] px-4 pb-16 pt-8 text-white md:px-8">
      <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr]">
        <div className="pt-2 md:pt-10">
          <div className="mb-6 inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
            RUMBO AL 2026
          </div>
          <h1 className="font-heading text-6xl leading-[0.95] md:text-8xl">
            La copa del mundo se juega con <span className="bg-gradient-to-r from-emerald-300 to-cyan-400 bg-clip-text text-transparent">Teo y Manu</span>
          </h1>
          <p className="mt-6 max-w-xl text-xl leading-relaxed text-slate-300">
            La plataforma definitiva para organizar el Prode del Mundial 2026 en tu medio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-2xl bg-white px-6 py-3 text-base font-bold text-slate-900 transition hover:-translate-y-0.5"
            >
              Reservar Lugar
            </Link>
            <Link
              href="/tournaments"
              className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-bold text-cyan-200 transition hover:border-cyan-300/50 hover:bg-white/10"
            >
              Solicitar Demo
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-slate-300">
            <span>✓ Fixture Oficial</span>
            <span>✓ App Personalizable</span>
            <span>✓ Rankings en Vivo</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md md:max-w-lg">
          <div className="rounded-[2.4rem] border border-cyan-300/20 bg-gradient-to-b from-emerald-400/30 to-sky-500/10 p-[10px] shadow-[0_30px_70px_-30px_rgba(16,185,129,0.8)]">
            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#0a1f46,#0a1735)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Mundial 2026</p>
                <span className="rounded-full border border-cyan-300/60 px-2 py-1 text-xs font-bold text-cyan-200">JD</span>
              </div>
              <h3 className="text-3xl font-black">Hola, Teo</h3>
              <p className="mt-1 text-sm text-slate-300">Puntos acumulados: 142</p>

              <article className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Grupo A · Fecha 1</span>
                  <span className="text-emerald-300">16 Jun, 21:00</span>
                </div>
                <div className="flex items-center justify-between text-lg font-black">
                  <div className="text-center">
                    <p className="text-3xl">🇦🇷</p>
                    <p>ARG</p>
                  </div>
                  <p className="text-3xl text-slate-400">VS</p>
                  <div className="text-center">
                    <p className="text-3xl">🇲🇽</p>
                    <p>MEX</p>
                  </div>
                </div>
                <button className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2 text-sm font-black uppercase text-slate-950">
                  Cargar Pronostico
                </button>
              </article>

              <div className="mt-4">
                <p className="mb-2 text-lg font-black uppercase tracking-wide text-slate-300">Tabla de posiciones</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-yellow-300/40 bg-white/5 px-3 py-2">
                    <p className="font-bold text-yellow-300">1 Ale Lladó</p>
                    <p className="font-black">150 pts</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <p className="font-bold text-slate-200">2 Teo Lladó</p>
                    <p className="font-black">142 pts</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <p className="font-bold text-slate-200">3 Manu Lladó</p>
                    <p className="font-black">138 pts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
