export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white w-full">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-24 text-center w-full">
        <h1 className="text-6xl font-bold mb-6">Welcome to Your App</h1>
        <p className="text-xl text-gray-300 mb-8">Build something amazing with React, Tailwind, and modern web tech</p>
        
        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition">
            Get Started
          </button>
          <button className="border-2 border-blue-600 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition">
            Learn More
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-4xl mx-auto px-4 py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-700 p-6 rounded-lg hover:bg-gray-600 transition">
            <h3 className="text-xl font-bold mb-2">⚡ Fast</h3>
            <p className="text-gray-300">Built with Vite for lightning-fast development</p>
          </div>
          <div className="bg-gray-700 p-6 rounded-lg hover:bg-gray-600 transition">
            <h3 className="text-xl font-bold mb-2">🎨 Styled</h3>
            <p className="text-gray-300">Beautiful UI with Tailwind CSS utilities</p>
          </div>
          <div className="bg-gray-700 p-6 rounded-lg hover:bg-gray-600 transition">
            <h3 className="text-xl font-bold mb-2">🛣️ Routed</h3>
            <p className="text-gray-300">Multiple pages with React Router</p>
          </div>
        </div>
      </div>
    </div>
  )
}