export default function Home() {
  return (
    <>
      <h1 className="text-6xl font-bold mb-6 text-white text-center">Welcome to Your App</h1>
      <p className="text-xl text-gray-300 mb-8 text-center">Build something amazing</p>
      
      <div className="flex gap-4 justify-center mb-16">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg">
          Get Started
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {/* Your feature cards */}
      </div>
    </>
  )
}