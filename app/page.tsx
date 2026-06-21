export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-8">
        <p className="mb-4 font-bold text-yellow-400">
          Executive Compass
        </p>

        <h1 className="max-w-4xl text-5xl font-black leading-tight md:text-7xl">
          Find the company that matches your executive DNA.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-zinc-400">
          Analyze company leadership DNA, executive compensation structures,
          and CEO investment trends.
        </p>

        {/* Main Features */}
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="/matching"
            className="rounded-2xl bg-yellow-400 px-6 py-4 font-bold text-black hover:bg-yellow-300"
          >
            Company DNA Matching
          </a>

          <a
            href="/moneymap"
            className="rounded-2xl border border-yellow-400 px-6 py-4 font-bold text-yellow-400 hover:bg-zinc-900"
          >
            Money Map
          </a>
        </div>


        {/* Ranking Section */}
        <div className="mt-14 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 max-w-3xl">
          
          <p className="text-yellow-400 font-bold">
            Compensation Ranking
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Compare companies by executive compensation.
          </h2>

          <p className="mt-4 text-zinc-400">
            Discover which companies allocate the largest share of
            compensation to CEOs and executives, and compare their
            compensation philosophy.
          </p>

          <a
            href="/ranking"
            className="mt-6 inline-block rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black hover:bg-yellow-300"
          >
            View Ranking →
          </a>

        </div>

      </section>
    </main>
  );
}