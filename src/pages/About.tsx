export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">About This Project</h1>
          <p className="text-xl opacity-90">Learn how to build modern web apps</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        {    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center mb-3">
              <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-2xl font-semibold ml-3">Install Dependencies</h2>
            </div>
            <p className="text-gray-600">Run npm install to get started with React, Tailwind, and React Router.</p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center mb-3">
              <div className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-2xl font-semibold ml-3">Set Up Routing</h2>
            </div>
            <p className="text-gray-600">Create pages and use React Router to navigate between them.</p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <div className="flex items-center mb-3">
              <div className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-2xl font-semibold ml-3">Style with Tailwind</h2>
            </div>
            <p className="text-gray-600">Use utility classes to style components without writing CSS.</p>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
            <div className="flex items-center mb-3">
              <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-2xl font-semibold ml-3">Deploy Your App</h2>
            </div>
            <p className="text-gray-600">Push to GitHub and deploy to Vercel or Netlify in minutes.</p>
          </div>
          {/* Call-to-Action */}
            <div className="mt-16 bg-blue-50 p-8 rounded-lg text-center border-2 border-blue-200">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to build?</h3>
          <p className="text-lg text-gray-600 mb-6">Start creating your own pages and components.</p>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Get Started
          </button>
        </div>
        </div>}
      </div>
    </div>
  )
}