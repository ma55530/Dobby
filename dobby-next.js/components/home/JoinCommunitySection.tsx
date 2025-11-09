export function JoinCommunitySection() {
  return (
    <section className="w-full py-24 text-center px-6 mt-10 bg-transparent">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
          Join the Community
        </h2>
        <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed">
          Connect with fellow movie and TV shows enthusiasts, share your thoughts, and discover your next favorite film or TV show together.
        </p>
        <button className="bg-[#f5a623] hover:bg-[#ffb947] text-black font-semibold px-8 py-3 rounded-md transition duration-300 shadow-none hover:shadow-[0_0_20px_rgba(255,185,71,0.4)]">
          Sign Up
        </button>
      </div>
    </section>
  );
}